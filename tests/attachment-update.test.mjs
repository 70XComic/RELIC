import assert from "node:assert/strict";
import test, { after } from "node:test";
import { createServer } from "vite";

const root = new URL("..", import.meta.url).pathname;
const vite = await createServer({
  appType: "custom", configFile: false, root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false },
  plugins: [{ name: "attachment-spec", transform(source, id) {
    if (id.endsWith("/app/page.tsx")) return source + "\nexport { ALL_STAGES, ROSTER, MATERIAL_STAGES, EXCHANGEABLE_BOSS_IDS, getStage, getStageDifficultyLabel, getStageCharacterDropRate, getStageFirstClearCharacterId, resolveStageCharacterDrop, getEvolutionRequirements, getUniqueAwakening, getBattlePartyStats, getCharacterStats, getDefeatLoot, settleRunLoot };";
  } }],
});
const page = await vite.ssrLoadModule("/app/page.tsx");
const systems = await vite.ssrLoadModule("/app/game-systems.ts");
after(() => vite.close());

test("all event bosses use the attached rates on first and repeat clears, including boundary rolls", () => {
  const rates = { 初級: .005, 中級: .01, 上級: .03, 白級: .55, 黒級: .6, 無級: .8 };
  const seen = new Set();
  for (const stage of page.ALL_STAGES.filter(s => s.kind === "event" || s.kind === "strong")) {
    if (!stage.dropCharacterId && !stage.dropCharacterPoolIds?.length) continue;
    const difficulty = page.getStageDifficultyLabel(stage);
    const expected = rates[difficulty];
    seen.add(difficulty);
    assert.equal(page.getStageCharacterDropRate(stage), expected, stage.id);
    assert.equal(stage.dropRate, expected, `${stage.id}: authoring metadata`);
    assert.equal(page.getStageFirstClearCharacterId(stage), undefined, stage.id);
    assert.notEqual(stage.rewardMode, "first-exchange", stage.id);
    assert.ok(page.resolveStageCharacterDrop(stage, expected - Number.EPSILON, 0), stage.id);
    assert.equal(page.resolveStageCharacterDrop(stage, expected, 0), undefined, stage.id);
    if (stage.dropCharacterPoolIds?.length) {
      for (let i = 0; i < 5; i++) assert.equal(page.resolveStageCharacterDrop(stage, 0, (i + .5) / 5), stage.dropCharacterPoolIds[i]);
    }
  }
  assert.deepEqual(seen, new Set(Object.keys(rates)));
  assert.ok(page.EXCHANGEABLE_BOSS_IDS.size > 0, "retained tokens remain exchangeable");
});

test("every evolution material cost is halved with integer rounding, with five transformation characters only for SSR and EX", () => {
  const stars = { R: [1,1,2,4,6], SR: [1,2,4,6,9], SSR: [2,3,5,8,12], EX: [2,4,6,10,14] };
  const later = [5,8,10,15,20,25,3,5,8,10,15,20,3,5,8];
  for (const rarity of Object.keys(stars)) {
    const character = { id: "test-dungeon", rarity, source: "dungeon" };
    [...stars[rarity], ...later].forEach((oldCost, evolution) => {
      const cost = page.getEvolutionRequirements(character, evolution);
      assert.equal(cost.amount, Math.ceil(oldCost / 2), `${rarity}:${evolution}`);
      assert.equal(cost.copies, Math.ceil(([1,2,4,6,8][evolution] ?? 0) / 2));
      assert.equal(cost.evolutionMaterialCharacters, evolution === 11 && ["SSR","EX"].includes(rarity) ? 5 : 0);
    });
  }
});

test("unique awakening stays locked through red dragon and affects actual combat stats from yellow crown", () => {
  const character = page.ROSTER.find(c => c.rarity === "SSR");
  const baseProfile = { levels: {}, evolutions: {}, equippedItems: {} };
  for (const evolution of [5,6,11,12]) {
    const profile = { ...baseProfile, evolutions: { [character.id]: evolution } };
    const base = page.getCharacterStats(character, 1, evolution);
    const actual = page.getBattlePartyStats([character], profile, [], null)[0];
    if (evolution < 12) assert.deepEqual(actual, base);
    else {
      const awakening = page.getUniqueAwakening(character, evolution);
      const key = awakening.partyStat ?? "atk";
      const multiplier = awakening.partyMultiplier ?? awakening.selfAtkMultiplier;
      assert.equal(actual[key], Math.round(base[key] * multiplier));
    }
  }
});

test("all four growth families have the requested tier rates, yield and one-time loot settlement", () => {
  const expected = [[.1,1,.15,1],[.5,1,.5,1],[.7,1,.8,2],[.95,2,1,4]];
  const families = new Set();
  for (const stage of page.MATERIAL_STAGES) {
    families.add(stage.area);
    const [normalChance, normalAmount, bossChance, bossAmount] = expected[stage.number - 1];
    assert.equal(stage.normalDefeatDrops[0].chance, normalChance);
    assert.equal(stage.normalDefeatDrops[0].amount, normalAmount);
    assert.equal(stage.bossDefeatDrops[0].chance, bossChance);
    assert.equal(stage.bossDefeatDrops[0].amount, bossAmount);
    assert.equal(stage.dropPolicy, "defeat-only");
    if (stage.number === 4) {
      assert.match(stage.title, /^実りの大地（[強進変技]）$/);
      const loot = page.getDefeatLoot(page.getStage(stage.id), 3, 0, "spec-run");
      assert.equal(loot[stage.bossDefeatDrops[0].kind], 4);
      const empty = { trainingCrystals: 0, evoStones: 0, evolutionMaterialCharacters: 0, skillMaterialCharacters: 0, claimedBattleRuns: [] };
      const battle = { runId: "spec-run", runLoot: loot };
      const settled = page.settleRunLoot(empty, battle);
      assert.equal(settled[stage.bossDefeatDrops[0].kind], 4);
      assert.strictEqual(page.settleRunLoot(settled, battle), settled);
    }
  }
  assert.deepEqual(families, new Set(["育成ダンジョン・強化素材","育成ダンジョン・進化素材","育成ダンジョン・進化キャラ","育成ダンジョン・スキルキャラ"]));
});

test("the original EX trio activates the specified 50% stats and extreme ultimate", () => {
  const ids = ["ex-swamp","ex-leopard","ex-fox"];
  const synergy = systems.getActivePartySynergy(ids);
  assert.equal(synergy.name, "全ての始まり");
  assert.deepEqual(synergy.bonuses, { hpMultiplier: 1.5, atkMultiplier: 1.5, defMultiplier: 1.5 });
  assert.equal(systems.getUltimateTier(100, synergy), "normal");
  assert.equal(systems.getUltimateTier(200, synergy), "extreme");
  assert.ok(synergy.extremePower > synergy.ultimatePower);
  const party = ids.map(id => page.ROSTER.find(c => c.id === id));
  const profile = { levels: {}, evolutions: {}, equippedItems: {} };
  const plain = page.getBattlePartyStats(party, profile, [], null);
  const buffed = page.getBattlePartyStats(party, profile, [], synergy);
  buffed.forEach((stats, i) => ["hp","atk","def"].forEach(key => assert.equal(stats[key], Math.round(plain[i][key] * 1.5))));
});
