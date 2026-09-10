import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test, { after } from "node:test";
import { createServer } from "vite";

const root = new URL("..", import.meta.url).pathname;
const vite = await createServer({
  appType: "custom", configFile: false, root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false },
  plugins: [{ name: "appearance-game-data", transform(source, id) {
    if (id.endsWith("/app/page.tsx")) return source + "\nexport { ROSTER, STANDARD_GACHA_POOL, GACHA_SERIES, INITIAL_PROFILE, newBattle, normalizeBattleState, resolveProfileCharacterVisual, getEvolutionRequirements, getBannerPool };";
  } }],
});
after(() => vite.close());
const game = await vite.ssrLoadModule("/app/page.tsx");
const appearance = await vite.ssrLoadModule("/app/random-appearance.ts");
const lucky = game.ROSTER.find((unit) => unit.id === appearance.LUCKY_BURNS_ID);

test("one summonable character uses all 11 supplied appearances", () => {
  assert.equal(game.ROSTER.filter((unit) => unit.id === lucky.id).length, 1);
  assert.equal(game.STANDARD_GACHA_POOL.filter((unit) => unit.id === lucky.id).length, 1);
  assert.equal(game.GACHA_SERIES.flat().filter((unit) => unit.id === lucky.id).length, 1);
  assert.equal(lucky.rarity, "SSR");
  assert.equal(lucky.source, "gacha");
  const seriesIndex = game.GACHA_SERIES.findIndex((pool) => pool.some((unit) => unit.id === lucky.id));
  assert.ok(game.getBannerPool("standard", seriesIndex).some((unit) => unit.id === lucky.id && unit.rarity === "SSR"));
  assert.ok(lucky.baseStats.atk >= 44);
  assert.equal(appearance.LUCKY_BURNS_IMAGES.length, 11);
  const uniqueFiles = new Set();
  for (const path of appearance.LUCKY_BURNS_IMAGES) {
    const bytes = readFileSync(root + "public" + path);
    assert.equal(bytes.subarray(0, 4).toString(), "RIFF");
    assert.equal(bytes.subarray(8, 12).toString(), "WEBP");
    uniqueFiles.add(bytes.toString("base64"));
  }
  assert.equal(uniqueFiles.size, 11);
  assert.match(lucky.lore, /誰もが見惚れる色気、誰もが見惚れる筋肉、誰もが見惚れる美貌/);
});

test("new runs can select every appearance, while a saved run restores the same portrait and attack art", () => {
  const selected = new Set(Array.from({ length: 1000 }, (_, index) => appearance.getLuckyBurnsImage(`run-${index}`)));
  assert.deepEqual(selected, new Set(appearance.LUCKY_BURNS_IMAGES));
  const team = [lucky.id, ...game.INITIAL_PROFILE.team.slice(1)];
  const battle = game.newBattle(undefined, null, team);
  const restored = game.normalizeBattleState(JSON.parse(JSON.stringify({ ...battle, turn: 5 })), team);
  assert.equal(restored.runId, battle.runId);
  assert.deepEqual(restored.partyIds, team);
  const original = game.resolveProfileCharacterVisual(lucky, game.INITIAL_PROFILE, battle.runId);
  const resumed = game.resolveProfileCharacterVisual(lucky, game.INITIAL_PROFILE, restored.runId);
  assert.equal(resumed.image, original.image);
  assert.equal(resumed.actionImage, original.motionFrames[0]);
  assert.deepEqual(resumed.motionFrames, original.motionFrames);
});

test("skins preserve identity, stats, skills and crown progression without changing other characters", () => {
  for (let index = 0; index < 100; index++) {
    const profile = { ...game.INITIAL_PROFILE, evolutions: { [lucky.id]: 12 } };
    const visual = game.resolveProfileCharacterVisual(lucky, profile, `run-${index}`);
    assert.equal(visual.id, lucky.id);
    assert.deepEqual(visual.baseStats, lucky.baseStats);
    assert.equal(visual.skill, lucky.skill);
    assert.equal(visual.actionImage, visual.motionFrames[0]);
    assert.deepEqual(visual.motionFrames, appearance.getLuckyBurnsVisual(`run-${index}`).motionFrames);
    assert.ok(appearance.LUCKY_BURNS_IMAGES.includes(visual.image));
  }
  const other = game.ROSTER.find((unit) => unit.id === "red-hood");
  assert.equal(appearance.resolveRunAppearance(other, "run-1"), other);
  const evolved = game.resolveProfileCharacterVisual(other, { evolutions: { [other.id]: 12 } }, "run-1");
  assert.match(evolved.image, /evolution-12\/red-hood\/portrait/);
  assert.equal(game.resolveProfileCharacterVisual(lucky, game.INITIAL_PROFILE).image, appearance.LUCKY_BURNS_IMAGES[0]);
});


test("all eleven skins have six distinct attack frames and retain them through evolution", () => {
  const hashes = new Set();
  for (const visual of appearance.LUCKY_BURNS_VISUALS) {
    assert.equal(visual.motionFrames.length, 6);
    for (const path of visual.motionFrames) {
      const bytes = readFileSync(root + "public" + path);
      assert.equal(bytes.subarray(8, 12).toString(), "WEBP", path);
      hashes.add(createHash("sha256").update(bytes).digest("hex"));
    }
  }
  assert.equal(hashes.size, 66, "every skin and frame has its own artwork");
  const before = game.resolveProfileCharacterVisual(lucky, { evolutions: { [lucky.id]: 11 } }, "same-run");
  const after = game.resolveProfileCharacterVisual(lucky, { evolutions: { [lucky.id]: 12 } }, "same-run");
  assert.deepEqual(after.motionFrames, before.motionFrames);
  assert.equal(after.image, before.image);
  assert.equal(game.getEvolutionRequirements(lucky, 11).evolutionMaterialCharacters, 0);
});
