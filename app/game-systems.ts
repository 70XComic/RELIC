export type EquipmentUnitType =
  | "人間"
  | "獣"
  | "龍"
  | "機械"
  | "魔族"
  | "天使"
  | "精霊"
  | "不明";

export type EquipmentRarity = "R" | "SR" | "SSR";

export type EquipmentBonuses = {
  hpMultiplier?: number;
  atkMultiplier?: number;
  defMultiplier?: number;
  spdBonus?: number;
  critBonus?: number;
};

export type EquipmentItem = {
  id: string;
  name: string;
  type: EquipmentUnitType;
  rarity: EquipmentRarity;
  description: string;
  effectLabel: string;
  price: number;
  spriteIndex: number;
  bonuses: EquipmentBonuses;
};

export const EQUIPMENT_ITEMS: EquipmentItem[] = [
  {
    id: "ignis-knightblade",
    name: "炎騎剣イグニス",
    type: "人間",
    rarity: "SR",
    description: "炎を刀身へ定着させた、人の戦士だけが扱える騎士剣。",
    effectLabel: "攻撃+10%・会心+3%",
    price: 4_800,
    spriteIndex: 0,
    bonuses: { atkMultiplier: 1.1, critBonus: 3 },
  },
  {
    id: "nereid-tidestaff",
    name: "蒼潮杖ネレイス",
    type: "精霊",
    rarity: "SR",
    description: "潮流の記憶を宿し、精霊の力を安定させる青い杖。",
    effectLabel: "HP+8%・攻撃+8%",
    price: 4_800,
    spriteIndex: 1,
    bonuses: { hpMultiplier: 1.08, atkMultiplier: 1.08 },
  },
  {
    id: "verdant-feralclaw",
    name: "森牙ガントレット",
    type: "獣",
    rarity: "R",
    description: "森の獣の踏み込みを、鋭い一撃へ変える鉤爪。",
    effectLabel: "攻撃+8%・速度+3",
    price: 2_500,
    spriteIndex: 2,
    bonuses: { atkMultiplier: 1.08, spdBonus: 3 },
  },
  {
    id: "seraph-feather",
    name: "天翼セラフィム",
    type: "天使",
    rarity: "SR",
    description: "聖域の加護を薄い光膜へ変える純白の羽。",
    effectLabel: "HP+12%・防御+10%",
    price: 5_200,
    spriteIndex: 3,
    bonuses: { hpMultiplier: 1.12, defMultiplier: 1.1 },
  },
  {
    id: "nox-abyss-ring",
    name: "深淵指輪ノクス",
    type: "魔族",
    rarity: "SSR",
    description: "闇を凝縮し、魔族の破壊衝動だけを力へ変える指輪。",
    effectLabel: "攻撃+14%・会心+4%",
    price: 12_000,
    spriteIndex: 4,
    bonuses: { atkMultiplier: 1.14, critBonus: 4 },
  },
  {
    id: "dragonking-talon",
    name: "龍王の鉤爪",
    type: "龍",
    rarity: "SSR",
    description: "龍脈へ直接触れ、強靭な肉体と爪牙を呼び覚ます遺物。",
    effectLabel: "HP+8%・攻撃+12%",
    price: 12_000,
    spriteIndex: 5,
    bonuses: { hpMultiplier: 1.08, atkMultiplier: 1.12 },
  },
  {
    id: "machina-precision-rifle",
    name: "機導精密銃",
    type: "機械",
    rarity: "SR",
    description: "機械兵の演算核と同期して照準を補正する長銃。",
    effectLabel: "攻撃+10%・速度+4",
    price: 6_000,
    spriteIndex: 6,
    bonuses: { atkMultiplier: 1.1, spdBonus: 4 },
  },
  {
    id: "eir-spirit-lantern",
    name: "精霊灯エイル",
    type: "精霊",
    rarity: "R",
    description: "傷ついた精霊の輪郭を保つ、温かな生命の灯。",
    effectLabel: "HP+10%・防御+6%",
    price: 2_800,
    spriteIndex: 7,
    bonuses: { hpMultiplier: 1.1, defMultiplier: 1.06 },
  },
  {
    id: "champion-medal",
    name: "勇者の戦章",
    type: "人間",
    rarity: "R",
    description: "幾度も立ち上がった冒険者の意志が刻まれた勲章。",
    effectLabel: "HP+6%・攻撃+6%",
    price: 2_200,
    spriteIndex: 8,
    bonuses: { hpMultiplier: 1.06, atkMultiplier: 1.06 },
  },
  {
    id: "arcane-gear-core",
    name: "魔導歯車核",
    type: "機械",
    rarity: "SSR",
    description: "駆動と防御演算を同時に更新する希少な機巧中枢。",
    effectLabel: "防御+12%・速度+4",
    price: 12_500,
    spriteIndex: 9,
    bonuses: { defMultiplier: 1.12, spdBonus: 4 },
  },
  {
    id: "celestial-scale-armor",
    name: "天鱗の鎧",
    type: "龍",
    rarity: "SSR",
    description: "古龍の鱗を星光で鍛え直した、龍族専用の鎧。",
    effectLabel: "HP+15%・防御+12%",
    price: 14_000,
    spriteIndex: 10,
    bonuses: { hpMultiplier: 1.15, defMultiplier: 1.12 },
  },
  {
    id: "nameless-relic-cube",
    name: "不可知の立方遺物",
    type: "不明",
    rarity: "SSR",
    description: "由来も構造も確認できず、正体不明の者にだけ応答する遺物。",
    effectLabel: "HP・攻撃・防御+10%",
    price: 15_000,
    spriteIndex: 11,
    bonuses: {
      hpMultiplier: 1.1,
      atkMultiplier: 1.1,
      defMultiplier: 1.1,
    },
  },
];

