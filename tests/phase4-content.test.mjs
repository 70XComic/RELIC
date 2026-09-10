import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test, { after } from "node:test";
import { createServer } from "vite";

const rootUrl = new URL("..", import.meta.url);
const root = fileURLToPath(rootUrl);
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false },
});

const content = await vite.ssrLoadModule("/app/phase4-content.ts");
const evolution = await vite.ssrLoadModule("/app/evolution-visuals.ts");
const systems = await vite.ssrLoadModule("/app/game-systems.ts");

after(async () => {
  await vite.close();
});

const {
  PHASE4_CHARACTERS,
  PHASE4_VOID_DUNGEONS,
  PHASE4_EVENT_DUNGEONS,
  PHASE4_NEW_ENEMY_IDS,
} = content;
const phase4EvolutionVisuals = evolution.PHASE4_EVOLUTION_VISUALS;

function evolutionVisual(characterId) {
  const registered = phase4EvolutionVisuals?.[characterId];
  const resolved = registered ?? evolution.getEvolution12VisualAssets?.(characterId);
  if (!resolved) return undefined;
  return {
    image: resolved.image ?? resolved.portrait,
    motionFrames: resolved.motionFrames,
  };
}

function assertAssetPath(assetPath, label) {
  assert.equal(typeof assetPath, "string", `${label}: path must be a string`);
  assert.match(assetPath, /^\/assets\//, `${label}: path must live in /assets`);
  const cleanPath = assetPath.split(/[?#]/, 1)[0];
  assert.ok(
    existsSync(fileURLToPath(new URL(`../public${cleanPath}`, import.meta.url))),
    `${label}: missing ${cleanPath}`,
  );
}

function enemyId(enemy) {
  return enemy.id ?? enemy.characterId;
}

function acquisitionRoute(character) {
  if (typeof character.acquisition === "string") return character.acquisition;
  if (character.acquisition && typeof character.acquisition === "object") {
    return character.acquisition.kind ?? character.acquisition.label;
  }
  return character.source;
}

test("phase 4 adds exactly two SSR, two EX, five R, and five SR characters", () => {
  assert.ok(Array.isArray(PHASE4_CHARACTERS));
  assert.equal(PHASE4_CHARACTERS.length, 14);
  const rarityCounts = Object.fromEntries(
    ["R", "SR", "SSR", "EX"].map((rarity) => [
      rarity,
      PHASE4_CHARACTERS.filter((character) => character.rarity === rarity).length,
    ]),
  );
  assert.deepEqual(rarityCounts, { R: 5, SR: 5, SSR: 2, EX: 2 });

  const ids = PHASE4_CHARACTERS.map((character) => character.id);
  assert.equal(new Set(ids).size, ids.length, "phase 4 character IDs must be unique");
});

test("every new character has complete combat and acquisition metadata", () => {
  PHASE4_CHARACTERS.forEach((character) => {
    assert.match(character.id, /\S/, "character ID");
    assert.match(character.name, /\S/, `${character.id}: name`);
    assert.match(character.element, /\S/, `${character.id}: element`);
    assert.match(character.skill, /\S/, `${character.id}: skill`);
    assert.ok(
      Array.isArray(character.types) && character.types.length > 0,
      `${character.id}: at least one unit type is required`,
    );
    character.types.forEach((type) => {
      assert.ok(
        ["人間", "獣", "龍", "機械", "魔族", "天使", "精霊", "不明"].includes(type),
        `${character.id}: unknown unit type ${type}`,
      );
    });
    assert.match(
      acquisitionRoute(character) ?? "",
      /\S/,
      `${character.id}: acquisition route`,
    );
    assertAssetPath(character.image, `${character.id}: image`);
    assertAssetPath(character.actionImage, `${character.id}: action image`);
  });
});

test("phase 4 contains two void dungeons and two event dungeons with valid lengths", () => {
  assert.equal(PHASE4_VOID_DUNGEONS.length, 2);
  assert.equal(PHASE4_EVENT_DUNGEONS.length, 2);

  const allDungeons = [...PHASE4_VOID_DUNGEONS, ...PHASE4_EVENT_DUNGEONS];
  const ids = allDungeons.map((stage) => stage.id);
  assert.equal(new Set(ids).size, ids.length, "phase 4 dungeon IDs must be unique");

  allDungeons.forEach((stage) => {
    assert.ok(
      stage.enemies.length >= 3 && stage.enemies.length <= 20,
      `${stage.id}: floors must be between 3 and 20`,
    );
    assert.ok(
      Number.isFinite(stage.recommended) && stage.recommended <= 225,
      `${stage.id}: recommended level must not exceed 225`,
    );
    assertAssetPath(stage.background, `${stage.id}: background`);
    stage.enemies.forEach((enemy, index) => {
      assert.match(enemyId(enemy) ?? "", /\S/, `${stage.id} floor ${index + 1}: enemy ID`);
      assertAssetPath(enemy.image, `${stage.id} floor ${index + 1}: enemy image`);
    });
  });

  PHASE4_EVENT_DUNGEONS.forEach((stage) => {
    assert.equal(stage.kind, "event", `${stage.id}: event kind`);
    assert.equal(stage.dropCharacterPoolIds?.length, 5, `${stage.id}: five-character pool`);
    assert.ok(stage.dropRate >= 0.01 && stage.dropRate <= 0.05, `${stage.id}: drop rate must stay between 1% and 5%`);
  });
  const orderedEvents = [...PHASE4_EVENT_DUNGEONS].sort(
    (left, right) => left.recommended - right.recommended,
  );
  assert.ok(
    orderedEvents.every(
      (stage, index) =>
        index === 0 || stage.dropRate > orderedEvents[index - 1].dropRate,
    ),
    "higher event difficulty must increase character drop rates",
  );
});

test("void dungeons drop their EX boss at 80% and use only phase 4 enemies", () => {
  assert.ok(Array.isArray(PHASE4_NEW_ENEMY_IDS));
  assert.ok(PHASE4_NEW_ENEMY_IDS.length > 0);
  const newEnemyIds = new Set(PHASE4_NEW_ENEMY_IDS);
  assert.equal(newEnemyIds.size, PHASE4_NEW_ENEMY_IDS.length, "new enemy IDs must be unique");

  PHASE4_VOID_DUNGEONS.forEach((stage) => {
    assert.ok(
      stage.difficultyLabel === "無" || stage.difficultyLabel === "無級",
      `${stage.id}: difficulty must be 無`,
    );
    assert.equal(stage.dropCharacterId, enemyId(stage.enemies.at(-1)), `${stage.id}: drop must be the boss`);
    assert.equal(stage.dropCharacterPoolIds, undefined, `${stage.id}: character pool drop forbidden`);
    assert.equal(stage.dropRate, 0.8, `${stage.id}: fixed 80% boss drop`);
    assert.equal(stage.firstClearRewardCharacterId, undefined, `${stage.id}: first clear uses the same rate`);
    stage.enemies.forEach((enemy, index) => {
      assert.ok(
        newEnemyIds.has(enemyId(enemy)),
        `${stage.id} floor ${index + 1}: reused enemy ${enemyId(enemy)}`,
      );
    });
  });
});

test("new void bosses remain beatable at the declared recommended level", () => {
  PHASE4_VOID_DUNGEONS.forEach((stage) => {
    const boss = stage.enemies.at(-1);
    assert.ok(stage.scale >= 2.5 && stage.scale <= 4, `${stage.id}: combat scale`);
    assert.ok(stage.enemySpeedMultiplier >= 3.5, `${stage.id}: enemies must enter the speed order`);
    if (stage.gimmick?.doomTurn) {
      const conservativePartyDamagePerTurn = 2_000;
      assert.ok(
        boss.maxHp <= stage.gimmick.doomTurn * conservativePartyDamagePerTurn,
        `${stage.id}: boss HP must be reachable before the doom turn`,
      );
    }
  });
});

test("new SSR and EX characters have evolution-12 art and six motion frames", () => {
  assert.ok(
    (phase4EvolutionVisuals && typeof phase4EvolutionVisuals === "object") ||
      typeof evolution.getEvolution12VisualAssets === "function",
    "an evolution-12 manifest or resolver is required",
  );
  const eliteCharacters = PHASE4_CHARACTERS.filter(
    (character) => character.rarity === "SSR" || character.rarity === "EX",
  );
  assert.equal(eliteCharacters.length, 4);

  eliteCharacters.forEach((character) => {
    const baseFrames = Array.from(
      { length: 6 },
      (_, index) => `/assets/motion-frames/${character.id}/frame-${index + 1}.webp`,
    );
    baseFrames.forEach((frame, index) =>
      assertAssetPath(frame, `${character.id}: base motion frame ${index + 1}`),
    );
    const visual = evolutionVisual(character.id);
    assert.ok(visual, `${character.id}: missing evolution-12 visual`);
    assertAssetPath(visual.image, `${character.id}: evolution-12 image`);
    assert.equal(visual.motionFrames.length, 6, `${character.id}: evolution-12 frame count`);
    assert.equal(
      new Set(visual.motionFrames).size,
      6,
      `${character.id}: motion frame paths must be unique`,
    );
    visual.motionFrames.forEach((frame, index) => {
      assertAssetPath(frame, `${character.id}: evolution-12 frame ${index + 1}`);
    });
  });
});

test("all retained SSR and EX characters have complete evolution-12 assets", () => {
  const eliteIds = evolution.EVOLUTION_12_CHARACTER_IDS;
  assert.equal(eliteIds.length, 30);
  assert.equal(new Set(eliteIds).size, 30);
  eliteIds.forEach((characterId) => {
    const visual = evolutionVisual(characterId);
    assert.ok(visual, `${characterId}: missing evolution visual manifest`);
    assertAssetPath(visual.image, `${characterId}: evolution portrait`);
    assert.equal(visual.motionFrames.length, 6);
    assert.equal(new Set(visual.motionFrames).size, 6);
    visual.motionFrames.forEach((frame, index) =>
      assertAssetPath(frame, `${characterId}: evolution frame ${index + 1}`),
    );
  });
});

test("phase 3 equipment and the first synergy remain intact", () => {
  assert.equal(systems.EQUIPMENT_ITEMS.length, 12);
  assert.equal(new Set(systems.EQUIPMENT_ITEMS.map((item) => item.id)).size, 12);
  const beginning = systems.PARTY_SYNERGY_BY_ID.get("all-beginnings");
  assert.ok(beginning);
  assert.deepEqual(new Set(beginning.memberIds), new Set([
    "p4-revelle",
    "p4-somnia",
    "p4-masquerade",
  ]));
});

test("the complete page catalog still passes its startup validation", async () => {
  const page = await vite.ssrLoadModule("/app/page.tsx");
  assert.equal(typeof page.default, "function");
});
