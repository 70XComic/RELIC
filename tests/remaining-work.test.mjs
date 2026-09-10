import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test, { after } from "node:test";
import { createServer } from "vite";
const root = new URL("..", import.meta.url).pathname;
const vite = await createServer({
  appType: "custom", configFile: false, root, resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false },
  plugins: [{ name: "test-game-data", transform(source, id) {
    if (id.endsWith("/app/page.tsx")) return source + "\nexport { ROSTER, STAGES, LEGACY_NORMAL_STAGES, ALL_STAGES, EVENT_STAGES, newBattle, normalizeBattleState, restoreGameProfile };";
  } }],
});
const game = await vite.ssrLoadModule("/app/page.tsx");
after(() => vite.close());

test("151 battle characters have acquisition routes, including the two added dungeon characters", async () => {
  assert.equal(game.ROSTER.length, 151);
  assert.equal(new Set(game.ROSTER.map((unit) => unit.id)).size, 151);
  for (const id of ["dungeon-033", "dungeon-034"]) {
    const unit = game.ROSTER.find((unit) => unit.id === id);
    assert.ok(unit);
    assert.ok(game.STAGES.some((stage) => stage.dropCharacterId === id && stage.dropRate > 0));
    await access(root + "/public" + unit.image.split("?")[0]);
  }
});

test("main map is exactly 50 sets while every previous normal stage remains addressable", () => {
  assert.equal(game.STAGES.length, 150);
  assert.equal(new Set(game.STAGES.map((stage) => stage.chapter)).size, 50);
  assert.equal(game.LEGACY_NORMAL_STAGES.length, 42);
  const ids = new Set(game.ALL_STAGES.map((stage) => stage.id));
  for (let chapter = 1; chapter <= 14; chapter++)
    for (let step = 1; step <= 3; step++) assert.ok(ids.has(`${chapter}-${step}`));
  for (let chapter = 1; chapter <= 50; chapter++)
    for (let step = 1; step <= 3; step++) assert.ok(ids.has(`N-${chapter}-${step}`));
  const restored = game.restoreGameProfile({ stageStars: { "N-50-3": 3 }, owned: ["wave1-flam", "wave1-aqua", "wave1-seed"] });
  assert.equal(restored.stageStars["N-50-3"], 3);
});

test("50 event themes and every EX use distinct existing dedicated images", async () => {
  const backgrounds = new Set(game.EVENT_STAGES.map((stage) => stage.background));
  assert.equal(backgrounds.size, 50);
  for (const path of backgrounds) await access(root + "/public" + path);
  const ex = game.ROSTER.filter((unit) => unit.rarity === "EX");
  assert.equal(ex.length, 7);
  for (const unit of ex) {
    const cutin = game.getExCutinImage(unit.id);
    assert.notEqual(cutin, unit.image);
    await access(root + "/public" + cutin);
  }
});

test("enemy packs are deterministic, have distinct identities and preserve single bosses", () => {
  let multiple = 0;
  for (const stage of game.ALL_STAGES) {
    stage.enemies.forEach((_, index) => {
      const enemies = game.getWaveEnemies(stage, index + 1);
      assert.equal(enemies, game.getWaveEnemies(stage, index + 1));
      assert.ok(enemies.length >= 1 && enemies.length <= 3);
      assert.equal(new Set(enemies.map((enemy) => enemy.image)).size, enemies.length);
      assert.ok(enemies.every((enemy) => enemy.maxHp > 0 && enemy.atk > 0 && enemy.spd > 0));
      if (enemies.length > 1) {
        multiple++;
        assert.equal(new Set(enemies.map((enemy) => enemy.combatStyle)).size, enemies.length);
      }
      if (stage.singleEnemyWaves || stage.enemies[index].isBoss) assert.equal(enemies.length, 1);
    });
  }
  assert.ok(multiple > 100);
});

test("each enemy participates in speed order with allies winning ties", () => {
  const steps = [
    { kind: "enemy", speed: 20, tie: 3 }, { kind: "party", speed: 20, tie: 0 },
    { kind: "enemy", speed: 45, tie: 4 }, { kind: "party", speed: 10, tie: 1 },
    { kind: "enemy", speed: 5, tie: 5 },
  ];
  assert.deepEqual(game.sortCombatInitiative(steps).map((step) => step.tie), [4, 0, 3, 1, 5]);
  assert.equal(game.getEnemyAttackMultiplier({ combatStyle: "striker" }, 3), 1.5);
  assert.equal(game.getEnemyAttackMultiplier({ combatStyle: "striker" }, 2), 1);
});

test("old equal-HP packs migrate proportionally and never revive defeated enemies", () => {
  const stage = game.ALL_STAGES.find((stage) => game.getWaveEnemies(stage, 1).length === 3);
  const fresh = game.newBattle(stage.id);
  const oldMax = Math.round(Math.round(stage.enemies[0].maxHp * 2.44) / 3);
  const restored = game.normalizeBattleState({ ...fresh, enemyMaxHps: undefined, enemyHps: [0, oldMax / 2, oldMax] });
  assert.equal(restored.enemyHps[0], 0);
  assert.ok(Math.abs(restored.enemyHps[1] / restored.enemyMaxHps[1] - 0.5) < 0.01);
  assert.equal(restored.enemyHps[2], restored.enemyMaxHps[2]);
  assert.deepEqual(game.normalizeBattleState(restored).enemyHps, restored.enemyHps);
});
