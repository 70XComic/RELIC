import assert from "node:assert/strict";
import test, { after } from "node:test";
import { createServer } from "vite";

const root = new URL("..", import.meta.url).pathname;
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false },
});

const systems = await vite.ssrLoadModule("/app/game-systems.ts");

after(async () => {
  await vite.close();
});

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
}

test("reroll draw always contains a shuffled guaranteed SSR", () => {
  const standard = { id: "standard-r", rarity: "R" };
  const guaranteed = [
    { id: "ssr-a", rarity: "SSR" },
    { id: "ssr-b", rarity: "SSR" },
    { id: "ssr-c", rarity: "SSR" },
  ];
  const ssrPositions = new Set();
  const selectedSsrIds = new Set();

  for (let seed = 1; seed <= 48; seed += 1) {
    const results = systems.rollGuaranteedRarityDraw(
      10,
      "SSR",
      () => standard,
      () => guaranteed[seed % guaranteed.length],
      seededRandom(seed),
    );
    assert.equal(results.length, 10);
    const ssrIndex = results.findIndex((result) => result.rarity === "SSR");
    assert.ok(ssrIndex >= 0);
    ssrPositions.add(ssrIndex);
    selectedSsrIds.add(results[ssrIndex].id);
  }

  assert.ok(ssrPositions.size > 1, "the guaranteed SSR position must not be fixed");
  assert.deepEqual(selectedSsrIds, new Set(["ssr-a", "ssr-b", "ssr-c"]));
});

test("guaranteed draw rejects an invalid guaranteed result", () => {
  assert.throws(
    () =>
      systems.rollGuaranteedRarityDraw(
        10,
        "SSR",
        () => ({ rarity: "R" }),
        () => ({ rarity: "SR" }),
        () => 0.5,
      ),
    /must return SSR/,
  );
});

test("first-exchange first clear grants only the character and records its receipt", () => {
  const reward = systems.resolveFirstExchangeRun({
    rewardMode: "first-exchange",
    stageId: "X-1-1",
    characterId: "boss-a",
    claims: [],
    baseTokenReward: 1,
    tokenRoll: 0,
  });

  assert.deepEqual(reward, {
    firstClearCharacterId: "boss-a",
    tokenReward: 0,
    claimKey: "X-1-1:boss-a",
  });
});

test("first-exchange repeat clears grant one token, with two at the ten-percent boundary", () => {
  const base = {
    rewardMode: "first-exchange",
    stageId: "X-1-1",
    characterId: "boss-a",
    claims: ["X-1-1:boss-a"],
    baseTokenReward: 1,
  };

  assert.equal(
    systems.resolveFirstExchangeRun({ ...base, tokenRoll: 0.099 }).tokenReward,
    2,
  );
  assert.equal(
    systems.resolveFirstExchangeRun({ ...base, tokenRoll: 0.1 }).tokenReward,
    1,
  );
  assert.equal(
    systems.resolveFirstExchangeRun({ ...base, tokenRoll: 0.999 }).firstClearCharacterId,
    null,
  );
});

test("first-exchange suppresses direct drops while chance stages keep their rate", () => {
  assert.equal(
    systems.getDirectCharacterDropRate("first-exchange", 1),
    0,
  );
  assert.equal(systems.getDirectCharacterDropRate("chance", 0.03), 0.03);
  assert.equal(systems.getDirectCharacterDropRate(undefined, 0.05), 0.05);
});

test("receipt keys distinguish stages that reward the same character", () => {
  const claims = ["X-1-1:boss-a"];
  assert.equal(
    systems.hasStageCharacterClaim(claims, "X-1-1", "boss-a"),
    true,
  );
  assert.equal(
    systems.hasStageCharacterClaim(claims, "X-1-2", "boss-a"),
    false,
  );
});