export const EQUIPMENT_BY_ID = new Map(
  EQUIPMENT_ITEMS.map((item) => [item.id, item] as const),
);

export function isEquipmentCompatible(
  characterTypes: readonly string[],
  item: EquipmentItem,
) {
  return characterTypes.includes(item.type);
}

export function applyEquipmentBonuses<
  T extends { hp: number; atk: number; def: number; spd: number; crit: number },
>(stats: T, item: EquipmentItem | undefined): T {
  if (!item) return { ...stats };
  return {
    ...stats,
    hp: Math.round(stats.hp * (item.bonuses.hpMultiplier ?? 1)),
    atk: Math.round(stats.atk * (item.bonuses.atkMultiplier ?? 1)),
    def: Math.round(stats.def * (item.bonuses.defMultiplier ?? 1)),
    spd: Math.max(1, stats.spd + (item.bonuses.spdBonus ?? 0)),
    crit: Math.min(50, stats.crit + (item.bonuses.critBonus ?? 0)),
  };
}

export type DailyEquipmentOffer = {
  id: string;
  dayKey: string;
  slot: number;
  item: EquipmentItem;
};

const DAY_MS = 24 * 60 * 60 * 1_000;
const JST_OFFSET_MS = 9 * 60 * 60 * 1_000;

export function stableHash(value: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

export function deterministicUnitRoll(seed: string) {
  return stableHash(seed) / 4_294_967_296;
}

export function rollGuaranteedRarityDraw<T extends { rarity: string }>(
  count: number,
  guaranteedRarity: T["rarity"],
  pickStandard: () => T,
  pickGuaranteed: () => T,
  randomUnit: () => number = Math.random,
) {
  if (!Number.isInteger(count) || count < 1)
    throw new Error("A guaranteed summon requires at least one result slot.");
  const results = Array.from({ length: count - 1 }, pickStandard);
  const guaranteed = pickGuaranteed();
  if (guaranteed.rarity !== guaranteedRarity)
    throw new Error(`Guaranteed summon must return ${guaranteedRarity}.`);
  results.push(guaranteed);
  for (let index = results.length - 1; index > 0; index -= 1) {
    const roll = Math.max(0, Math.min(0.999999999999, randomUnit()));
    const target = Math.floor(roll * (index + 1));
    [results[index], results[target]] = [results[target], results[index]];
  }
  return results;
}

export const FIRST_EXCHANGE_DOUBLE_TOKEN_RATE = 0.1;

export function getStageCharacterClaimKey(
  stageId: string,
  characterId: string,
) {
  return `${stageId}:${characterId}`;
}

export function hasStageCharacterClaim(
  claims: readonly string[],
  stageId: string,
  characterId: string,
) {
  return claims.includes(getStageCharacterClaimKey(stageId, characterId));
}

export function getDirectCharacterDropRate(
  rewardMode: string | undefined,
  configuredRate: number,
) {
  return rewardMode === "first-exchange"
    ? 0
    : Math.max(0, configuredRate);
}

export function resolveFirstExchangeRun({
  rewardMode,
  stageId,
  characterId,
  claims,
  baseTokenReward = 1,
  tokenRoll,
}: {
  rewardMode: string | undefined;
  stageId: string;
  characterId: string | undefined;
  claims: readonly string[];
  baseTokenReward?: number;
  tokenRoll: number;
}) {
  if (rewardMode !== "first-exchange" || !characterId) {
    return {
      firstClearCharacterId: null,
      tokenReward: 0,
      claimKey: null,
    };
  }
  const claimKey = getStageCharacterClaimKey(stageId, characterId);
  if (!claims.includes(claimKey)) {
    return {
      firstClearCharacterId: characterId,
      tokenReward: 0,
      claimKey,
    };
  }
  const tokenReward = Math.max(0, Math.floor(baseTokenReward));
  return {
    firstClearCharacterId: null,
    tokenReward:
      tokenReward *
      (tokenRoll < FIRST_EXCHANGE_DOUBLE_TOKEN_RATE ? 2 : 1),
    claimKey: null,
  };
}

export function getJstDayIndex(now = Date.now()) {
  return Math.floor((now + JST_OFFSET_MS) / DAY_MS);
}

export function getDailyShopKey(now = Date.now()) {
  return new Date(getJstDayIndex(now) * DAY_MS).toISOString().slice(0, 10);
}

export function getNextDailyShopRefresh(now = Date.now()) {
  return (getJstDayIndex(now) + 1) * DAY_MS - JST_OFFSET_MS;
}

export function getDailyEquipmentOffers(now = Date.now(), count = 6) {
  const dayKey = getDailyShopKey(now);
  return [...EQUIPMENT_ITEMS]
    .sort(
      (left, right) =>
        stableHash(`${dayKey}:${left.id}`) - stableHash(`${dayKey}:${right.id}`),
    )
    .slice(0, Math.max(0, Math.min(count, EQUIPMENT_ITEMS.length)))
    .map((item, slot): DailyEquipmentOffer => ({
      id: `${dayKey}:${slot}:${item.id}`,
      dayKey,
      slot,
      item,
    }));
}

export function getEquipmentDropChance(
  stageKind: string | undefined,
  recommendedLevel: number,
) {
  if (stageKind === "strong" || stageKind === "abyss") return 0.02;
  if (stageKind === "event" || recommendedLevel >= 120) return 0.015;
  return 0.01;
}

export function rollEquipmentDrop(
  stageId: string,
  stageKind: string | undefined,
  recommendedLevel: number,
  runId: string,
) {
  const chance = getEquipmentDropChance(stageKind, recommendedLevel);
  if (deterministicUnitRoll(`${runId}:${stageId}:equipment-chance`) >= chance)
    return null;
  const eligible =
    recommendedLevel >= 150
      ? EQUIPMENT_ITEMS.filter((item) => item.rarity !== "R")
      : recommendedLevel >= 70
        ? EQUIPMENT_ITEMS
        : EQUIPMENT_ITEMS.filter((item) => item.rarity !== "SSR");
  return eligible[
    stableHash(`${runId}:${stageId}:equipment-item`) % eligible.length
  ];
}

export type SynergyBonuses = {
  hpMultiplier?: number;
  atkMultiplier?: number;
  defMultiplier?: number;
  spdMultiplier?: number;
};

export type PartySynergy = {
  id: string;
  name: string;
  memberIds: readonly [string, string, string];
  awakeningName: string;
  awakeningDescription: string;
  ultimateName: string;
  ultimatePower: number;
  ultimateHeal: number;
  extremePower: number;
  extremeHeal: number;
  extremeDescription: string;
  color: string;
  bonuses: SynergyBonuses;
};

export const PARTY_SYNERGIES: PartySynergy[] = [
  {
    id: "initial-heroes",
    name: "全ての始まり",
    memberIds: ["ex-swamp", "ex-leopard", "ex-fox"],
    awakeningName: "原初の三傑",
    awakeningDescription: "パーティのHP・攻撃・防御を50%上昇",
    ultimateName: "オリジン・トリニティ",
    ultimatePower: 1.85,
    ultimateHeal: 20,
    extremePower: 2.85,
    extremeHeal: 35,
    extremeDescription: "極では三傑の連携が敵全体を貫き、パーティHPを35%回復",
    color: "#f2ce70",
    bonuses: { hpMultiplier: 1.5, atkMultiplier: 1.5, defMultiplier: 1.5 },
  },
  {
    id: "all-beginnings",
    name: "夢幕の三重奏",
    memberIds: ["p4-revelle", "p4-somnia", "p4-masquerade"],
    awakeningName: "醒夢劇・三重奏",
    awakeningDescription: "パーティの攻撃を16%、防御を12%、速度を8%上昇",
    ultimateName: "ルーセント・カーテンコール",
    ultimatePower: 1.85,
    ultimateHeal: 20,
    extremePower: 2.75,
    extremeHeal: 32,
    extremeDescription: "極では夢灯が月刃と無貌の舞台を照らし、敵全体を終幕へ導いた後、パーティHPを32%回復",
    color: "#c96bea",
    bonuses: { atkMultiplier: 1.16, defMultiplier: 1.12, spdMultiplier: 1.08 },
  },
  {
    id: "three-first-lights",
    name: "はじまりの三灯",
    memberIds: ["wave1-flam", "wave1-aqua", "wave1-seed"],
    awakeningName: "火・水・木の共鳴",
    awakeningDescription: "パーティのHP・攻撃・防御を10%、速度を5%上昇",
    ultimateName: "エレメント・トライアド",
    ultimatePower: 1.7,
    ultimateHeal: 20,
    extremePower: 2.5,
    extremeHeal: 30,
    extremeDescription: "極では三属性の連撃後、パーティHPを30%回復",
    color: "#6de3c1",
    bonuses: {
      hpMultiplier: 1.1,
      atkMultiplier: 1.1,
      defMultiplier: 1.1,
      spdMultiplier: 1.05,
    },
  },
  {
    id: "three-realm-dragons",
    name: "三界龍脈",
    memberIds: ["void", "inferno-dragonia", "white-dragon-saint"],
    awakeningName: "光炎闇・龍脈解放",
    awakeningDescription: "パーティのHP・防御を12%、攻撃を16%上昇",
    ultimateName: "三界滅龍陣",
    ultimatePower: 1.85,
    ultimateHeal: 16,
    extremePower: 2.8,
    extremeHeal: 24,
    extremeDescription: "極では三龍のブレスが敵全体を貫き、パーティHPを24%回復",
    color: "#b77cff",
    bonuses: { hpMultiplier: 1.12, atkMultiplier: 1.16, defMultiplier: 1.12 },
  },
  {
    id: "azure-expedition",
    name: "蒼海航路",
    memberIds: ["captain-nemo", "mech-orca", "mech-narwhal"],
    awakeningName: "深海共同戦線",
    awakeningDescription: "パーティのHPを12%、防御を16%、速度を8%上昇",
    ultimateName: "ノーチラス・タイドブレイク",
    ultimatePower: 1.7,
    ultimateHeal: 24,
    extremePower: 2.55,
    extremeHeal: 32,
    extremeDescription: "極では深海砲撃が敵全体を制圧し、パーティHPを32%回復",
    color: "#38cce8",
    bonuses: { hpMultiplier: 1.12, defMultiplier: 1.16, spdMultiplier: 1.08 },
  },
];

export const PARTY_SYNERGY_BY_ID = new Map(
  PARTY_SYNERGIES.map((synergy) => [synergy.id, synergy] as const),
);

export function getActivePartySynergy(teamIds: readonly string[]) {
  if (teamIds.length !== 3 || new Set(teamIds).size !== 3) return null;
  const team = new Set(teamIds);
  return (
    PARTY_SYNERGIES.find((synergy) =>
      synergy.memberIds.every((memberId) => team.has(memberId)),
    ) ?? null
  );
}

export function getUltimateGaugeMax(synergy: PartySynergy | null) {
  return synergy ? 200 : 100;
}

export function getUltimateTier(
  gauge: number,
  synergy: PartySynergy | null,
): "none" | "normal" | "extreme" {
  if (!synergy) return "none";
  if (synergy && gauge >= 200) return "extreme";
  if (gauge >= 100) return "normal";
  return "none";
}
