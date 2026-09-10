"use client";

import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  BookOpen,
  ChevronRight,
  Coins,
  Crown,
  Crosshair,
  Flame,
  Filter,
  Gem,
  Gift,
  HeartPulse,
  LockKeyhole,
  LogOut,
  Link2,
  Package,
  Play,
  RefreshCw,
  RotateCcw,
  Settings,
  Shield,
  ShoppingBag,
  Sparkles,
  Swords,
  Trophy,
  UserRound,
  Users,
  Volume2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AccountSaveSession, accountStoragePrefix, chooseSave, readSaveEnvelope } from "./account-save";
import type { CloudSave, SaveStatus } from "./account-save";
import type { CSSProperties } from "react";
import { LUCKY_BURNS_ID, LUCKY_BURNS_IMAGES, LUCKY_BURNS_VISUALS, resolveRunAppearance } from "./random-appearance";
import { getBattleSpriteScale } from "./battle-sprite-fit";
import { useCharacterImagePreview } from "./character-image-preview";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DUNGEON_CHARACTER_DESIGNS,
  EXPANDED_GACHA_DESIGNS,
  WAVE_ONE_REVISIONS,
} from "./character-designs";
import type { CombatArchetype } from "./character-designs";
import {
  applyEquipmentBonuses,
  EQUIPMENT_BY_ID,
  EQUIPMENT_ITEMS,
  getActivePartySynergy,
  getDailyEquipmentOffers,
  getDailyShopKey,
  getDirectCharacterDropRate,
  getEquipmentDropChance,
  getNextDailyShopRefresh,
  getStageCharacterClaimKey,
  getUltimateGaugeMax,
  getUltimateTier,
  hasStageCharacterClaim,
  isEquipmentCompatible,
  PARTY_SYNERGIES,
  PARTY_SYNERGY_BY_ID,
  resolveFirstExchangeRun,
  rollGuaranteedRarityDraw,
  rollEquipmentDrop,
} from "./game-systems";
import type {
  EquipmentItem,
  EquipmentUnitType,
  PartySynergy,
} from "./game-systems";
import {
  EVOLUTION_12_CHARACTER_IDS,
  resolveEvolutionVisual,
} from "./evolution-visuals";
import {
  PHASE4_CHARACTERS,
  PHASE4_EVENT_DUNGEONS,
  PHASE4_NEW_ENEMY_IDS,
  PHASE4_VOID_DUNGEONS,
} from "./phase4-content";
import {
  MATERIAL_CHARACTERS,
  MATERIAL_CHARACTER_BY_PROFILE_KEY,
} from "./material-characters";
import type {
  MaterialCharacter,
} from "./material-characters";

type View =
  | "home"
  | "stages"
  | "events"
  | "abyss"
  | "battle"
  | "party"
  | "growth"
  | "evolution"
  | "shop"
  | "summon"
  | "codex"
  | "equipment"
  | "tags"
  | "inbox"
  | "settings";
type Rarity = "R" | "SR" | "SSR" | "EX";
type Element = "火" | "水" | "木" | "光" | "闇" | "認識負荷";
type UnitType = EquipmentUnitType;
type SummonBanner = "standard" | "limited" | "element" | "role";
type SkillKind = "damage" | "heal" | "guard";
type CharacterSkillKind = SkillKind | "buff";
type AttackScope = "single" | "all";
type BattleAction = "attack" | "skill" | "guard";
type DefeatDropKind =
  | "trainingCrystals"
  | "evoStones"
  | "evolutionMaterialCharacters"
  | "skillMaterialCharacters";
type DefeatDrop = {
  kind: DefeatDropKind;
  chance: number;
  amount: number;
};
type RunLoot = Record<DefeatDropKind, number>;
type SkillEffect = {
  kind: "atk" | "def" | "spd" | "regen";
  scope: "self" | "party";
  multiplier?: number;
  amount?: number;
  duration: number;
};
type ActivePartyEffect = SkillEffect & {
  id: string;
  sourceCharacterId: string;
  remainingTurns: number;
};
type BattleDamageNumber = {
  amount: number;
  critical: boolean;
  stamp: number;
};
type PartyHpChange = {
  amount: number;
  kind: "damage" | "heal";
  stamp: number;
};
type Stats = {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  crit: number;
};
type Character = {
  id: string;
  name: string;
  role: string;
  element: string;
  rarity: Rarity;
  image: string;
  actionImage: string;
  motionSheet?: string;
  motionFrames?: string[];
  color: string;
  skill: string;
  skillKind: SkillKind;
  attackScope?: AttackScope;
  skillScope?: AttackScope;
  baseStats: Stats;
  source?: "gacha" | "dungeon" | "reward";
  archetype?: CombatArchetype;
  lore?: string;
  types?: UnitType[];
};
type CharacterSkill = {
  id: string;
  name: string;
  kind: CharacterSkillKind;
  scope: AttackScope;
  baseCooldown: number;
  power: number;
  description: string;
  effects?: SkillEffect[];
};

function normalizeElement(element: string): Element {
  if (element === "認識負荷" || element === "確認不可") return "認識負荷";
  if (/炎|火|煉獄/.test(element)) return "火";
  if (/水|氷|深海|海|雪/.test(element)) return "水";
  if (/森|木|風|土|花|砂/.test(element)) return "木";
  if (/光|聖|星|雷|機|時/.test(element)) return "光";
  if (/闇|深淵|月|幻|魔|妖|毒/.test(element)) return "闇";
  return "認識負荷";
}

const CHARACTER_TYPE_OVERRIDES: Record<string, UnitType[]> = {
  "ex-swamp": ["機械"],
  "ex-leopard": ["人間"],
  "ex-fox": ["人間"],
  deatharc: ["天使"],
  "umbrella-flare": ["機械", "龍"],
  "bakasu-mono": ["獣", "魔族"],
  suzunone: ["魔族"],
  "captain-nemo": ["人間"],
  "white-dragon-saint": ["龍", "天使"],
  "magic-knight": ["機械"],
  "inferno-dragonia": ["龍"],
  void: ["龍"],
  "red-hood": ["人間"],
  "mech-orca": ["機械", "獣"],
  "mech-narwhal": ["機械", "獣"],
  "mech-great-white": ["機械", "獣"],
  "mech-hammerhead": ["機械", "獣"],
  "mech-whale-shark": ["機械", "獣"],
  fritter: ["魔族"],
  "shadow-imp": ["魔族"],
  cracker: ["魔族", "獣"],
};

function inferCharacterTypes(character: Pick<Character, "name" | "role">): UnitType[] {
  const text = `${character.name}${character.role}`;
  const types: UnitType[] = [];
  if (/機械|機甲|機神|機兵|機巧|戦機|魔動|ドローン|ロボ|蒸気|機人形|天球機|機蠍|時計|ぜんまい/.test(text)) types.push("機械");
  if (/龍|竜|ドラゴン|ワイバーン/.test(text)) types.push("龍");
  if (/天使|セラフ|天翼|天槍/.test(text)) types.push("天使");
  if (/魔族|悪魔|魔王|冥界|妖魔|小魔|魔獣|吸血|妖(?!精)|鬼|亡霊|死霊|骸兵/.test(text)) types.push("魔族");
  if (/獣|狼|狐|狸|猫|豹|熊|鳥|魚|鯨|蛇|兎|蜘蛛|蠍|梟|鴉|鷹|鳳|犬|虎/.test(text)) types.push("獣");
  if (/精霊|妖精|花精|エレメンタル|スライム|ゴーレム/.test(text)) types.push("精霊");
  if (
    !types.length &&
    /剣士|騎士|戦士|術師|僧侶|姫|王女|神官|聖女|勇者|狩人|銃士|爪士|見習い|探検家|奏者|侍|忍者|博士|技師|砲士|海賊|錬金/.test(
      text,
    )
  )
    types.push("人間");
  const uniqueTypes = [...new Set(types)].slice(0, 2) as UnitType[];
  return uniqueTypes.length ? uniqueTypes : ["不明"];
}
type Enemy = {
  id?: string;
  name: string;
  maxHp: number;
  image: string;
  intent: string;
  hue?: number;
  characterId?: string;
  atk?: number;
  def?: number;
  spd?: number;
  element?: string;
  isBoss?: boolean;
};
type ResolvedEnemy = Enemy & {
  level: number;
  atk: number;
  def: number;
  spd: number;
  element: string;
  isBoss: boolean;
};
type WaveEnemy = ResolvedEnemy & {
  combatStyle: "standard" | "swift" | "armored" | "striker";
};
type Stage = {
  id: string;
  chapter: number;
  number: number;
  area: string;
  title: string;
  background: string;
  atmosphere?: string;
  recommended: number;
  scale: number;
  rule: string;
  gems: number;
  gold: number;
  enemies: Enemy[];
  kind?: "normal" | "event" | "strong" | "abyss" | "material";
  dropCharacterId?: string;
  dropCharacterPoolIds?: string[];
  firstClearRewardCharacterId?: string;
  dropRate?: number;
  rewardMode?: "chance" | "first-exchange";
  tokenReward?: number;
  unlockLevel?: number;
  playerXpReward?: number;
  trainingCrystalReward?: number;
  evoStoneReward?: number;
  difficultyLabel?:
    | "初級"
    | "中級"
    | "上級"
    | "実りの大地"
    | "白級"
    | "黒級"
    | "無級";
  normalDefeatDrops?: DefeatDrop[];
  bossDefeatDrops?: DefeatDrop[];
  dropPolicy?: "defeat-only";
  singleEnemyWaves?: boolean;
  reusesExistingBosses?: boolean;
  startingPartyHp?: number;
  enemyAttackMultiplier?: number;
  enemyDefenseMultiplier?: number;
  enemySpeedMultiplier?: number;
  gimmick?: {
    name: string;
    appliesToAllEnemies?: boolean;
    hpThreshold?: number;
    damageMultiplier?: number;
    doomTurn?: number;
    description: string;
  };
};
type ResolvedStage = Omit<Stage, "enemies"> & { enemies: ResolvedEnemy[] };
type Profile = {
  username: string;
  userId: string;
  gems: number;
  gold: number;
  pity: number;
  limitedPity: Record<string, number>;
  clears: number;
  teamLevel: number;
  playerLevel: number;
  playerXp: number;
  shards: number;
  trainingCrystals: number;
  evoStones: number;
  dragonHeadStones: number;
  crownStones: number;
  liberationBooks: number;
  evolutionMaterialCharacters: number;
  skillMaterialCharacters: number;
  abyssFloor: number;
  owned: string[];
  team: string[];
  parties: string[][];
  activePartyIndex: number;
  levels: Record<string, number>;
  evolutions: Record<string, number>;
  skillLevels: Record<string, number>;
  characterCopies: Record<string, number>;
  bossTokens: Record<string, number>;
  stageStars: Record<string, number>;
  bestTurns: Record<string, number>;
  stageCharacterClaims: string[];
  claimedBattleRuns: string[];
  equipmentInventory: Record<string, number>;
  equippedItems: Record<string, string>;
  dailyShopPurchases: string[];
  discoveredSynergyIds: string[];
  seVolume: number;
  usedCodes: string[];
  starterGiftClaimed: boolean;
  starterGiftCharacterId: string | null;
  rerollGiftClaimed: boolean;
};
type Battle = {
  phase: "combat" | "blessing" | "victory" | "defeat";
  stageId: string;
  partyIds: [string, string, string];
  wave: number;
  turn: number;
  totalTurns: number;
  enemyHps: number[];
  targetEnemyIndex: number;
  targetEnemyIndices: [number, number, number];
  selectedPartyIndex: number;
  hitEnemyIndices: number[];
  enemyDamageNumbers: Array<BattleDamageNumber | null>;
  partyHpChange: PartyHpChange | null;
  partyHp: number;
  cooldowns: [number[], number[], number[]];
  selectedSkillIndices: [number, number, number];
  runId: string;
  processedDefeatKeys: string[];
  runLoot: RunLoot;
  activePartyEffects: ActivePartyEffect[];
  synergyId: string | null;
  ultimate: number;
  actions: [BattleAction | null, BattleAction | null, BattleAction | null];
  activeActions: [BattleAction | null, BattleAction | null, BattleAction | null];
  animating: boolean;
  actingIndex: number;
  enemyActing: boolean;
  actingEnemyIndex: number;
  enemyMaxHps: number[];
  blessings: string[];
  message: string;
};

function useSessionState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  useEffect(() => {
    const saved = window.sessionStorage.getItem(key);
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved) as T;
        const frame = window.requestAnimationFrame(() => setValue(parsed));
        return () => window.cancelAnimationFrame(frame);
      } catch {
        window.sessionStorage.removeItem(key);
      }
    }
  }, [key]);
  const update: React.Dispatch<React.SetStateAction<T>> = (next) => {
    setValue((current) => {
      const resolved = typeof next === "function" ? (next as (value: T) => T)(current) : next;
      window.sessionStorage.setItem(key, JSON.stringify(resolved));
      return resolved;
    });
  };
  return [value, update] as const;
}

const CORE_ROSTER: Character[] = [
  {
    id: "ex-swamp",
    name: "機械戦士S.W.A.M.P",
    role: "城塞機兵",
    element: "機光",
    rarity: "EX",
    image: "/assets/ex-swamp.webp",
    actionImage: "/assets/ex-swamp.webp",
    color: "#58b9ff",
    skill: "イージス・オーバードライブ",
    skillKind: "guard",
    baseStats: { hp: 235, atk: 30, def: 47, spd: 14, crit: 5 },
    source: "reward",
    lore: "仲間を守るために起動した古代の重装機兵。圧倒的な耐久力で攻撃を受け止める。",
  },
  {
    id: "ex-leopard",
    name: "秘術師Leopard",
    role: "星環秘術師",
    element: "秘光",
    rarity: "EX",
    image: "/assets/ex-leopard.webp",
    actionImage: "/assets/ex-leopard.webp",
    color: "#756cff",
    skill: "アストラル・リカバリー",
    skillKind: "heal",
    baseStats: { hp: 155, atk: 25, def: 26, spd: 29, crit: 8 },
    source: "reward",
    lore: "無数の魔導書を同時に操る秘術師。回復と技能支援で長期戦を支配する。",
  },
  {
    id: "ex-fox",
    name: "旅終えし勇者F0X",
    role: "帰還勇者",
    element: "炎光",
    rarity: "EX",
    image: "/assets/ex-fox.webp",
    actionImage: "/assets/ex-fox.webp",
    color: "#f05b3f",
    skill: "終旅・暁天断",
    skillKind: "damage",
    baseStats: { hp: 175, atk: 47, def: 28, spd: 34, crit: 18 },
    source: "reward",
    lore: "世界の果てから帰還した歴戦の勇者。高い攻撃力と会心で戦いを決める。",
  },
  {
    id: "kai",
    name: "カイ",
    role: "炎剣士",
    element: "炎",
    rarity: "R",
    image: "/assets/kai.webp",
    actionImage: "/assets/kai-action.webp",
    color: "#e65b3e",
    skill: "炎剣",
    skillKind: "damage",
    baseStats: { hp: 125, atk: 29, def: 18, spd: 22, crit: 8 },
  },
  {
    id: "fina",
    name: "フィナ",
    role: "神官",
    element: "光",
    rarity: "R",
    image: "/assets/fina.webp",
    actionImage: "/assets/fina-action.webp",
    color: "#f1c65a",
    skill: "聖なる癒やし",
    skillKind: "heal",
    baseStats: { hp: 105, atk: 17, def: 17, spd: 25, crit: 6 },
  },
  {
    id: "puku",
    name: "プク",
    role: "タンク",
    element: "水",
    rarity: "R",
    image: "/assets/puku.webp",
    actionImage: "/assets/puku-action.webp",
    color: "#51bde8",
    skill: "ぷるぷる挑発",
    skillKind: "guard",
    baseStats: { hp: 165, atk: 14, def: 30, spd: 12, crit: 3 },
  },
  {
    id: "galm",
    name: "ガルム",
    role: "獣人格闘家",
    element: "風",
    rarity: "SR",
    image: "/assets/galm.webp",
    actionImage: "/assets/galm-action.webp",
    color: "#62c994",
    skill: "烈風連牙",
    skillKind: "damage",
    baseStats: { hp: 140, atk: 31, def: 19, spd: 29, crit: 12 },
  },
  {
    id: "grick",
    name: "グリック",
    role: "発明家",
    element: "炎",
    rarity: "SR",
    image: "/assets/grick.webp",
    actionImage: "/assets/grick-action.webp",
    color: "#e48945",
    skill: "火炎ボム",
    skillKind: "damage",
    attackScope: "all",
    skillScope: "all",
    baseStats: { hp: 110, atk: 34, def: 15, spd: 21, crit: 14 },
  },
  {
    id: "nia",
    name: "ニア",
    role: "妖精",
    element: "風",
    rarity: "SR",
    image: "/assets/nia.webp",
    actionImage: "/assets/nia-action.webp",
    color: "#77d8aa",
    skill: "妖精の祝福",
    skillKind: "heal",
    baseStats: { hp: 90, atk: 20, def: 14, spd: 35, crit: 10 },
  },
  {
    id: "selene",
    name: "セレーネ",
    role: "吸血魔剣士",
    element: "闇",
    rarity: "SSR",
    image: "/assets/selene.webp",
    actionImage: "/assets/selene-action.webp",
    color: "#a873d2",
    skill: "月蝕の魔刃",
    skillKind: "damage",
    baseStats: { hp: 130, atk: 39, def: 21, spd: 33, crit: 18 },
  },
  {
    id: "olt",
    name: "オルト",
    role: "古代ゴーレム",
    element: "光",
    rarity: "SSR",
    image: "/assets/olt.webp",
    actionImage: "/assets/olt-action.webp",
    color: "#d6bd6d",
    skill: "古代障壁",
    skillKind: "guard",
    baseStats: { hp: 210, atk: 25, def: 42, spd: 8, crit: 4 },
  },
  {
    id: "dram",
    name: "ドラム",
    role: "子竜",
    element: "炎",
    rarity: "SSR",
    image: "/assets/dram.webp",
    actionImage: "/assets/dram-action.webp",
    color: "#ef704d",
    skill: "ドラゴンブレス",
    skillKind: "damage",
    attackScope: "all",
    skillScope: "all",
    baseStats: { hp: 150, atk: 38, def: 24, spd: 27, crit: 13 },
  },
  {
    id: "deatharc",
    name: "静聖の彼方：デスアーク",
    role: "星界の審判者",
    element: "光闇",
    rarity: "SSR",
    image: "/assets/deatharc-v2.webp",
    actionImage: "/assets/deatharc-v2.webp",
    color: "#a996ff",
    skill: "静聖・終極天環",
    skillKind: "damage",
    skillScope: "all",
    baseStats: { hp: 168, atk: 43, def: 28, spd: 29, crit: 17 },
  },
  {
    id: "umbrella-flare",
    name: "妖機龍：アンブレラ・フレア",
    role: "妖機剣龍",
    element: "妖闇",
    rarity: "SSR",
    image: "/assets/umbrella-flare-v2.webp",
    actionImage: "/assets/umbrella-flare-v2.webp",
    color: "#b346f2",
    skill: "妖刃・紫焔連斬",
    skillKind: "damage",
    skillScope: "all",
    baseStats: { hp: 182, atk: 45, def: 30, spd: 31, crit: 16 },
  },
  {
    id: "bakasu-mono",
    name: "化かす者",
    role: "狸の妖",
    element: "幻",
    rarity: "SR",
    image: "/assets/bakasu-mono-v2.webp",
    actionImage: "/assets/bakasu-mono-v2.webp",
    color: "#d79555",
    skill: "宵化かし",
    skillKind: "guard",
    baseStats: { hp: 132, atk: 27, def: 24, spd: 34, crit: 13 },
  },
  {
    id: "suzunone",
    name: "鈴の音",
    role: "鈴妖",
    element: "月",
    rarity: "SSR",
    image: "/assets/suzunone-v2.webp",
    actionImage: "/assets/suzunone-v2.webp",
    color: "#c7d7e9",
    skill: "幽鈴の鎮魂歌",
    skillKind: "heal",
    baseStats: { hp: 145, atk: 31, def: 26, spd: 38, crit: 11 },
  },
  {
    id: "lyca",
    name: "リュカ",
    role: "風弓士",
    element: "風",
    rarity: "R",
    image: "/assets/lyca.webp",
    actionImage: "/assets/lyca.webp",
    color: "#66d882",
    skill: "リーフアロー",
    skillKind: "damage",
    baseStats: { hp: 102, atk: 26, def: 15, spd: 33, crit: 14 },
  },
  {
    id: "bramm",
    name: "ブラム",
    role: "盾鉱夫",
    element: "土",
    rarity: "R",
    image: "/assets/bramm.webp",
    actionImage: "/assets/bramm.webp",
    color: "#b87d45",
    skill: "岩盤防御",
    skillKind: "guard",
    baseStats: { hp: 174, atk: 19, def: 33, spd: 10, crit: 4 },
  },
  {
    id: "minoa",
    name: "ミノア",
    role: "水術見習い",
    element: "水",
    rarity: "R",
    image: "/assets/minoa.webp",
    actionImage: "/assets/minoa.webp",
    color: "#42bff5",
    skill: "アクアヒール",
    skillKind: "heal",
    baseStats: { hp: 96, atk: 22, def: 16, spd: 28, crit: 7 },
  },
  {
    id: "kohaku",
    name: "コハク",
    role: "狐剣士",
    element: "炎",
    rarity: "R",
    image: "/assets/kohaku.webp",
    actionImage: "/assets/kohaku.webp",
    color: "#f08032",
    skill: "狐火一閃",
    skillKind: "damage",
    baseStats: { hp: 118, atk: 28, def: 17, spd: 30, crit: 11 },
  },
  {
    id: "lulu",
    name: "ルル",
    role: "茸錬金術師",
    element: "毒",
    rarity: "R",
    image: "/assets/lulu.webp",
    actionImage: "/assets/lulu.webp",
    color: "#e45c48",
    skill: "元気ポーション",
    skillKind: "heal",
    baseStats: { hp: 108, atk: 19, def: 20, spd: 24, crit: 6 },
  },
  {
    id: "raizen",
    name: "ライゼン",
    role: "雷侍",
    element: "雷",
    rarity: "SR",
    image: "/assets/raizen.webp",
    actionImage: "/assets/raizen.webp",
    color: "#f2cb35",
    skill: "迅雷抜刀",
    skillKind: "damage",
    baseStats: { hp: 136, atk: 36, def: 22, spd: 36, crit: 16 },
  },
  {
    id: "mireille",
    name: "ミレイユ",
    role: "氷晶魔女",
    element: "氷",
    rarity: "SR",
    image: "/assets/mireille.webp",
    actionImage: "/assets/mireille.webp",
    color: "#83caff",
    skill: "氷華葬",
    skillKind: "damage",
    skillScope: "all",
    baseStats: { hp: 108, atk: 38, def: 17, spd: 27, crit: 14 },
  },
  {
    id: "guren",
    name: "グレン",
    role: "鬼槍僧",
    element: "炎",
    rarity: "SR",
    image: "/assets/guren.webp",
    actionImage: "/assets/guren.webp",
    color: "#ef442d",
    skill: "業火鬼槍",
    skillKind: "damage",
    baseStats: { hp: 162, atk: 37, def: 25, spd: 22, crit: 12 },
  },
  {
    id: "sylphie",
    name: "シルフィー",
    role: "天空騎士",
    element: "風",
    rarity: "SR",
    image: "/assets/sylphie.webp",
    actionImage: "/assets/sylphie.webp",
    color: "#8ee7ef",
    skill: "蒼穹の守り",
    skillKind: "guard",
    baseStats: { hp: 148, atk: 29, def: 30, spd: 32, crit: 9 },
  },
  {
    id: "noir",
    name: "ノワール",
    role: "傀儡師",
    element: "闇",
    rarity: "SR",
    image: "/assets/noir.webp",
    actionImage: "/assets/noir.webp",
    color: "#b350c9",
    skill: "紅糸乱舞",
    skillKind: "damage",
    skillScope: "all",
    baseStats: { hp: 112, atk: 35, def: 18, spd: 35, crit: 17 },
  },
  {
    id: "aster",
    name: "アステル",
    role: "聖銃士",
    element: "光",
    rarity: "SR",
    image: "/assets/aster.webp",
    actionImage: "/assets/aster.webp",
    color: "#efc856",
    skill: "星弾装填",
    skillKind: "damage",
    baseStats: { hp: 126, atk: 36, def: 20, spd: 30, crit: 18 },
  },
  {
    id: "amaterasu",
    name: "アマテラス",
    role: "陽炎の巫女",
    element: "陽",
    rarity: "SSR",
    image: "/assets/amaterasu.webp",
    actionImage: "/assets/amaterasu.webp",
    color: "#ff7132",
    skill: "天照九陽",
    skillKind: "heal",
    baseStats: { hp: 154, atk: 37, def: 25, spd: 37, crit: 13 },
  },
  {
    id: "leviathan",
    name: "レヴィアタン",
    role: "深海王",
    element: "水",
    rarity: "SSR",
    image: "/assets/leviathan.webp",
    actionImage: "/assets/leviathan.webp",
    color: "#1db8d2",
    skill: "蒼海龍葬",
    skillKind: "damage",
    attackScope: "all",
    skillScope: "all",
    baseStats: { hp: 198, atk: 42, def: 32, spd: 25, crit: 14 },
  },
  {
    id: "chronos",
    name: "クロノス",
    role: "時環騎士",
    element: "時",
    rarity: "SSR",
    image: "/assets/chronos.webp",
    actionImage: "/assets/chronos.webp",
    color: "#4c91ff",
    skill: "刻界断",
    skillKind: "damage",
    baseStats: { hp: 176, atk: 44, def: 31, spd: 34, crit: 16 },
  },
  {
    id: "yggdrasil",
    name: "ユグドラシル",
    role: "世界樹守",
    element: "森",
    rarity: "SSR",
    image: "/assets/yggdrasil.webp",
    actionImage: "/assets/yggdrasil.webp",
    color: "#76c950",
    skill: "世界樹の抱擁",
    skillKind: "guard",
    baseStats: { hp: 220, atk: 34, def: 44, spd: 18, crit: 8 },
  },
  {
    id: "captain-nemo",
    name: "未知を探索する者：キャプテン・ネモ",
    role: "深海探検家",
    element: "深海",
    rarity: "SSR",
    image: "/assets/captain-nemo.webp",
    actionImage: "/assets/captain-nemo.webp",
    color: "#27bada",
    skill: "ノーチラス・ハープーン",
    skillKind: "damage",
    baseStats: { hp: 165, atk: 43, def: 27, spd: 32, crit: 17 },
  },
  {
    id: "white-dragon-saint",
    name: "白龍の聖女",
    role: "白龍の女神",
    element: "聖",
    rarity: "EX",
    image: "/assets/white-dragon-saint.webp",
    actionImage: "/assets/white-dragon-saint.webp",
    color: "#fff0bd",
    skill: "白龍神域",
    skillKind: "heal",
    baseStats: { hp: 190, atk: 39, def: 36, spd: 35, crit: 12 },
  },
  {
    id: "magic-knight",
    name: "魔動騎士",
    role: "魔動甲冑",
    element: "魔",
    rarity: "SR",
    image: "/assets/magic-knight.webp",
    actionImage: "/assets/magic-knight.webp",
    color: "#806cff",
    skill: "魔導障壁陣",
    skillKind: "guard",
    baseStats: { hp: 190, atk: 30, def: 38, spd: 14, crit: 6 },
  },
  {
    id: "inferno-dragonia",
    name: "黒龍：インフェルノドラゴニア",
    role: "煉獄黒龍",
    element: "煉獄",
    rarity: "SSR",
    image: "/assets/inferno-dragonia.webp",
    actionImage: "/assets/inferno-dragonia.webp",
    color: "#ff4f27",
    skill: "黒炎獄界ブレス",
    skillKind: "damage",
    attackScope: "all",
    skillScope: "all",
    baseStats: { hp: 210, atk: 48, def: 34, spd: 26, crit: 18 },
  },
  {
    id: "momo",
    name: "モモ",
    role: "花精術師",
    element: "花",
    rarity: "R",
    image: "/assets/momo.webp",
    actionImage: "/assets/momo.webp",
    color: "#ff75ae",
    skill: "花吹雪の癒やし",
    skillKind: "heal",
    baseStats: { hp: 102, atk: 19, def: 16, spd: 31, crit: 8 },
  },
  {
    id: "theo",
    name: "テオ",
    role: "砂漠剣士",
    element: "砂",
    rarity: "R",
    image: "/assets/theo.webp",
    actionImage: "/assets/theo.webp",
    color: "#e8a349",
    skill: "蜃気楼斬り",
    skillKind: "damage",
    baseStats: { hp: 123, atk: 29, def: 18, spd: 28, crit: 12 },
  },
  {
    id: "neige",
    name: "ネージュ",
    role: "雪兎弓士",
    element: "氷",
    rarity: "R",
    image: "/assets/neige.webp",
    actionImage: "/assets/neige.webp",
    color: "#a5e7ff",
    skill: "白雪三連矢",
    skillKind: "damage",
    skillScope: "all",
    baseStats: { hp: 106, atk: 27, def: 16, spd: 35, crit: 14 },
  },
  {
    id: "polka",
    name: "ポルカ",
    role: "機鳥使い",
    element: "機",
    rarity: "R",
    image: "/assets/polka.webp",
    actionImage: "/assets/polka.webp",
    color: "#e4b558",
    skill: "クロックバード",
    skillKind: "guard",
    baseStats: { hp: 128, atk: 24, def: 23, spd: 30, crit: 10 },
  },
  {
    id: "zahara",
    name: "砂海銃士ザハラ",
    role: "魔導銃士",
    element: "砂雷",
    rarity: "SR",
    image: "/assets/zahara.webp",
    actionImage: "/assets/zahara.webp",
    color: "#f0aa43",
    skill: "デザート・レールガン",
    skillKind: "damage",
    baseStats: { hp: 142, atk: 38, def: 23, spd: 33, crit: 18 },
  },
  {
    id: "void",
    name: "暗黒龍：ヴォイド",
    role: "深淵終極龍",
    element: "深淵",
    rarity: "EX",
    image: "/assets/void-user-v2.webp",
    actionImage: "/assets/void-user-v2.webp",
    color: "#ff732e",
    skill: "奈落終焉",
    skillKind: "damage",
    attackScope: "all",
    skillScope: "all",
    baseStats: { hp: 240, atk: 49, def: 39, spd: 30, crit: 19 },
  },
];

const CORE_LIMITED_IDS = [
  "deatharc",
  "umbrella-flare",
  "captain-nemo",
  "inferno-dragonia",
] as const;
const CORE_LIMITED_ID_SET = new Set<string>(CORE_LIMITED_IDS);
const STARTER_EX_IDS = ["ex-swamp", "ex-leopard", "ex-fox"] as const;
const CORE_REWARD_IDS = new Set([
  ...STARTER_EX_IDS,
  "white-dragon-saint",
  "void",
]);
const RETAINED_CORE_CHARACTER_IDS = new Set([
  ...STARTER_EX_IDS,
  "deatharc",
  "umbrella-flare",
  "bakasu-mono",
  "suzunone",
  "captain-nemo",
  "white-dragon-saint",
  "magic-knight",
  "inferno-dragonia",
  "void",
]);
const CORE_CHARACTERS: Character[] = CORE_ROSTER.map((character) => ({
  ...character,
  source:
    character.source ??
    (CORE_REWARD_IDS.has(character.id) ? "reward" : "gacha"),
})).filter((character) => RETAINED_CORE_CHARACTER_IDS.has(character.id));

const ELEMENT_COLORS: Record<string, string> = {
  炎: "#ef6545",
  水: "#4ec3df",
  森: "#65cc89",
  風: "#72d7a5",
  土: "#b88451",
  雷: "#e8c73f",
  光: "#f1d36d",
  闇: "#9b6bd5",
  氷: "#8edffa",
  月: "#b9a2ed",
  星: "#78a9f5",
  機: "#7ec6cf",
  幻: "#cc79dd",
};

const ARCHETYPE_MODIFIERS: Record<CombatArchetype, Stats> = {
  balanced: { hp: 0, atk: 0, def: 0, spd: 0, crit: 0 },
  striker: { hp: -6, atk: 3, def: -2, spd: 2, crit: 3 },
  speed: { hp: -8, atk: 1, def: -2, spd: 5, crit: 2 },
  mage: { hp: -4, atk: 2, def: -1, spd: 1, crit: 1 },
  tank: { hp: 12, atk: -2, def: 3, spd: -4, crit: -3 },
  healer: { hp: 4, atk: -2, def: 1, spd: -1, crit: -2 },
  support: { hp: 8, atk: -1, def: 2, spd: -1, crit: -2 },
  bruiser: { hp: 8, atk: 1, def: 1, spd: -2, crit: 0 },
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

function getDesignedBaseStats(
  rarity: Rarity,
  archetype: CombatArchetype,
  index: number,
  source: "gacha" | "dungeon",
): Stats {
  const gachaBase: Record<Rarity, Stats> = {
    R: { hp: 120, atk: 26, def: 18, spd: 26, crit: 10 },
    SR: { hp: 152, atk: 36, def: 24, spd: 30, crit: 15 },
    SSR: { hp: 196, atk: 47, def: 33, spd: 35, crit: 19 },
    EX: { hp: 220, atk: 49, def: 39, spd: 35, crit: 20 },
  };
  const dungeonBase: Record<Rarity, Stats> = {
    R: { hp: 115, atk: 25, def: 19, spd: 22, crit: 7 },
    SR: { hp: 135, atk: 30, def: 23, spd: 24, crit: 10 },
    SSR: { hp: 158, atk: 36, def: 27, spd: 27, crit: 12 },
    EX: { hp: 190, atk: 41, def: 33, spd: 30, crit: 15 },
  };
  const ranges =
    source === "gacha"
      ? {
          R: { hp: [108, 132], atk: [24, 29], def: [16, 21], spd: [22, 31], crit: [7, 14] },
          SR: { hp: [142, 166], atk: [34, 39], def: [22, 27], spd: [26, 34], crit: [12, 18] },
          SSR: { hp: [186, 208], atk: [44, 50], def: [30, 36], spd: [31, 39], crit: [16, 21] },
          EX: { hp: [205, 240], atk: [46, 52], def: [35, 45], spd: [30, 40], crit: [17, 23] },
        }
      : {
          R: { hp: [103, 127], atk: [23, 27], def: [17, 22], spd: [18, 28], crit: [5, 11] },
          SR: { hp: [123, 149], atk: [28, 33], def: [21, 27], spd: [20, 30], crit: [8, 14] },
          SSR: { hp: [146, 176], atk: [34, 39], def: [25, 31], spd: [22, 33], crit: [10, 16] },
          EX: { hp: [180, 210], atk: [39, 44], def: [31, 37], spd: [26, 35], crit: [13, 18] },
        };
  const base = source === "gacha" ? gachaBase[rarity] : dungeonBase[rarity];
  const modifier = ARCHETYPE_MODIFIERS[archetype];
  const range = ranges[rarity];
  const hpVariance = ((index * 7) % 9) - 4;
  const atkVariance = ((index * 5) % 3) - 1;
  const defVariance = ((index * 7) % 3) - 1;
  const spdVariance = ((index * 11) % 3) - 1;
  const critVariance = ((index * 13) % 3) - 1;
  return {
    hp: clamp(base.hp + modifier.hp + hpVariance, range.hp[0], range.hp[1]),
    atk: clamp(base.atk + modifier.atk + atkVariance, range.atk[0], range.atk[1]),
    def: clamp(base.def + modifier.def + defVariance, range.def[0], range.def[1]),
    spd: clamp(base.spd + modifier.spd + spdVariance, range.spd[0], range.spd[1]),
    crit: clamp(base.crit + modifier.crit + critVariance, range.crit[0], range.crit[1]),
  };
}

const GACHA_WAVE_ONE_DATA = [
  [
    "flam",
    "フラム",
    "炎の見習い",
    "炎",
    "R",
    "gacha1-flam.webp",
    "#ef633c",
    "火走り剣",
    "damage",
  ],
  [
    "aqua",
    "アクア",
    "泡術師",
    "水",
    "R",
    "gacha1-aqua.webp",
    "#4fc8f2",
    "バブルヒール",
    "heal",
  ],
  [
    "seed",
    "シード",
    "森の爪士",
    "森",
    "R",
    "gacha1-seed.webp",
    "#69c85d",
    "若葉裂き",
    "damage",
  ],
  [
    "lux",
    "ルクス",
    "灯光神官",
    "光",
    "R",
    "gacha1-lux.webp",
    "#f2d36b",
    "灯火の祈り",
    "heal",
  ],
  [
    "nox",
    "ノクス",
    "宵闇盗賊",
    "闇",
    "R",
    "gacha1-nox.webp",
    "#9b68d7",
    "影双刃",
    "damage",
  ],
  [
    "haru",
    "ハル",
    "風便士",
    "風",
    "R",
    "gacha1-haru.webp",
    "#63d59a",
    "風輪投げ",
    "damage",
  ],
  [
    "gante",
    "ガンテ",
    "岩窟鉱士",
    "土",
    "R",
    "gacha1-gante.webp",
    "#b67a43",
    "鉱石ガード",
    "guard",
  ],
  [
    "mint",
    "ミント",
    "薬草錬金術師",
    "森",
    "R",
    "gacha1-mint.webp",
    "#91d95f",
    "特製回復薬",
    "heal",
  ],
  [
    "rock",
    "ロック",
    "鉄盾兵",
    "鉄",
    "R",
    "gacha1-rock.webp",
    "#9faeba",
    "スクエアウォール",
    "guard",
  ],
  [
    "pipi",
    "ピピ",
    "鳥笛奏者",
    "風",
    "R",
    "gacha1-pipi.webp",
    "#e4be55",
    "追い風の笛",
    "heal",
  ],
  [
    "sora",
    "ソラ",
    "空艇槍士",
    "空",
    "R",
    "gacha1-sora.webp",
    "#72cbe7",
    "雲突き",
    "damage",
  ],
  [
    "nagi",
    "ナギ",
    "札術見習い",
    "霊",
    "R",
    "gacha1-nagi.webp",
    "#d9c7a2",
    "退魔札",
    "guard",
  ],
  [
    "io",
    "イオ",
    "魔導整備士",
    "機",
    "R",
    "gacha1-io.webp",
    "#65c7cb",
    "オーバーチューン",
    "guard",
  ],
  [
    "tina",
    "ティナ",
    "火輪舞姫",
    "炎",
    "R",
    "gacha1-tina.webp",
    "#f06b55",
    "紅輪舞",
    "damage",
  ],
  [
    "volt",
    "ボルト",
    "雷鼠拳士",
    "雷",
    "R",
    "gacha1-volt.webp",
    "#f1cf42",
    "スパークナックル",
    "damage",
  ],
  [
    "kukul",
    "ククル",
    "月猫術師",
    "月",
    "R",
    "gacha1-kukul.webp",
    "#b8a1eb",
    "三日月バリア",
    "guard",
  ],
  [
    "adel",
    "紅蓮騎士アデル",
    "紅蓮騎士",
    "炎",
    "SR",
    "gacha1-adel.webp",
    "#f05035",
    "紅蓮十字斬",
    "damage",
  ],
  [
    "mare",
    "蒼潮術師マレ",
    "潮流賢者",
    "水",
    "SR",
    "gacha1-mare.webp",
    "#35bdda",
    "大海嘯陣",
    "heal",
  ],
  [
    "gaia",
    "森羅拳士ガイア",
    "森羅拳士",
    "森",
    "SR",
    "gacha1-gaia.webp",
    "#5fc063",
    "森羅百裂",
    "damage",
  ],
  [
    "tsukuyo",
    "月鏡巫女ツクヨ",
    "月鏡巫女",
    "月",
    "SR",
    "gacha1-tsukuyo.webp",
    "#d7c8f3",
    "月鏡結界",
    "guard",
  ],
  [
    "van",
    "雷装銃士ヴァン",
    "雷装銃士",
    "雷",
    "SR",
    "gacha1-van.webp",
    "#e9c43d",
    "電磁貫通弾",
    "damage",
  ],
  [
    "freya",
    "氷刃姫フレイヤ",
    "氷刃姫",
    "氷",
    "SR",
    "gacha1-freya.webp",
    "#8bd8fa",
    "永久氷刃",
    "damage",
  ],
  [
    "noah",
    "機巧博士ノア",
    "機巧博士",
    "機",
    "SR",
    "gacha1-noah.webp",
    "#8c88d8",
    "守護ドローン",
    "guard",
  ],
  [
    "lute",
    "竜笛奏者リュート",
    "竜笛奏者",
    "竜",
    "SR",
    "gacha1-lute.webp",
    "#dd7653",
    "竜魂の旋律",
    "heal",
  ],
  [
    "astrea",
    "星天女王アストレア",
    "星天女王",
    "星",
    "SSR",
    "gacha1-astrea.webp",
    "#f2cc70",
    "星界王護",
    "guard",
  ],
] as const;

const GACHA_WAVE_ONE: Character[] = GACHA_WAVE_ONE_DATA.map(
  (
    [id, name, role, element, rarity, image, color, skill, skillKind],
    index,
  ) => {
    const revision = WAVE_ONE_REVISIONS.find((unit) => unit.id === id);
    const resolvedSkillKind = (revision?.skillKind ?? skillKind) as SkillKind;
    return {
      id: `wave1-${id}`,
      name: revision?.name ?? name,
      role: revision?.role ?? role,
      element: revision?.element ?? element,
      rarity,
      image: `/assets/${image}`,
      actionImage: `/assets/${image}`,
      color,
      skill: revision?.skill ?? skill,
      skillKind: resolvedSkillKind,
      attackScope:
        revision?.attackScope === "all" ||
        (!revision && resolvedSkillKind === "damage" && /砲|爆|嵐/.test(role))
          ? "all"
          : undefined,
      skillScope:
        revision?.skillScope === "all" ||
        (!revision &&
          resolvedSkillKind === "damage" &&
          /爆|嵐|吹雪|流星|氷刃|雷陣/.test(skill))
          ? "all"
          : undefined,
      source: "gacha",
      archetype: revision?.archetype,
      baseStats:
        revision?.baseStats ??
        (rarity === "SSR"
          ? { hp: 188, atk: 46, def: 32, spd: 35, crit: 19 }
          : rarity === "SR"
            ? {
                hp: 142 + (index % 3) * 8,
                atk: 34 + (index % 5),
                def: 22 + (index % 4),
                spd: 27 + (index % 7),
                crit: 12 + (index % 6),
              }
            : {
                hp: 108 + (index % 4) * 6,
                atk: 24 + (index % 5),
                def: 16 + (index % 5),
                spd: 22 + (index % 9),
                crit: 7 + (index % 7),
              }),
    };
  },
);

const RETAINED_EXPANDED_GACHA_IDS = new Set([
  ...Array.from({ length: 5 }, (_, index) =>
    `wave2-${String(index + 1).padStart(2, "0")}`,
  ),
  ...Array.from({ length: 25 }, (_, index) =>
    `wave4-${String(index + 1).padStart(2, "0")}`,
  ),
]);

const GACHA_WAVES_TWO_TO_FOUR: Character[] = EXPANDED_GACHA_DESIGNS.map(
  (design, index): Character => {
    const batch = Math.floor(index / 25) + 2;
    const cell = index % 25;
    const id = `wave${batch}-${String(cell + 1).padStart(2, "0")}`;
    const rarity = design.rarity as Rarity;
    const skillKind = (id === "wave4-25"
      ? "heal"
      : design.skillKind) as SkillKind;
    const image =
      batch === 2 && cell < 5
        ? `/assets/gacha-b2-${String(cell + 1).padStart(2, "0")}-v2.webp`
        : `/assets/gacha-b${batch}-${String(cell + 1).padStart(2, "0")}.webp`;
    return {
      id,
      name: design.name,
      role: design.role,
      element: design.element,
      rarity,
      image,
      actionImage: image,
      color: ELEMENT_COLORS[design.element] ?? `hsl(${(index * 47) % 360} 72% 62%)`,
      skill: design.skill,
      skillKind,
      attackScope: design.attackScope === "all" ? "all" : undefined,
      skillScope:
        skillKind === "damage" && design.skillScope === "all"
          ? "all"
          : undefined,
      source: "gacha",
      archetype: design.archetype,
      lore: design.lore,
      baseStats: getDesignedBaseStats(
        rarity,
        design.archetype,
        index,
        "gacha",
      ),
    };
  },
).filter((character) => RETAINED_EXPANDED_GACHA_IDS.has(character.id));

const FEATURED_NEW_CHARACTERS: Character[] = [
  {
    id: "red-hood",
    name: "赤ずきん",
    role: "紅森狩人",
    element: "炎",
    rarity: "SSR",
    image: "/assets/red-hood.webp",
    actionImage: "/assets/red-hood.webp",
    color: "#e6403c",
    skill: "紅月・狼狩り",
    skillKind: "damage",
    source: "gacha",
    lore: "魔の森を単独で渡り歩く紅衣の狩人。獣種への鋭い一撃を得意とする。",
    baseStats: { hp: 174, atk: 45, def: 27, spd: 37, crit: 20 },
  },
  {
    id: "mech-orca",
    name: "海獣戦機：O.R.C.A.",
    role: "海域強襲機",
    element: "水炎",
    rarity: "SSR",
    image: "/assets/mech-orca.webp",
    actionImage: "/assets/mech-orca.webp",
    color: "#ff553d",
    skill: "アビス・ラムジェット",
    skillKind: "damage",
    skillScope: "all",
    source: "dungeon",
    lore: "深海戦線の主力として建造された海獣型決戦兵器。炎熱魚雷で敵陣を突破する。",
    baseStats: { hp: 193, atk: 41, def: 34, spd: 31, crit: 14 },
  },
  {
    id: "mech-narwhal",
    name: "海獣戦機：N.A.R.W.H.A.L.",
    role: "蒼角貫通機",
    element: "水光",
    rarity: "SSR",
    image: "/assets/mech-narwhal.webp",
    actionImage: "/assets/mech-narwhal.webp",
    color: "#5dcfff",
    skill: "蒼角・海天穿孔",
    skillKind: "damage",
    source: "dungeon",
    lore: "水流を束ねる超長距離突撃機。一本角に集めた圧力で装甲を貫く。",
    baseStats: { hp: 181, atk: 43, def: 30, spd: 34, crit: 17 },
  },
  {
    id: "mech-great-white",
    name: "海魚戦機：G.R.E.A.T_W.H.I.T.E_S.H.A.R.K.",
    role: "白鋼捕食機",
    element: "水",
    rarity: "SR",
    image: "/assets/mech-great-white.webp",
    actionImage: "/assets/mech-great-white.webp",
    color: "#728ba8",
    skill: "ホワイト・バイト",
    skillKind: "damage",
    source: "dungeon",
    lore: "獲物の魔力反応を追跡する白鋼の海魚戦機。接近戦で真価を発揮する。",
    baseStats: { hp: 158, atk: 36, def: 27, spd: 30, crit: 15 },
  },
  {
    id: "mech-hammerhead",
    name: "海魚戦機：H.A.M.M.E.R.H.E.A.D_S.H.A.R.K.",
    role: "双極探査機",
    element: "水雷",
    rarity: "R",
    image: "/assets/mech-hammerhead.webp",
    actionImage: "/assets/mech-hammerhead.webp",
    color: "#82b8e8",
    skill: "双槌ソナー",
    skillKind: "guard",
    source: "dungeon",
    lore: "広域探査用の双極センサーを備えた索敵機。味方を守りながら敵の隙を暴く。",
    baseStats: { hp: 136, atk: 24, def: 27, spd: 25, crit: 8 },
  },
  {
    id: "mech-whale-shark",
    name: "海魚戦機：W.H.A.L.E_S.H.A.R.K",
    role: "巨鯨護送機",
    element: "水機",
    rarity: "SSR",
    image: "/assets/mech-whale-shark.webp",
    actionImage: "/assets/mech-whale-shark.webp",
    color: "#309ad4",
    skill: "ブルー・バルクヘッド",
    skillKind: "guard",
    source: "dungeon",
    lore: "大部隊の護送を担う超大型海魚戦機。重装甲と自己修復機構を持つ。",
    baseStats: { hp: 218, atk: 31, def: 42, spd: 16, crit: 7 },
  },
  {
    id: "fritter",
    name: "フリッター",
    role: "紅翼小魔",
    element: "炎闇",
    rarity: "R",
    image: "/assets/fritter.webp",
    actionImage: "/assets/fritter.webp",
    color: "#db3c31",
    skill: "火花ひっかき",
    skillKind: "damage",
    source: "dungeon",
    lore: "火口の周囲を群れで飛ぶ小悪魔。小柄だが執拗な連撃を仕掛ける。",
    baseStats: { hp: 104, atk: 26, def: 15, spd: 35, crit: 11 },
  },
  {
    id: "shadow-imp",
    name: "シャドウインプ",
    role: "影爪悪魔",
    element: "闇",
    rarity: "SR",
    image: "/assets/shadow-imp.webp",
    actionImage: "/assets/shadow-imp.webp",
    color: "#a62d31",
    skill: "黒翼シャドウクロー",
    skillKind: "damage",
    source: "dungeon",
    lore: "影から影へ跳ぶ狩猟悪魔。素早さと会心に優れる。",
    baseStats: { hp: 137, atk: 35, def: 21, spd: 37, crit: 17 },
  },
  {
    id: "cracker",
    name: "クラッカー",
    role: "爆殻魔獣",
    element: "炎",
    rarity: "SR",
    image: "/assets/cracker.webp",
    actionImage: "/assets/cracker.webp",
    color: "#f05a32",
    skill: "デモニック・バースト",
    skillKind: "guard",
    attackScope: "all",
    source: "dungeon",
    lore: "衝撃を殻へ蓄え、限界時に爆発させる魔獣。防御からの反撃を得意とする。",
    baseStats: { hp: 169, atk: 30, def: 34, spd: 18, crit: 9 },
  },
];

const CHARACTER_ASSET_VERSION = "20260904-motion-v2";
const ELITE_MOTION_CHARACTER_IDS = new Set([
  "ex-swamp",
  "ex-leopard",
  "ex-fox",
  "deatharc",
  "umbrella-flare",
  "suzunone",
  "captain-nemo",
  "white-dragon-saint",
  "inferno-dragonia",
  "void",
  "wave1-astrea",
  "wave4-24",
  "wave4-25",
  "red-hood",
  "mech-orca",
  "mech-narwhal",
  "mech-whale-shark",
  "dungeon-070",
  "dungeon-093",
  "dungeon-094",
  "dungeon-095",
  "dungeon-096",
  "dungeon-098",
  "dungeon-099",
  "dungeon-100",
  "dungeon-105",
  "p4-regulus",
  "p4-revelle",
  "p4-aion",
  "p4-masquerade",
]);
const versionCharacterAsset = (source: string) =>
  source.startsWith("/assets/") &&
  !source.includes(`v=${CHARACTER_ASSET_VERSION}`)
    ? `${source}${source.includes("?") ? "&" : "?"}v=${CHARACTER_ASSET_VERSION}`
    : source;
const versionCharacter = (character: Character): Character => ({
  ...character,
  element: normalizeElement(character.element),
  types: CHARACTER_TYPE_OVERRIDES[character.id] ?? (character.types?.length ? character.types : inferCharacterTypes(character)),
  image: versionCharacterAsset(character.image),
  actionImage: versionCharacterAsset(character.actionImage),
  motionSheet: ELITE_MOTION_CHARACTER_IDS.has(character.id)
    ? undefined
    : character.motionSheet,
  motionFrames: ELITE_MOTION_CHARACTER_IDS.has(character.id)
    ? Array.from({ length: 6 }, (_, index) =>
        versionCharacterAsset(
          `/assets/motion-frames/${character.id}/frame-${index + 1}.webp`,
        ),
      )
    : character.motionFrames,
});

const RED_HOOD = FEATURED_NEW_CHARACTERS[0];
export function getExCutinImage(characterId: string) {
  const filename = characterId === "void" ? "void-user-v2" : characterId;
  return `/assets/ex-cutins/${filename}.webp`;
}
const GACHA_RATES = {
  SSR: 0.02,
  SR: 0.17,
  R: 0.81,
} as const;
const LUCKY_BURNS: Character = {
  id: LUCKY_BURNS_ID,
  name: "ラッキーバーンズ",
  role: "魅惑の闘士",
  element: "火",
  rarity: "SSR",
  image: LUCKY_BURNS_IMAGES[0],
  actionImage: LUCKY_BURNS_VISUALS[0].motionFrames[0],
  motionFrames: [...LUCKY_BURNS_VISUALS[0].motionFrames],
  color: "#e74d43",
  skill: "ラッキー・マッスルバーン",
  skillKind: "damage",
  source: "gacha",
  archetype: "bruiser",
  types: ["人間"],
  lore: "誰もが見惚れる色気、誰もが見惚れる筋肉、誰もが見惚れる美貌。出撃ごとに11種類の姿からランダムで登場。見た目による能力の違いはありません。",
  baseStats: getDesignedBaseStats("SSR", "bruiser", 0, "gacha"),
};
const STANDARD_GACHA_POOL = [
  ...CORE_CHARACTERS.filter(
    (unit) =>
      unit.source === "gacha" &&
      !CORE_LIMITED_ID_SET.has(unit.id),
  ),
  ...GACHA_WAVE_ONE,
  ...GACHA_WAVES_TWO_TO_FOUR,
  RED_HOOD,
  ...PHASE4_CHARACTERS.filter((unit) => unit.rarity === "SSR"),
  LUCKY_BURNS,
].map(versionCharacter);
const GACHA_SERIES_COUNT = Math.max(
  1,
  Math.min(
    4,
    ...(["R", "SR", "SSR"] as Rarity[]).map(
      (rarity) =>
        STANDARD_GACHA_POOL.filter((unit) => unit.rarity === rarity).length,
    ),
  ),
);
const GACHA_SERIES: Character[][] = Array.from(
  { length: GACHA_SERIES_COUNT },
  () => [],
);
(["R", "SR", "SSR"] as Rarity[]).forEach((rarity) => {
  STANDARD_GACHA_POOL.filter((unit) => unit.rarity === rarity).forEach(
    (unit, index) => GACHA_SERIES[index % GACHA_SERIES.length].push(unit),
  );
});

const RETAINED_DUNGEON_NUMBERS = new Set([
  ...Array.from({ length: 7 }, (_, index) => index + 26),
  ...Array.from({ length: 50 }, (_, index) => index + 51),
  105,
]);

const DESIGNED_DUNGEON_CHARACTERS: Character[] = DUNGEON_CHARACTER_DESIGNS.map(
  (design, index): Character => {
    const rarity: Rarity =
      (design.rarity as Rarity | undefined) ??
      (index % 23 === 0 ? "SSR" : index % 4 === 0 ? "SR" : "R");
    const skillKind = (design.skillKind ?? "damage") as SkillKind;
    const image = versionCharacterAsset(
      `/assets/dungeon-${String(index + 1).padStart(3, "0")}.webp`,
    );
    return {
      id: `dungeon-${String(index + 1).padStart(3, "0")}`,
      name: design.name,
      role: design.role,
      element: design.element,
      rarity,
      image,
      actionImage: image,
      color: ELEMENT_COLORS[design.element] ?? `hsl(${(index * 43) % 360} 68% 58%)`,
      skill: design.skill,
      skillKind,
      attackScope: design.attackScope === "all" ? "all" : undefined,
      skillScope:
        skillKind === "damage" && design.skillScope === "all"
          ? "all"
          : undefined,
      source: "dungeon",
      archetype: design.archetype,
      lore: design.lore,
      baseStats: getDesignedBaseStats(
        rarity,
        design.archetype,
        index,
        "dungeon",
      ),
    };
  },
);
const DUNGEON_CHARACTERS = DESIGNED_DUNGEON_CHARACTERS.filter((_, index) => RETAINED_DUNGEON_NUMBERS.has(index + 1));
const ADDITIONAL_DUNGEON_CHARACTERS = DESIGNED_DUNGEON_CHARACTERS.filter((_, index) => index === 32 || index === 33);

const ROSTER: Character[] = [
  ...CORE_CHARACTERS,
  ...GACHA_WAVE_ONE,
  ...GACHA_WAVES_TWO_TO_FOUR,
  ...FEATURED_NEW_CHARACTERS,
  ...DUNGEON_CHARACTERS,
  ...PHASE4_CHARACTERS,
  ...ADDITIONAL_DUNGEON_CHARACTERS,
  LUCKY_BURNS,
].map(versionCharacter);

const LIMITED_IDS: readonly string[] = CORE_LIMITED_IDS;
const CHARACTER_BY_ID = new Map(
  ROSTER.map((character) => [character.id, character] as const),
);

function requireCharacter(characterId: string): Character {
  const character = CHARACTER_BY_ID.get(characterId);
  if (!character) throw new Error(`Unknown character id: ${characterId}`);
  return character;
}

function resolveProfileCharacterVisual(
  character: Character,
  profile: Pick<Profile, "evolutions">,
  appearanceRunId?: string,
): Character {
  if (character.id === LUCKY_BURNS_ID) return resolveRunAppearance(character, appearanceRunId);
  return resolveEvolutionVisual(
    character,
    profile.evolutions[character.id] ?? 0,
  );
}

function getThemedDungeonCharacter(
  anchor: Character,
  seed: number,
  includeAnchor = false,
): Character {
  const elemental = DUNGEON_CHARACTERS.filter(
    (unit) =>
      (unit.element === anchor.element ||
        unit.element.includes(anchor.element) ||
        anchor.element.includes(unit.element)) &&
      (includeAnchor || unit.id !== anchor.id),
  );
  const pool = elemental.length ? elemental : DUNGEON_CHARACTERS;
  return pool[((seed % pool.length) + pool.length) % pool.length];
}

function cycleCharacterIds(
  characters: readonly Character[],
  length: number,
  offset = 0,
) {
  return Array.from(
    { length },
    (_, index) => characters[(index + offset) % characters.length].id,
  );
}

const NORMAL_DUNGEON_REWARD_IDS = cycleCharacterIds(
  DUNGEON_CHARACTERS,
  50,
);
const EVENT_DUNGEON_REWARD_IDS = cycleCharacterIds(
  DUNGEON_CHARACTERS,
  50,
  8,
);
const STRONG_DUNGEON_REWARD_IDS = DUNGEON_CHARACTERS.filter(
  (character) => character.rarity === "SSR",
)
  .slice(-7)
  .map((character) => character.id);
const STRONG_NAMES = STRONG_DUNGEON_REWARD_IDS.map(
  (characterId) => requireCharacter(characterId).name,
);
const ROTATION_START = Date.UTC(2026, 8, 1);
const ROTATION_MS = 14 * 24 * 60 * 60 * 1000;
function getLimitedRotation(now = Date.now()) {
  const rotation = Math.max(
    0,
    Math.floor((now - ROTATION_START) / ROTATION_MS),
  );
  const featuredId = LIMITED_IDS[rotation % LIMITED_IDS.length];
  const nextId = LIMITED_IDS[(rotation + 1) % LIMITED_IDS.length];
  return {
    key: featuredId,
    featured: ROSTER.find((character) => character.id === featuredId)!,
    next: ROSTER.find((character) => character.id === nextId)!,
    endsAt: new Date(ROTATION_START + (rotation + 1) * ROTATION_MS),
  };
}
const ELEMENT_ROTATION = ["火", "水", "木", "光", "闇"].filter(
  (element) =>
    (["R", "SR", "SSR"] as Rarity[]).every((rarity) =>
      STANDARD_GACHA_POOL.some(
        (character) =>
          character.rarity === rarity && character.element.includes(element),
      ),
    ),
);
const ROLE_ROTATION: SkillKind[] = ([
  "damage",
  "guard",
  "heal",
] as SkillKind[]).filter((skillKind) =>
  (["R", "SR", "SSR"] as Rarity[]).every((rarity) =>
    STANDARD_GACHA_POOL.some(
      (character) =>
        character.rarity === rarity && character.skillKind === skillKind,
    ),
  ),
);
function getSpecialRotation(now = Date.now()) {
  const rotation = Math.max(
    0,
    Math.floor((now - ROTATION_START) / EVENT_ROTATION_MS),
  );
  return {
    element: ELEMENT_ROTATION[rotation % ELEMENT_ROTATION.length],
    role: ROLE_ROTATION[rotation % ROLE_ROTATION.length],
    endsAt: new Date(ROTATION_START + (rotation + 1) * EVENT_ROTATION_MS),
  };
}

function getCharacterStats(
  character: Character,
  level: number,
  evolution: number,
): Stats {
  const stats = {
    hp: character.baseStats.hp + level * 6 + evolution * 35,
    atk: character.baseStats.atk + level * 2 + evolution * 9,
    def: character.baseStats.def + level + evolution * 7,
    spd: character.baseStats.spd + Math.floor(level / 5) + evolution * 2,
    crit: Math.min(35, character.baseStats.crit + evolution * 3),
  };
  if (!CORE_LIMITED_ID_SET.has(character.id)) return stats;
  return {
    hp: Math.round(stats.hp * 1.1),
    atk: Math.round(stats.atk * 1.1),
    def: Math.round(stats.def * 1.1),
    spd: stats.spd + 2,
    crit: Math.min(35, stats.crit + 2),
  };
}

type UniqueAwakening = {
  name: string;
  description: string;
  partyStat?: "hp" | "atk" | "def";
  partyMultiplier?: number;
  selfAtkMultiplier?: number;
  selfSpeedBonus?: number;
};

function getUniqueAwakening(character: Character, evolution = 12): UniqueAwakening {
  const signature = [...character.id].reduce(
    (total, letter) => total + letter.charCodeAt(0),
    0,
  );
  const crowned = evolution >= 12;
  const partyPercent = crowned ? 12 : 8;
  const selfPercent = crowned ? 20 : 15;
  const speedBonus = crowned ? 8 : 5;
  const name = `${character.skill}の真髄${crowned ? "・極" : ""}`;
  switch (signature % 4) {
    case 0:
      return {
        name,
        description: `編成した味方全員の攻撃力を${partyPercent}%上昇`,
        partyStat: "atk",
        partyMultiplier: 1 + partyPercent / 100,
      };
    case 1:
      return {
        name,
        description: `編成した味方全員の防御力を${partyPercent}%上昇`,
        partyStat: "def",
        partyMultiplier: 1 + partyPercent / 100,
      };
    case 2:
      return {
        name,
        description: `編成した味方全員の最大HPを${partyPercent}%上昇`,
        partyStat: "hp",
        partyMultiplier: 1 + partyPercent / 100,
      };
    default:
      return {
        name,
        description: `自身の攻撃力を${selfPercent}%上昇し、速度を${speedBonus}上昇`,
        selfAtkMultiplier: 1 + selfPercent / 100,
        selfSpeedBonus: speedBonus,
      };
  }
}

function getBattlePartyStats(
  party: Character[],
  profile: Profile,
  activeEffects: ActivePartyEffect[] = [],
  synergy: PartySynergy | null = getActivePartySynergy(
    party.map((character) => character.id),
  ),
): Stats[] {
  const stats = party.map((character) => {
    const baseStats = getCharacterStats(
      character,
      profile.levels[character.id] ?? 1,
      profile.evolutions[character.id] ?? 0,
    );
    const item = EQUIPMENT_BY_ID.get(profile.equippedItems[character.id] ?? "");
    return item && isEquipmentCompatible(character.types ?? ["不明"], item)
      ? applyEquipmentBonuses(baseStats, item)
      : baseStats;
  });
  party.forEach((character, ownerIndex) => {
    const evolution = profile.evolutions[character.id] ?? 0;
    if (evolution < 12) return;
    const awakening = getUniqueAwakening(character, evolution);
    if (awakening.partyStat && awakening.partyMultiplier) {
      stats.forEach((memberStats) => {
        memberStats[awakening.partyStat!] = Math.round(
          memberStats[awakening.partyStat!] * awakening.partyMultiplier!,
        );
      });
    }
    if (awakening.selfAtkMultiplier)
      stats[ownerIndex].atk = Math.round(
        stats[ownerIndex].atk * awakening.selfAtkMultiplier,
      );
    if (awakening.selfSpeedBonus)
      stats[ownerIndex].spd += awakening.selfSpeedBonus;
  });
  if (
    synergy &&
    synergy.memberIds.every((memberId) =>
      party.some((character) => character.id === memberId),
    )
  ) {
    stats.forEach((memberStats) => {
      memberStats.hp = Math.round(
        memberStats.hp * (synergy.bonuses.hpMultiplier ?? 1),
      );
      memberStats.atk = Math.round(
        memberStats.atk * (synergy.bonuses.atkMultiplier ?? 1),
      );
      memberStats.def = Math.round(
        memberStats.def * (synergy.bonuses.defMultiplier ?? 1),
      );
      memberStats.spd = Math.max(
        1,
        Math.round(memberStats.spd * (synergy.bonuses.spdMultiplier ?? 1)),
      );
    });
  }
  activeEffects.forEach((effect) => {
    if (effect.kind === "regen") return;
    const statKind: "atk" | "def" | "spd" = effect.kind;
    stats.forEach((memberStats, memberIndex) => {
      if (
        effect.scope === "self" &&
        party[memberIndex].id !== effect.sourceCharacterId
      )
        return;
      if (statKind === "spd")
        memberStats.spd = Math.max(
          1,
          Math.round(memberStats.spd * (effect.multiplier ?? 1)),
        );
      else
        memberStats[statKind] = Math.max(
          1,
          Math.round(memberStats[statKind] * (effect.multiplier ?? 1)),
        );
    });
  });
  return stats;
}

export function getCharacterSkills(
  character: Character,
  evolution: number,
): CharacterSkill[] {
  const upgradeTier =
    evolution >= 18 ? 3 : evolution >= 12 ? 2 : evolution >= 6 ? 1 : 0;
  const suffix =
    upgradeTier === 3
      ? "・超越"
      : upgradeTier === 2
        ? "・極"
        : upgradeTier === 1
          ? "・改"
          : "";
  const baseCooldown =
    character.skillKind === "damage"
      ? character.skillScope === "all"
        ? 8
        : 6
      : 7;
  const primaryPower = [1, 1.16, 1.32, 1.5][upgradeTier];
  const primary: CharacterSkill = {
    id: `${character.id}-primary`,
    name: `${character.skill}${suffix}`,
    kind: character.skillKind,
    scope: character.skillScope ?? "single",
    baseCooldown,
    power: primaryPower,
    description:
      character.skillKind === "damage"
        ? `敵${character.skillScope === "all" ? "全体" : "単体"}に${upgradeTier === 3 ? "超越" : "強力な"}ダメージ`
        : character.skillKind === "heal"
          ? upgradeTier === 3
            ? "味方パーティーのHPを大きく回復"
            : "味方パーティーのHPを回復"
          : upgradeTier === 3
            ? "敵の攻撃を極限まで軽減"
            : "敵の攻撃を大きく軽減",
    effects:
      evolution < 12
        ? undefined
        : character.skillKind === "damage"
          ? [
              {
                kind: "atk",
                scope: "self",
                multiplier: upgradeTier === 3 ? 1.18 : 1.1,
                duration: upgradeTier === 3 ? 3 : 2,
              },
            ]
          : character.skillKind === "heal"
            ? [
                {
                  kind: "regen",
                  scope: "party",
                  amount: upgradeTier === 3 ? 5 : 3,
                  duration: upgradeTier === 3 ? 3 : 2,
                },
              ]
            : [
                {
                  kind: "def",
                  scope: "party",
                  multiplier: upgradeTier === 3 ? 1.18 : 1.1,
                  duration: upgradeTier === 3 ? 3 : 2,
                },
              ],
  };
  if (evolution < 18) return [primary];
  const signature = [...character.id].reduce(
    (total, letter) => total + letter.charCodeAt(0),
    0,
  );
  const secondary: CharacterSkill =
    character.skillKind === "damage" && signature % 3 === 0
      ? {
          id: `${character.id}-beyond`,
          name: "戦意共鳴",
          kind: "buff",
          scope: "all",
          baseCooldown: 8,
          power: 1,
          description: "味方全員の攻撃力を上昇",
          effects: [
            {
              kind: "atk",
              scope: "party",
              multiplier: 1.2,
              duration: 3,
            },
          ],
        }
      : character.skillKind === "damage"
        ? {
          id: `${character.id}-beyond`,
          name: `${character.skill}・超越式`,
          kind: "damage",
          scope: primary.scope === "all" ? "single" : "all",
          baseCooldown: 9,
          power: primary.scope === "all" ? 1.75 : 1.25,
          description:
            primary.scope === "all"
              ? "敵単体へ威力を集中する超越攻撃"
              : "敵全体を巻き込む超越攻撃",
          effects: [
            {
              kind: "spd",
              scope: "self",
              multiplier: 1.15,
              duration: 2,
            },
          ],
        }
      : character.skillKind === "heal"
        ? {
            id: `${character.id}-beyond`,
            name: "生命回帰",
            kind: "heal",
            scope: "all",
            baseCooldown: 9,
            power: 1.55,
            description: "味方パーティーのHPを大きく回復",
            effects: [
              { kind: "regen", scope: "party", amount: 5, duration: 3 },
            ],
          }
        : {
            id: `${character.id}-beyond`,
            name: "絶界守護",
            kind: "guard",
            scope: "all",
            baseCooldown: 9,
            power: 1.5,
            description: "敵の攻撃を極限まで軽減",
            effects: [
              {
                kind: "def",
                scope: "party",
                multiplier: 1.25,
                duration: 2,
              },
            ],
          };
  return [primary, secondary];
}

function getEffectiveSkillCooldown(skill: CharacterSkill, skillLevel: number) {
  return Math.max(1, skill.baseCooldown - Math.max(0, skillLevel - 1));
}

const SKILL_LEVEL_COSTS = [1, 2, 4, 8, 16] as const;

function getSkillDescription(skill: CharacterSkill, skillLevel: number) {
  const effectDescription = (skill.effects ?? [])
    .map((effect) => {
      const target = effect.scope === "party" ? "味方全員" : "自身";
      if (effect.kind === "regen")
        return `${target}を毎ターン${effect.amount ?? 0}%回復（${effect.duration}ターン）`;
      const stat = effect.kind === "atk" ? "攻撃" : effect.kind === "def" ? "防御" : "速度";
      return `${target}の${stat}を${Math.round(((effect.multiplier ?? 1) - 1) * 100)}%上昇（${effect.duration}ターン）`;
    })
    .join("、");
  return `${skill.description}${effectDescription ? `。${effectDescription}` : ""}。再使用まで${getEffectiveSkillCooldown(skill, skillLevel)}ターン。`;
}

function getLevelUpgradePlan(
  level: number,
  cap: number,
  gold: number,
  trainingCrystals: number,
  requestedTarget?: number,
) {
  let affordableLevel = level;
  let remainingGold = gold;
  let remainingCrystals = trainingCrystals;
  for (let next = level; next < cap; next += 1) {
    const nextGold = next * 90;
    const nextCrystals = getTrainingCrystalCost(next);
    if (remainingGold < nextGold || remainingCrystals < nextCrystals) break;
    remainingGold -= nextGold;
    remainingCrystals -= nextCrystals;
    affordableLevel = next + 1;
  }
  const targetLevel = Math.min(
    affordableLevel,
    cap,
    Math.max(level, Math.floor(requestedTarget ?? affordableLevel)),
  );
  let goldCost = 0;
  let crystalCost = 0;
  for (let next = level; next < targetLevel; next += 1) {
    goldCost += next * 90;
    crystalCost += getTrainingCrystalCost(next);
  }
  return { affordableLevel, targetLevel, goldCost, crystalCost };
}

function getMotionStyle(character: Character): React.CSSProperties {
  const index = Math.max(0, ROSTER.findIndex((unit) => unit.id === character.id));
  const motionDuration = (0.48 + (index % 9) * 0.018) / BATTLE_ACTION_PLAYBACK_RATE;
  const compactMotionIds = new Set([
    "captain-nemo", "dungeon-094", "dungeon-096", "dungeon-098",
    "dungeon-099", "ex-fox", "ex-swamp", "inferno-dragonia",
    "mech-narwhal", "red-hood", "umbrella-flare", "void", "wave4-24",
  ]);
  const tallMotionIds = new Set([
    "dungeon-070", "ex-leopard", "mech-orca", "wave4-25",
  ]);
  const eliteScale = compactMotionIds.has(character.id)
    ? 1.28
    : tallMotionIds.has(character.id)
      ? 1.1
      : 1.18;
  return {
    "--unit-color": character.color,
    "--battle-sprite-scale": getBattleSpriteScale(character.motionFrames?.[0] ?? character.image),
    "--wind-x": `${-5 - (index % 9)}px`,
    "--wind-y": `${-17 - ((index * 7) % 22)}px`,
    "--wind-r": `${-16 + ((index * 11) % 31)}deg`,
    "--lunge-x": `${18 + ((index * 13) % 36)}px`,
    "--lunge-y": `${-40 - ((index * 17) % 38)}px`,
    "--lunge-r": `${-12 + ((index * 19) % 35)}deg`,
    "--lunge-s": `${1.04 + (index % 7) * 0.017}`,
    "--motion-speed": `${motionDuration.toFixed(3)}s`,
    "--elite-scale": eliteScale,
  } as React.CSSProperties;
}

function getMotionType(character: Character) {
  const identity = `${character.name}${character.role}${character.skill}`;
  if (/[竜龍獣狼虎]/.test(identity)) return "beast";
  if (/[弓銃砲狙撃]/.test(identity)) return "shot";
  if (/[槍突爪]/.test(identity)) return "thrust";
  if (/[斧槌巨兵重騎甲冑]/.test(identity)) return "heavy";
  if (character.skillKind === "heal") return "ritual";
  if (character.skillKind === "guard") return "guard";
  if (/[忍影暗殺盗賊]/.test(identity)) return "blink";
  if (/[剣刀騎士斬]/.test(identity)) return "blade";
  return "arcane";
}

type EvolutionMaterial =
  | "evoStones"
  | "dragonHeadStones"
  | "crownStones"
  | "liberationBooks";

const MAX_EVOLUTION_BY_RARITY: Record<Rarity, number> = {
  R: 5,
  SR: 17,
  SSR: 20,
  EX: 20,
};

function getCharacterMaxEvolution(character: Character) {
  return MAX_EVOLUTION_BY_RARITY[character.rarity];
}

function getLevelCap(evolution: number) {
  if (evolution >= 20) return 250;
  if (evolution === 19) return 230;
  if (evolution === 18) return 210;
  return 10 + evolution * 10;
}

function getEvolutionRequirements(character: Character, evolution: number) {
  const stoneScale: Record<Rarity, [number, number, number, number, number]> = {
    R: [1, 1, 2, 4, 6],
    SR: [1, 2, 4, 6, 9],
    SSR: [2, 3, 5, 8, 12],
    EX: [2, 4, 6, 10, 14],
  };
  const dungeonCopyScale = [1, 2, 4, 6, 8];
  const nextEvolution = evolution + 1;
  const dragonScale = [5, 8, 10, 15, 20, 25];
  const crownScale = [3, 5, 8, 10, 15, 20];
  const beyondScale = [3, 5, 8];
  let material: EvolutionMaterial = "evoStones";
  let materialName = "進化石";
  let amount = stoneScale[character.rarity][evolution] ?? 0;
  if (nextEvolution >= 6 && nextEvolution <= 11) {
    material = "dragonHeadStones";
    materialName = "龍頭石";
    amount = dragonScale[nextEvolution - 6];
  } else if (nextEvolution >= 12 && nextEvolution <= 17) {
    material = "crownStones";
    materialName = "王冠石";
    amount = crownScale[nextEvolution - 12];
  } else if (nextEvolution >= 18) {
    material = "liberationBooks";
    materialName = "解放の書";
    amount = beyondScale[nextEvolution - 18] ?? 0;
  }
  return {
    material,
    materialName,
    amount: Math.ceil(amount / 2),
    copies:
      character.source === "dungeon" && character.id !== "void"
        ? Math.ceil((dungeonCopyScale[evolution] ?? 0) / 2)
        : 0,
    evolutionMaterialCharacters:
      nextEvolution === 12 && character.id !== LUCKY_BURNS_ID && (character.rarity === "SSR" || character.rarity === "EX") ? 5 : 0,
  };
}

function EvolutionStars({ evolution }: { evolution: number }) {
  if (evolution >= 18) {
    const color = evolution === 18 ? "yellow" : evolution === 19 ? "blue" : "red";
    return (
      <span
        className={`evolution-stars is-beyond is-${color}`}
        aria-label={`宇宙${color === "yellow" ? "黄" : color === "blue" ? "青" : "赤"}BEYOND・${evolution}進化`}
        title={`${evolution}進化・MAX Lv.${getLevelCap(evolution)}`}
      >
        BEYOND
      </span>
    );
  }
  const groupIndex = Math.floor(evolution / 3);
  const filled = (evolution % 3) + 1;
  const isRed = groupIndex % 2 === 1;
  const groupName = groupIndex < 2 ? "星" : groupIndex < 4 ? "龍頭" : "王冠";
  const markType = groupName === "星" ? "star" : groupName === "龍頭" ? "dragon" : "crown";
  return (
    <span
      className={`evolution-stars ${isRed ? "is-red" : "is-yellow"} is-${markType}`}
      aria-label={`${isRed ? "赤" : "黄"}${groupName}${filled}・${evolution}進化`}
      title={`${evolution}進化・MAX Lv.${getLevelCap(evolution)}`}
    >
      {groupName === "星"
        ? `${"★".repeat(filled)}${"☆".repeat(3 - filled)}`
        : Array.from({ length: 3 }, (_, index) =>
            groupName === "龍頭" ? (
              <i
                className={`dragon-head-mark ${index < filled ? "is-filled" : ""}`}
                key={`dragon-${index}`}
              />
            ) : (
              <Crown
                className={index < filled ? "is-filled" : ""}
                fill="currentColor"
                key={`crown-${index}`}
                size={13}
                strokeWidth={2.4}
              />
            ),
          )}
    </span>
  );
}

const ELEMENT_WINS: Record<string, string[]> = {
  火: ["木"], 水: ["火"], 木: ["水"], 光: ["闇"], 闇: ["光"],
};
const BATTLE_ELEMENTS: Element[] = ["火", "水", "木", "光", "闇"];
function getEnemyElement(stage: Stage, wave: number) {
  const configured = stage.enemies[wave - 1]?.element;
  if (configured) return normalizeElement(configured);
  const seed = stage.chapter * 3 + stage.number + wave + (stage.kind === "abyss" ? 4 : stage.kind === "strong" ? 7 : 0);
  return BATTLE_ELEMENTS[seed % BATTLE_ELEMENTS.length];
}
function getElementMultiplier(attacker: string, defender: string) {
  const keys = Object.keys(ELEMENT_WINS).filter((key) => attacker.includes(key));
  if (keys.some((key) => ELEMENT_WINS[key].includes(defender))) return 1.35;
  if (Object.entries(ELEMENT_WINS).some(([enemy, wins]) => defender.includes(enemy) && wins.some((target) => attacker.includes(target)))) return 0.75;
  return 1;
}

const DUNGEON_BACKGROUNDS = {
  grassland: "/assets/maps/dungeon-grassland-v2.webp",
  phantomForest: "/assets/maps/dungeon-phantom-forest-v2.webp",
  iceCavern: "/assets/maps/dungeon-ice-cavern-v2.webp",
  ashVolcano: "/assets/maps/dungeon-ash-volcano-v2.webp",
  underseaCity: "/assets/maps/dungeon-undersea-city-v2.webp",
  innerEarth: "/assets/maps/dungeon-inner-earth-v2.webp",
  skyRuins: "/assets/maps/dungeon-sky-ruins-v2.webp",
  desertCitadel: "/assets/maps/dungeon-desert-citadel-v2.webp",
  clockworkFoundry: "/assets/maps/dungeon-clockwork-foundry-v2.webp",
  crimsonCastle: "/assets/maps/dungeon-crimson-castle-v2.webp",
  dragonTemple: "/assets/maps/dungeon-dragon-temple-v2.webp",
  stormCoast: "/assets/maps/dungeon-storm-coast-v2.webp",
} as const;

const AREAS = [
  {
    chapter: 1,
    area: "はじまりの草原",
    background: DUNGEON_BACKGROUNDS.grassland,
    enemies: [
      {
        name: "リーフスライム",
        maxHp: 95,
        image: "/assets/grass-slime.webp",
        intent: "弾む体当たり",
      },
      {
        name: "ゴブリン斥候",
        maxHp: 150,
        image: "/assets/goblin-scout.webp",
        intent: "狙いすました斬撃",
      },
      {
        name: "遺物喰らいの巨獣",
        maxHp: 360,
        image: "/assets/relic-boar.webp",
        intent: "大技・突進",
      },
    ],
  },
  {
    chapter: 2,
    area: "幻樹の森",
    background: DUNGEON_BACKGROUNDS.phantomForest,
    enemies: [
      {
        name: "幻胞子キノコ",
        maxHp: 125,
        image: "/assets/spore-mushroom.webp",
        intent: "眠りの胞子",
      },
      {
        name: "翠羽の梟騎士",
        maxHp: 205,
        image: "/assets/owl-knight.webp",
        intent: "枝槍の一閃",
      },
      {
        name: "古樹王トレント",
        maxHp: 430,
        image: "/assets/ancient-treant.webp",
        intent: "大地を裂く根",
      },
    ],
  },
  {
    chapter: 3,
    area: "氷晶洞窟",
    background: DUNGEON_BACKGROUNDS.iceCavern,
    enemies: [
      {
        name: "クリスタルバット",
        maxHp: 145,
        image: "/assets/ice-bat.webp",
        intent: "氷刃の超音波",
      },
      {
        name: "霜牙の白狼",
        maxHp: 245,
        image: "/assets/frost-wolf.webp",
        intent: "凍てつく連爪",
      },
      {
        name: "氷晶竜ヴァイス",
        maxHp: 520,
        image: "/assets/crystal-wyvern.webp",
        intent: "絶氷のブレス",
      },
    ],
  },
  {
    chapter: 4,
    area: "灰火山",
    background: DUNGEON_BACKGROUNDS.ashVolcano,
    enemies: [
      {
        name: "灰炎インプ",
        maxHp: 175,
        image: "/assets/fire-imp.webp",
        intent: "火種のいたずら",
      },
      {
        name: "溶岩巨兵",
        maxHp: 295,
        image: "/assets/lava-golem.webp",
        intent: "灼熱の鉄槌",
      },
      {
        name: "不死鳥イグニス",
        maxHp: 650,
        image: "/assets/phoenix.webp",
        intent: "転生の業火",
      },
    ],
  },
  {
    chapter: 5,
    area: "海底遺都アトランティア",
    background: DUNGEON_BACKGROUNDS.underseaCity,
    enemies: [
      {
        name: "灯喰らいアンコウ",
        maxHp: 220,
        image: "/assets/lantern-maw.webp",
        intent: "誘光の丸呑み",
      },
      {
        name: "鉄爪機蟹",
        maxHp: 350,
        image: "/assets/ironclaw-crab.webp",
        intent: "機甲大鋏",
      },
      {
        name: "深海司祭クラーケン",
        maxHp: 760,
        image: "/assets/kraken-bishop.webp",
        intent: "海淵の妖術",
      },
    ],
  },
  {
    chapter: 6,
    area: "地底世界アガルタ",
    background: DUNGEON_BACKGROUNDS.innerEarth,
    enemies: [
      {
        name: "熔岩穿ちマグマワーム",
        maxHp: 255,
        image: "/assets/magma-wyrm.webp",
        intent: "灼熱掘削",
      },
      {
        name: "晶牙バジリスク",
        maxHp: 390,
        image: "/assets/crystal-basilisk.webp",
        intent: "紫晶の石化眼",
      },
      {
        name: "地核巨神コア・タイタン",
        maxHp: 880,
        image: "/assets/core-titan.webp",
        intent: "四腕地殻崩壊",
      },
    ],
  },
  {
    chapter: 7,
    area: "雷鳴浮遊城",
    background: DUNGEON_BACKGROUNDS.skyRuins,
    enemies: [
      {
        name: "帯電晶蝙蝠",
        maxHp: 290,
        image: "/assets/ice-bat.webp",
        intent: "雷鳴超音波",
        hue: 65,
      },
      {
        name: "蒼雷の梟騎士",
        maxHp: 455,
        image: "/assets/owl-knight.webp",
        intent: "落雷槍",
        hue: 145,
      },
      {
        name: "天雷竜テンペスト",
        maxHp: 1010,
        image: "/assets/crystal-wyvern.webp",
        intent: "蒼天雷霆",
        hue: 75,
      },
    ],
  },
  {
    chapter: 8,
    area: "砂海王都ザハード",
    background: DUNGEON_BACKGROUNDS.desertCitadel,
    enemies: [
      {
        name: "砂塵インプ",
        maxHp: 335,
        image: "/assets/fire-imp.webp",
        intent: "熱砂の目潰し",
        hue: 35,
      },
      {
        name: "黄金甲殻スカラベ",
        maxHp: 515,
        image: "/assets/ironclaw-crab.webp",
        intent: "王墓大鋏",
        hue: 55,
      },
      {
        name: "砂獄巨兵アヌビス",
        maxHp: 1160,
        image: "/assets/lava-golem.webp",
        intent: "砂海審判",
        hue: 28,
      },
    ],
  },
  {
    chapter: 9,
    area: "月蝕廃都",
    background: DUNGEON_BACKGROUNDS.crimsonCastle,
    enemies: [
      {
        name: "月毒モルフェ",
        maxHp: 380,
        image: "/assets/abyss-moth.webp",
        intent: "月蝕鱗粉",
        hue: 205,
      },
      {
        name: "影縫いの亡霊",
        maxHp: 585,
        image: "/assets/chain-wraith.webp",
        intent: "影鎖縛",
        hue: 235,
      },
      {
        name: "月喰い黒騎士",
        maxHp: 1320,
        image: "/assets/hollow-knight.webp",
        intent: "皆既月蝕斬",
        hue: 220,
      },
    ],
  },
  {
    chapter: 10,
    area: "天空神殿セレスティア",
    background: DUNGEON_BACKGROUNDS.dragonTemple,
    enemies: [
      {
        name: "聖雲スライム",
        maxHp: 430,
        image: "/assets/grass-slime.webp",
        intent: "浄化の体当たり",
        hue: 105,
      },
      {
        name: "白翼の神殿騎士",
        maxHp: 650,
        image: "/assets/gatekeeper-gigas.webp",
        intent: "天門守護",
        hue: 170,
      },
      {
        name: "堕天審判セラフィム",
        maxHp: 1480,
        image: "/assets/mourning-seraph.webp",
        intent: "白光断罪",
        hue: 155,
      },
    ],
  },
  {
    chapter: 11,
    area: "機械墓場クロノギア",
    background: DUNGEON_BACKGROUNDS.clockworkFoundry,
    enemies: [
      {
        name: "廃棄機蟹ジャンクロー",
        maxHp: 480,
        image: "/assets/ironclaw-crab.webp",
        intent: "錆鋏粉砕",
        hue: 310,
      },
      {
        name: "時計仕掛けの黒騎士",
        maxHp: 725,
        image: "/assets/hollow-knight.webp",
        intent: "歯車連斬",
        hue: 80,
      },
      {
        name: "零式魔動巨神",
        maxHp: 1650,
        image: "/assets/core-titan.webp",
        intent: "炉心暴走",
        hue: 195,
      },
    ],
  },
  {
    chapter: 12,
    area: "夢幻花園エデン",
    background: DUNGEON_BACKGROUNDS.phantomForest,
    enemies: [
      {
        name: "夢見胞子マンドラ",
        maxHp: 540,
        image: "/assets/spore-mushroom.webp",
        intent: "永眠の香り",
        hue: 300,
      },
      {
        name: "幻彩バジリスク",
        maxHp: 805,
        image: "/assets/crystal-basilisk.webp",
        intent: "夢幻石化",
        hue: 285,
      },
      {
        name: "禁樹王エルダーエデン",
        maxHp: 1840,
        image: "/assets/ancient-treant.webp",
        intent: "楽園閉鎖",
        hue: 320,
      },
    ],
  },
  {
    chapter: 13,
    area: "竜骨荒野ドラグレイヴ",
    background: DUNGEON_BACKGROUNDS.innerEarth,
    enemies: [
      {
        name: "骸骨ヘルハウンド",
        maxHp: 605,
        image: "/assets/hellhound.webp",
        intent: "骨砕き",
        hue: 45,
      },
      {
        name: "竜骸穿ちワーム",
        maxHp: 895,
        image: "/assets/magma-wyrm.webp",
        intent: "骸熱突進",
        hue: 335,
      },
      {
        name: "亡骸竜ネクロヴァイス",
        maxHp: 2070,
        image: "/assets/crystal-wyvern.webp",
        intent: "死灰の竜息",
        hue: 265,
      },
    ],
  },
  {
    chapter: 14,
    area: "星界回廊アストラ",
    background: DUNGEON_BACKGROUNDS.skyRuins,
    enemies: [
      {
        name: "星屑アビススライム",
        maxHp: 680,
        image: "/assets/abyss-slime.webp",
        intent: "星蝕粘液",
        hue: 155,
      },
      {
        name: "星海司祭ノクターナ",
        maxHp: 995,
        image: "/assets/kraken-bishop.webp",
        intent: "星界潮汐",
        hue: 190,
      },
      {
        name: "終星獣アポカリプス",
        maxHp: 2360,
        image: "/assets/inferno-dragonia.webp",
        intent: "終星崩壊",
        hue: 205,
      },
    ],
  },
] satisfies Array<{
  chapter: number;
  area: string;
  background: string;
  enemies: Enemy[];
}>;

const NORMAL_BACKGROUNDS = [
  DUNGEON_BACKGROUNDS.grassland,
  DUNGEON_BACKGROUNDS.phantomForest,
  DUNGEON_BACKGROUNDS.iceCavern,
  DUNGEON_BACKGROUNDS.ashVolcano,
  DUNGEON_BACKGROUNDS.underseaCity,
  DUNGEON_BACKGROUNDS.innerEarth,
  DUNGEON_BACKGROUNDS.skyRuins,
  DUNGEON_BACKGROUNDS.desertCitadel,
  DUNGEON_BACKGROUNDS.clockworkFoundry,
  DUNGEON_BACKGROUNDS.crimsonCastle,
  DUNGEON_BACKGROUNDS.dragonTemple,
  DUNGEON_BACKGROUNDS.stormCoast,
];
const NORMAL_WORDS_B = ["街道", "森林", "洞窟", "遺跡", "峡谷"];
const STAGE_CHARACTER_POOL = [
  ...DUNGEON_CHARACTERS,
  ...FEATURED_NEW_CHARACTERS.filter(
    (character) => character.source === "dungeon",
  ),
  ...CORE_CHARACTERS.filter((character) =>
    [
      "deatharc",
      "white-dragon-saint",
      "inferno-dragonia",
      "void",
    ].includes(character.id),
  ),
].map(versionCharacter);
function characterEncounter(
  character: Character,
  maxHp: number,
  isBoss = false,
): Enemy {
  return {
    name: character.name,
    maxHp,
    image: character.image,
    intent: character.skill,
    characterId: character.id,
    element: character.element,
    isBoss,
  };
}
const NORMAL_ENEMY_POOL: Enemy[] = STAGE_CHARACTER_POOL.map(
  (character, index) =>
    characterEncounter(
      character,
      Math.round(
        character.baseStats.hp *
          (character.rarity === "EX"
            ? 3.2
            : character.rarity === "SSR"
              ? 2.65
              : character.rarity === "SR"
                ? 2.15
                : 1.8),
      ),
      index % 3 === 2,
    ),
);
const EXTRA_NORMAL_AREAS = Array.from({ length: 50 }, (_, index) => {
  const tier = Math.floor(index / 3);
  const reward = requireCharacter(NORMAL_DUNGEON_REWARD_IDS[index]);
  const enemies = [0, 1, 2].map((offset) => {
    const base =
      NORMAL_ENEMY_POOL[(index * 3 + offset * 7) % NORMAL_ENEMY_POOL.length];
    const isBoss = offset === 2;
    const dungeonUnit = isBoss
      ? reward
      : getThemedDungeonCharacter(reward, index * 7 + offset * 13);
    return {
      ...base,
      name: dungeonUnit.name,
      image: dungeonUnit.image,
      intent: dungeonUnit.skill,
      hue: 0,
      characterId: dungeonUnit.id,
      element: dungeonUnit.element,
      isBoss,
      maxHp: Math.round(
        (260 + tier * 42 + offset * 135) *
          (1 + index * 0.018) *
          (isBoss ? 1.35 : 1),
      ),
    };
  });
  return {
    chapter: index + 15,
    area: `${reward.name}の${NORMAL_WORDS_B[Math.floor(index / 10)]}`,
    background: NORMAL_BACKGROUNDS[index % NORMAL_BACKGROUNDS.length],
    enemies,
    dropCharacterId: reward.id,
  };
});
const NORMAL_AREAS = [...AREAS, ...EXTRA_NORMAL_AREAS.slice(0, 36)];
const LEGACY_NORMAL_AREAS = EXTRA_NORMAL_AREAS.slice(36);

const BASE_STAGES: Stage[] = AREAS.flatMap((area, areaIndex) =>
  [0, 1, 2].map((stageIndex) => {
    const enemies = [0, 1, 2].map((offset) => {
      const base =
        NORMAL_ENEMY_POOL[
          (areaIndex * 9 + stageIndex * 3 + offset * 11) %
            NORMAL_ENEMY_POOL.length
        ];
      return {
        ...base,
        isBoss: offset === 2,
        maxHp: Math.round(
          (125 + areaIndex * 58 + offset * 145) *
            (1 + stageIndex * 0.18),
        ),
      };
    });
    return {
      id: `${area.chapter}-${stageIndex + 1}`,
      chapter: area.chapter,
      number: stageIndex + 1,
      area: area.area,
      title:
        stageIndex === 0
          ? "残響を追って"
          : stageIndex === 1
            ? "守護者の間"
            : `${enemies[2].name}との決戦`,
      background: area.background,
      recommended: 10 + areaIndex * 5 + stageIndex * 2,
      scale: 1 + areaIndex * 0.38 + stageIndex * 0.2,
      rule:
        stageIndex === 0
          ? "探索開始時 HP+10%"
          : stageIndex === 1
            ? "敵の攻撃力+15%"
            : "ボス戦・報酬増加",
      gems: 100 + areaIndex * 30 + stageIndex * 25,
      gold: 260 + areaIndex * 90 + stageIndex * 70,
      dropCharacterId: areaIndex === 0 && stageIndex < 2 ? ADDITIONAL_DUNGEON_CHARACTERS[stageIndex].id : undefined,
      dropRate: areaIndex === 0 && stageIndex < 2 ? 0.05 : 0,
      enemies,
    };
  }),
);

const EXTRA_NORMAL_STAGES: Stage[] = EXTRA_NORMAL_AREAS.flatMap(
  (area, areaIndex) =>
    [0, 1, 2].map((stageIndex) => {
      const phase = areaIndex + 1;
      const difficultyTier = Math.floor(areaIndex / 3);
      return {
        id: `N-${phase}-${stageIndex + 1}`,
        chapter: area.chapter,
        number: stageIndex + 1,
        area: area.area,
        title: `${area.area} ${stageIndex + 1}区`,
        background: area.background,
        atmosphere: `hsla(${(areaIndex * 31) % 360},55%,18%,.24)`,
        recommended: 78 + difficultyTier * 3 + stageIndex * 2,
        scale: 3.1 + difficultyTier * 0.16 + stageIndex * 0.12,
        rule: `奥地探索・強敵出現（危険度${difficultyTier + 1}）`,
        gems: 180 + difficultyTier * 12,
        gold: 720 + difficultyTier * 95,
        enemies: area.enemies.map((enemy) => ({
          ...enemy,
          maxHp: Math.round(enemy.maxHp * (1 + stageIndex * 0.14)),
        })),
        kind: "normal",
        dropCharacterId: stageIndex === 2 ? area.dropCharacterId : undefined,
        dropRate: stageIndex === 2 ? 0.05 : 0,
      };
    }),
);

const STAGES: Stage[] = [...BASE_STAGES, ...EXTRA_NORMAL_STAGES.slice(0, 108)];
const LEGACY_NORMAL_STAGES = EXTRA_NORMAL_STAGES.slice(108);

const EVENT_PREFIX = [
  "月夜",
  "潮騒",
  "紅葉",
  "星祭",
  "雪灯",
  "機巧",
  "竜宴",
  "花嵐",
  "雷舞",
  "幻灯",
];
const EVENT_SUFFIX = ["の試練", "の大行進", "の秘宝祭", "の迷宮", "の守護戦"];
const EVENT_NAMES = Array.from(
  { length: 50 },
  (_, index) =>
    `${EVENT_PREFIX[index % 10]}${EVENT_SUFFIX[Math.floor(index / 10)]}`,
);
const EVENT_DIFFICULTIES = [
  { label: "初級", level: 22, scale: 1.5 },
  { label: "中級", level: 48, scale: 2.65 },
  { label: "上級", level: 82, scale: 4.2 },
];
const EVENT_BACKGROUND_THEMES = [
  [8, 12, 20, 30, 50], [4, 11, 31, 42, 25], [27, 17, 10, 2, 14],
  [15, 24, 35, 5, 39], [7, 45, 13, 3, 21], [9, 44, 18, 36, 48],
  [6, 23, 29, 33, 41], [1, 16, 34, 38, 46], [19, 32, 22, 47, 49],
  [26, 28, 37, 40, 43],
];
const EVENT_BACKGROUNDS = Array.from({ length: 50 }, (_, index) => `/assets/event-bg-${String(EVENT_BACKGROUND_THEMES[index % 10][Math.floor(index / 10)]).padStart(2, "0")}.webp`);
const EVENT_STAGES: Stage[] = EVENT_NAMES.flatMap((baseEventName, eventIndex) =>
  EVENT_DIFFICULTIES.map((difficulty, difficultyIndex) => {
    const reward = requireCharacter(EVENT_DUNGEON_REWARD_IDS[eventIndex]);
    const poolIndex =
      (eventIndex * 5 + difficultyIndex * 3) % NORMAL_ENEMY_POOL.length;
    const enemies = [0, 1, 2].map((offset) => {
      const isBoss = offset === 2;
      const unit = isBoss
        ? reward
        : getThemedDungeonCharacter(
            reward,
            eventIndex * 11 + difficultyIndex * 5 + offset * 17,
          );
      return {
        ...NORMAL_ENEMY_POOL[
          (poolIndex + offset * 9) % NORMAL_ENEMY_POOL.length
        ],
        name: unit.name,
        image: unit.image,
        intent: unit.skill,
        hue: 0,
        characterId: unit.id,
        element: unit.element,
        isBoss,
        maxHp: Math.round(
          (180 + eventIndex * 12 + offset * 155) * difficulty.scale,
        ),
      };
    });
    return {
      id: `E-${eventIndex + 1}-${difficultyIndex + 1}`,
      chapter: eventIndex + 1,
      number: difficultyIndex + 1,
      area: baseEventName,
      title: `${reward.name}・${difficulty.label}`,
      background: EVENT_BACKGROUNDS[eventIndex % EVENT_BACKGROUNDS.length],
      atmosphere: `hsla(${(eventIndex * 47) % 360},60%,20%,.34)`,
      recommended: difficulty.level + Math.floor(eventIndex / 5) * 2,
      scale: difficulty.scale,
      rule: `${difficulty.label}・期間限定`,
      gems: 120 + difficultyIndex * 90,
      gold: 380 + difficultyIndex * 260,
      enemies,
      kind: "event",
      dropCharacterId: reward.id,
      dropRate: [0.005, 0.01, 0.03][difficultyIndex],
      gimmick:
        difficultyIndex === 2
          ? eventIndex % 2 === 0
            ? {
                name: "逆境暴走",
                hpThreshold: 0.35,
                damageMultiplier: 2,
                description: "HPが35%以下になると攻撃ダメージが2倍",
              }
            : {
                name: "終刻宣告",
                doomTurn: 8,
                description: "8ターン目に防御不能の即死攻撃",
              }
          : undefined,
    };
  }),
);

const STRONG_STAGES: Stage[] = STRONG_DUNGEON_REWARD_IDS.flatMap(
  (rewardId, strongIndex) => {
    const reward = requireCharacter(rewardId);
    return ["白", "黒"].map((rank, rankIndex) => {
    const boss =
      NORMAL_ENEMY_POOL[(strongIndex * 7 + 11) % NORMAL_ENEMY_POOL.length];
    const scale =
      rankIndex === 0 ? 5.2 + strongIndex * 0.25 : 7.4 + strongIndex * 0.34;
    const enemies: Enemy[] = [0, 1].map((offset) => {
      const support = getThemedDungeonCharacter(
        reward,
        100 + strongIndex * 11 + rankIndex * 5 + offset * 7,
      );
      return {
        ...NORMAL_ENEMY_POOL[
          (strongIndex * 5 + offset * 13) % NORMAL_ENEMY_POOL.length
        ],
        name: support.name,
        image: support.image,
        intent: support.skill,
        hue: 0,
        characterId: support.id,
        element: support.element,
        isBoss: false,
        maxHp: Math.round((420 + strongIndex * 70 + offset * 220) * scale),
      };
    });
    enemies.push({
      ...boss,
      name: `${rank}級・${reward.name}`,
      image: reward.image,
      intent: reward.skill,
      hue: 0,
      characterId: reward.id,
      element: reward.element,
      isBoss: true,
      maxHp: Math.round((850 + strongIndex * 120) * scale),
    });
    return {
      id: `X-${strongIndex + 1}-${rankIndex + 1}`,
      chapter: strongIndex + 1,
      number: 3,
      area: "イベント強敵",
      title: `${rank}級・${reward.name}`,
      background:
        NORMAL_BACKGROUNDS[(strongIndex + 3) % NORMAL_BACKGROUNDS.length],
      atmosphere: rank === "黒" ? "#16000988" : "#dfeeff22",
      recommended: (rankIndex === 0 ? 95 : 125) + strongIndex * 4,
      scale,
      rule: `${rank}級・超高難度`,
      gems: rankIndex === 0 ? 350 : 600,
      gold: rankIndex === 0 ? 1800 : 3200,
      enemies,
      kind: "strong",
      dropCharacterId: reward.id,
      dropRate: rankIndex === 0 ? 0.55 : 0.6,
      rewardMode: "chance",
      tokenReward: 1,
      gimmick: {
        name: rankIndex === 0 ? "王威解放" : "滅界宣告",
        hpThreshold: 0.4,
        damageMultiplier: 2,
        doomTurn: rankIndex === 0 ? 9 : 6,
        description:
          rankIndex === 0
            ? "HPが40%以下になると攻撃ダメージが2倍。9ターン目に防御できない必殺攻撃"
            : "HPが40%以下になると攻撃ダメージが2倍。6ターン目に防御できない必殺攻撃",
      },
    };
    });
  },
);

const EVENT_UNLOCK_LEVEL = 5;
const ABYSS_UNLOCK_LEVEL = 15;

// Event character rewards follow EVENT_BOSS_DROP_RATES on every clear,
// including the first. Retain historical token balances and exchange routes.
const EXPEDITION_CONFIG = [
  { title: "紫晶巨兵の鉱道", floors: 3, difficulty: "低", level: 24, scale: 1.7, rewardId: "dungeon-091", rate: 0.05, tokens: 0 },
  { title: "晶剣騎皇の回廊", floors: 5, difficulty: "低", level: 34, scale: 2.05, rewardId: "dungeon-092", rate: 0.04, tokens: 0 },
  { title: "虹晶鳳の空洞", floors: 7, difficulty: "低", level: 44, scale: 2.45, rewardId: "dungeon-094", rate: 0.03, tokens: 0 },
  { title: "晶環機神の工房", floors: 9, difficulty: "中", level: 60, scale: 3.05, rewardId: "dungeon-095", rate: 0.03, tokens: 0 },
  { title: "炎竜騎帝の十二門", floors: 12, difficulty: "中", level: 74, scale: 3.65, rewardId: "dungeon-096", rate: 0.02, tokens: 0 },
  { title: "爆炎魔獣の縦断路", floors: 15, difficulty: "中", level: 88, scale: 4.35, rewardId: "dungeon-097", rate: 0.01, tokens: 0 },
  { title: "白耀天槍・五刻決戦", floors: 5, difficulty: "高", level: 128, scale: 7.25, rewardId: "dungeon-105", rate: 0, tokens: 1 },
  { title: "鬼火兎の星喰い回廊", floors: 18, difficulty: "高", level: 112, scale: 5.75, rewardId: "dungeon-070", rate: 0, tokens: 1 },
  { title: "氷晶精霊・二十聖域", floors: 20, difficulty: "高", level: 124, scale: 6.35, rewardId: "dungeon-093", rate: 0, tokens: 1 },
] as const;

const EXPEDITION_STAGES: Stage[] = EXPEDITION_CONFIG.map((config, index) => {
  const reward = requireCharacter(config.rewardId);
  const enemies = Array.from({ length: config.floors }, (_, floorIndex) => {
    const base = NORMAL_ENEMY_POOL[(index * 11 + floorIndex * 7) % NORMAL_ENEMY_POOL.length];
    const isBoss = floorIndex === config.floors - 1;
    const unit = isBoss
      ? reward
      : getThemedDungeonCharacter(reward, index * 17 + floorIndex * 13);
    return {
      ...base,
      name: unit.name,
      image: unit.image,
      intent: unit.skill,
      hue: 0,
      characterId: unit.id,
      element: unit.element,
      isBoss,
      maxHp: Math.round((170 + floorIndex * 34 + (isBoss ? 360 : 0)) * config.scale),
    };
  });
  return {
    id: `L-${index + 1}`,
    chapter: index + 1,
    number: config.difficulty === "低" ? 1 : config.difficulty === "中" ? 2 : 3,
    difficultyLabel:
      config.difficulty === "低"
        ? "初級"
        : config.difficulty === "中"
          ? "中級"
          : "上級",
    area: "期間限定イベント",
    title: config.title,
    background: NORMAL_BACKGROUNDS[(22 + index * 3) % NORMAL_BACKGROUNDS.length],
    atmosphere: config.difficulty === "高" ? "#24000c91" : `hsla(${index * 41},55%,18%,.36)`,
    recommended: config.level,
    scale: config.scale,
    rule: `全${config.floors}階・${config.difficulty === "低" ? "初級" : config.difficulty === "中" ? "中級" : "上級"}・階層が進むほど敵強化${config.floors === 5 && config.difficulty === "高" ? "・短期超決戦" : ""}`,
    gems: 110 + config.floors * (config.difficulty === "高" ? 28 : 12),
    gold: 360 + config.floors * (config.difficulty === "高" ? 155 : 70),
    enemies,
    kind: "event",
    unlockLevel: Math.max(EVENT_UNLOCK_LEVEL, Math.floor(config.level / 3)),
    playerXpReward: 55 + config.floors * (config.difficulty === "高" ? 30 : 14),
    evoStoneReward: config.difficulty === "高" ? 5 : config.difficulty === "中" ? 3 : 1,
    dropCharacterId: reward.id,
    dropRate: config.difficulty === "低" ? 0.005 : config.difficulty === "中" ? 0.01 : 0.03,
    rewardMode: "chance",
    tokenReward: config.tokens,
    gimmick: config.difficulty === "高" ? {
      name: config.floors === 5 ? "五刻終滅" : "最深部終局",
      hpThreshold: 0.35,
      damageMultiplier: 2,
      doomTurn: config.floors === 5 ? 5 : 8,
      description: config.floors === 5 ? "HPが35%以下になると攻撃ダメージが2倍。5ターン目に防御できない必殺攻撃" : "HPが35%以下になると攻撃ダメージが2倍。8ターン目に防御できない必殺攻撃",
    } : undefined,
  };
});

const FEATURED_DUNGEON_CONFIG = [
  { id: "FD-O", title: "紅海の黒鯱戦線", characterId: "mech-orca", floors: 10, level: 72, scale: 3.7, rate: 0.03, group: 0, difficulty: 2 },
  { id: "FD-N", title: "蒼角の海天回廊", characterId: "mech-narwhal", floors: 12, level: 84, scale: 4.3, rate: 0.03, group: 0, difficulty: 2 },
  { id: "FD-G", title: "白鋼鮫の狩場", characterId: "mech-great-white", floors: 5, level: 46, scale: 2.55, rate: 0.05, group: 0, difficulty: 1 },
  { id: "FD-H", title: "双槌ソナー海溝", characterId: "mech-hammerhead", floors: 3, level: 26, scale: 1.7, rate: 0.05, group: 0, difficulty: 1 },
  { id: "FD-W", title: "巨鯨機神の深海航路", characterId: "mech-whale-shark", floors: 15, level: 105, scale: 5.45, rate: 0, group: 0, difficulty: 3 },
  { id: "FD-F", title: "火口に踊る小魔", characterId: "fritter", floors: 3, level: 24, scale: 1.65, rate: 0.05, group: 1, difficulty: 1 },
  { id: "FD-S", title: "影翼の追跡者", characterId: "shadow-imp", floors: 5, level: 49, scale: 2.7, rate: 0.03, group: 1, difficulty: 2 },
  { id: "FD-C", title: "爆殻魔獣・臨界点", characterId: "cracker", floors: 7, level: 62, scale: 3.25, rate: 0.03, group: 1, difficulty: 2 },
] as const;
const FEATURED_DUNGEON_GROUP_IDS = [
  [
    "mech-orca",
    "mech-narwhal",
    "mech-great-white",
    "mech-hammerhead",
    "mech-whale-shark",
  ],
  ["fritter", "shadow-imp", "cracker"],
] as const;

const FEATURED_DUNGEON_STAGES: Stage[] = FEATURED_DUNGEON_CONFIG.map((config, index) => {
  const reward = requireCharacter(config.characterId);
  const encounterIds = FEATURED_DUNGEON_GROUP_IDS[config.group];
  const enemies = Array.from({ length: config.floors }, (_, floorIndex) => {
    const isBoss = floorIndex === config.floors - 1;
    const unit = isBoss
      ? reward
      : requireCharacter(
          encounterIds[(index + floorIndex * 3) % encounterIds.length],
        );
    return {
      name: unit.name,
      maxHp: Math.round((175 + floorIndex * 38 + (isBoss ? 430 : 0)) * config.scale),
      image: unit.image,
      intent: unit.skill,
      characterId: unit.id,
      element: unit.element,
      isBoss,
    };
  });
  const high = config.difficulty === 3;
  return {
    id: config.id,
    chapter: 80 + index,
    number: config.difficulty,
    area: config.group === 0 ? "深海戦機開発区" : "魔界火口域",
    title: config.title,
    background:
      config.group === 0
        ? DUNGEON_BACKGROUNDS.underseaCity
        : DUNGEON_BACKGROUNDS.innerEarth,
    atmosphere: config.group === 0 ? "#003f6866" : "#45100677",
    recommended: config.level,
    scale: config.scale,
    rule: `全${config.floors}階${high ? "・高難度" : ""}`,
    gems: 140 + config.floors * 18,
    gold: 420 + config.floors * 105,
    enemies,
    kind: "event",
    unlockLevel: Math.max(EVENT_UNLOCK_LEVEL, Math.floor(config.level / 3)),
    playerXpReward: 70 + config.floors * 18,
    evoStoneReward: high ? 5 : config.difficulty === 2 ? 3 : 1,
    dropCharacterId: reward.id,
    dropRate: [0.005, 0.01, 0.03][config.difficulty - 1],
    rewardMode: "chance",
    tokenReward: high ? 1 : 0,
    gimmick: config.difficulty >= 2 ? {
      name: config.group === 0 ? "深海圧壊" : "魔力臨界",
      hpThreshold: 0.35,
      damageMultiplier: 2,
      doomTurn: high ? 7 : 9,
      description: high ? "HPが35%以下になると攻撃ダメージが2倍。7ターン目に防御できない必殺攻撃" : "HPが35%以下になると攻撃ダメージが2倍。9ターン目に防御できない必殺攻撃",
    } : undefined,
  };
});

const VOID_GAUNTLET_ENEMIES = ROSTER.filter(
  (character) =>
    (character.rarity === "SSR" || character.rarity === "EX") &&
    character.id !== "void",
)
  .slice(0, 19)
  .map((character, index) =>
    characterEncounter(character, 7200 + index * 980, false),
  );

const VOID_GAUNTLET_STAGES: Stage[] = [
  {
    id: "NE-VOID-1",
    chapter: 99,
    number: 1,
    difficultyLabel: "無級",
    area: "無界・終焉回廊",
    title: "無界・終焉回廊",
    background: DUNGEON_BACKGROUNDS.dragonTemple,
    atmosphere: "#08020ebd",
    recommended: 225,
    scale: 12,
    rule: "全20階・味方HP50%開始・敵の攻撃1.8倍／防御1.5倍／速度1.3倍",
    startingPartyHp: 50,
    enemyAttackMultiplier: 1.8,
    enemyDefenseMultiplier: 1.5,
    enemySpeedMultiplier: 1.3,
    gems: 500,
    gold: 4800,
    enemies: [
      ...VOID_GAUNTLET_ENEMIES,
      characterEncounter(requireCharacter("void"), 32000, true),
    ],
    kind: "event",
    singleEnemyWaves: true,
    reusesExistingBosses: true,
    dropCharacterId: "void",
    dropRate: 0.8,
    rewardMode: "chance",
    unlockLevel: 80,
    playerXpReward: 1500,
    trainingCrystalReward: 60,
    evoStoneReward: 8,
    gimmick: {
      name: "無界終焉",
      hpThreshold: 0.5,
      damageMultiplier: 2.5,
      doomTurn: 6,
      description:
        "HPが50%以下になると攻撃ダメージが2.5倍。6ターン目に防御できない必殺攻撃",
    },
  },
];

export const MATERIAL_DIFFICULTIES = [
  {
    label: "初級",
    unlockLevel: 5,
    recommended: 18,
    scale: 1.35,
    xp: 70,
    normalChance: 0.1,
    normalAmount: 1,
    bossChance: 0.15,
    bossAmount: 1,
  },
  {
    label: "中級",
    unlockLevel: 10,
    recommended: 52,
    scale: 2.8,
    xp: 150,
    normalChance: 0.5,
    normalAmount: 1,
    bossChance: 0.5,
    bossAmount: 1,
  },
  {
    label: "上級",
    unlockLevel: 18,
    recommended: 92,
    scale: 4.6,
    xp: 300,
    normalChance: 0.7,
    normalAmount: 1,
    bossChance: 0.8,
    bossAmount: 2,
  },
  {
    label: "実りの大地",
    unlockLevel: 35,
    recommended: 150,
    scale: 7.2,
    xp: 520,
    normalChance: 0.95,
    normalAmount: 2,
    bossChance: 1,
    bossAmount: 4,
  },
] as const;

const MATERIAL_FAMILIES: Array<{
  code: string;
  shortLabel: string;
  name: string;
  rule: string;
  dropKind: DefeatDropKind;
  enemyOffset: number;
  backgroundOffset: number;
}> = [
  {
    code: "TR",
    shortLabel: "強",
    name: "育成ダンジョン・強化素材",
    rule: "倒した魔物から強化結晶を獲得",
    dropKind: "trainingCrystals",
    enemyOffset: 18,
    backgroundOffset: 15,
  },
  {
    code: "EV",
    shortLabel: "進",
    name: "育成ダンジョン・進化素材",
    rule: "倒した魔物から進化石を獲得",
    dropKind: "evoStones",
    enemyOffset: 29,
    backgroundOffset: 8,
  },
  {
    code: "TF",
    shortLabel: "変",
    name: "育成ダンジョン・進化キャラ",
    rule: "倒した魔物から変化の幼精を獲得",
    dropKind: "evolutionMaterialCharacters",
    enemyOffset: 41,
    backgroundOffset: 21,
  },
  {
    code: "SK",
    shortLabel: "技",
    name: "育成ダンジョン・スキルキャラ",
    rule: "倒した魔物から技継ぎの導師を獲得",
    dropKind: "skillMaterialCharacters",
    enemyOffset: 53,
    backgroundOffset: 27,
  },
];

const MATERIAL_STAGES: Stage[] = MATERIAL_FAMILIES.flatMap(
  (family, familyIndex) =>
    MATERIAL_DIFFICULTIES.map((difficulty, difficultyIndex) => ({
      id:
        familyIndex === 0
          ? `M-${difficultyIndex + 1}`
          : `M-${family.code}-${difficultyIndex + 1}`,
      chapter: familyIndex + 1,
      number: difficultyIndex + 1,
      area: family.name,
      title: difficulty.label === "実りの大地"
        ? `実りの大地（${family.shortLabel}）`
        : `${family.name}・${difficulty.label}`,
      background:
        NORMAL_BACKGROUNDS[
          (family.backgroundOffset + difficultyIndex) % NORMAL_BACKGROUNDS.length
        ],
      atmosphere: "#0b35536b",
      recommended: difficulty.recommended,
      scale: difficulty.scale,
      rule: difficulty.label === "実りの大地"
        ? `実りの大地（${family.shortLabel}）・${family.rule}`
        : `${difficulty.label}・${family.rule}`,
      gems: 40 + difficultyIndex * 30,
      gold: 260 + difficultyIndex * 300,
      enemies: [0, 1, 2].map((offset) => {
        const enemy =
          NORMAL_ENEMY_POOL[
            (family.enemyOffset + difficultyIndex * 13 + offset * 7) %
              NORMAL_ENEMY_POOL.length
          ];
        return {
          ...enemy,
          isBoss: offset === 2,
          maxHp: Math.round((150 + offset * 170) * difficulty.scale),
        };
      }),
      kind: "material" as const,
      difficultyLabel: difficulty.label,
      unlockLevel: difficulty.unlockLevel,
      playerXpReward: difficulty.xp,
      normalDefeatDrops: [
        {
          kind: family.dropKind,
          chance: difficulty.normalChance,
          amount: difficulty.normalAmount,
        },
      ],
      bossDefeatDrops: [
        {
          kind: family.dropKind,
          chance: difficulty.bossChance,
          amount: difficulty.bossAmount,
        },
      ],
      dropPolicy: "defeat-only" as const,
    })),
);

const EVENT_ROTATION_MS = 7 * 24 * 60 * 60 * 1000;
function getEventRotation(now = Date.now()) {
  const rotation = Math.max(
    0,
    Math.floor((now - ROTATION_START) / EVENT_ROTATION_MS),
  );
  const activeEvents = Array.from(
    { length: 5 },
    (_, offset) => (rotation * 5 + offset) % EVENT_NAMES.length,
  );
  const activeStrong = rotation % STRONG_NAMES.length;
  const activeExpeditions = Array.from(
    { length: 2 },
    (_, offset) => (rotation * 2 + offset) % EXPEDITION_STAGES.length,
  );
  return {
    rotationIndex: rotation,
    activeEvents,
    activeExpeditions,
    activeStrong,
    endsAt: new Date(ROTATION_START + (rotation + 1) * EVENT_ROTATION_MS),
  };
}

const PRESENTED_ABYSS_ENEMIES: Enemy[] = [
  {
    name: "獄炎槍鬼インファナル",
    maxHp: 138,
    image: "/assets/infernal-imp.webp",
    intent: "獄炎三叉槍",
    element: "炎",
  },
  {
    name: "凍魂亡霊フロストレイス",
    maxHp: 148,
    image: "/assets/frost-wraith.webp",
    intent: "零度の抱擁",
    element: "氷",
  },
  {
    name: "屍霊王プレイグリッチ",
    maxHp: 235,
    image: "/assets/plague-lich.webp",
    intent: "魂喰いの鬼火",
    element: "闇",
  },
  {
    name: "夜哭石像ダスクガーゴイル",
    maxHp: 248,
    image: "/assets/dusk-gargoyle.webp",
    intent: "石翼急襲",
    element: "闇",
  },
  {
    name: "氷晶竜ヴァイス",
    maxHp: 280,
    image: "/assets/crystal-wyvern.webp",
    intent: "絶氷のブレス",
    element: "氷",
  },
];
const ABYSS_ENEMIES: Enemy[] = [
  ...PRESENTED_ABYSS_ENEMIES,
  ...STAGE_CHARACTER_POOL.map((character) =>
    characterEncounter(
      character,
      Math.max(150, Math.round(character.baseStats.hp * 1.65)),
    ),
  ),
];
const GIGAS: Enemy = characterEncounter(
  requireCharacter("dungeon-100"),
  430,
  true,
);
const SERAPH: Enemy = characterEncounter(
  requireCharacter("dungeon-105"),
  520,
  true,
);
const ABYSS_GATEKEEPER: Enemy = characterEncounter(
  requireCharacter("dungeon-099"),
  390,
  true,
);
const VOID_BOSS: Enemy = {
  name: "暗黒龍：ヴォイド",
  maxHp: 1200,
  image: "/assets/void-user-v2.webp",
  intent: "奈落終焉",
  characterId: "void",
  element: "闇",
  isBoss: true,
};
const ABYSS_BACKGROUNDS = [
  DUNGEON_BACKGROUNDS.innerEarth,
  DUNGEON_BACKGROUNDS.phantomForest,
  DUNGEON_BACKGROUNDS.underseaCity,
  DUNGEON_BACKGROUNDS.iceCavern,
  DUNGEON_BACKGROUNDS.ashVolcano,
  DUNGEON_BACKGROUNDS.crimsonCastle,
  DUNGEON_BACKGROUNDS.clockworkFoundry,
  DUNGEON_BACKGROUNDS.stormCoast,
  DUNGEON_BACKGROUNDS.skyRuins,
  DUNGEON_BACKGROUNDS.dragonTemple,
];
const ABYSS_STAGES: Stage[] = Array.from({ length: 100 }, (_, index) => {
  const floor = index + 1;
  const scale = 1 + index * 0.055;
  const boss = floor % 10 === 0;
  const enemyCount = ABYSS_ENEMIES.length;
  const enemies =
    floor === 100
      ? [SERAPH, GIGAS, VOID_BOSS]
      : boss
        ? [
            ABYSS_ENEMIES[index % enemyCount],
            ABYSS_ENEMIES[(index + 3) % enemyCount],
            floor % 20 === 0
              ? SERAPH
              : floor % 30 === 0
                ? ABYSS_GATEKEEPER
                : GIGAS,
          ]
        : [0, 1, 2].map((offset) => {
            const base = ABYSS_ENEMIES[(index + offset) % enemyCount];
            return {
              ...base,
              name: `${floor}階の${base.name}`,
              image: base.image,
              isBoss: offset === 2,
            };
          });
  const hue = (floor * 37) % 360;
  return {
    id: `A-${floor}`,
    chapter: 0,
    number: boss ? 3 : 1,
    area: `深淵奈落・${Math.floor(index / 10) + 1}層帯`,
    title:
      floor === 100
        ? "深淵の終極"
        : boss
          ? `第${floor}階・門番`
          : `第${floor}階`,
    background: ABYSS_BACKGROUNDS[index % ABYSS_BACKGROUNDS.length],
    atmosphere: `hsla(${hue},70%,22%,.42)`,
    recommended: 12 + Math.floor(index * 0.42),
    scale: 1 + index * 0.03,
    rule:
      floor === 100
        ? "最終決戦・初回撃破でヴォイド加入"
        : boss
          ? "チェックポイント・階層固有ボス"
          : "深淵の瘴気・敵が強化",
    gems: boss ? 180 : 25,
    gold: Math.round((120 + floor * 8) * scale),
    enemies: enemies.map((enemy, enemyIndex) => ({
      ...enemy,
      hue: ((enemy.hue ?? 0) + floor * 11 + enemyIndex * 29) % 360,
      maxHp: Math.round(enemy.maxHp * scale),
      isBoss: enemyIndex === enemies.length - 1,
    })),
    kind: "abyss",
    gimmick:
      floor >= 50 && (boss || floor % 5 === 0)
        ? {
            name: floor === 100 ? "奈落終焉" : "深層侵食",
            hpThreshold: 0.3,
            damageMultiplier: 2,
            doomTurn: floor === 100 ? 6 : 9,
            description:
              floor === 100
                ? "HPが30%以下になると攻撃ダメージが2倍。6ターン目に防御できない必殺攻撃"
                : "HPが30%以下になると攻撃ダメージが2倍。9ターン目に防御できない必殺攻撃",
          }
        : undefined,
  };
});

const ALL_STAGES: Stage[] = [
  ...STAGES,
  ...LEGACY_NORMAL_STAGES,
  ...EVENT_STAGES,
  ...STRONG_STAGES,
  ...MATERIAL_STAGES,
  ...EXPEDITION_STAGES,
  ...FEATURED_DUNGEON_STAGES,
  ...VOID_GAUNTLET_STAGES,
  ...PHASE4_EVENT_DUNGEONS,
  ...PHASE4_VOID_DUNGEONS,
  ...ABYSS_STAGES,
];
const STAGE_ID_SET = new Set(ALL_STAGES.map((stage) => stage.id));
const PHASE4_NEW_ENEMY_ID_SET = new Set<string>(PHASE4_NEW_ENEMY_IDS);
const EXCHANGEABLE_BOSS_IDS = new Set(
  ALL_STAGES.filter(
    (stage) =>
      (stage.tokenReward ?? 0) > 0 && stage.dropCharacterId,
  ).map((stage) => stage.dropCharacterId!),
);

const ENEMY_STAT_BASELINES: Record<Rarity, Pick<Stats, "atk" | "def" | "spd">> = {
  R: { atk: 25, def: 19, spd: 22 },
  SR: { atk: 30, def: 23, spd: 24 },
  SSR: { atk: 36, def: 27, spd: 27 },
  EX: { atk: 44, def: 35, spd: 31 },
};

function resolveEnemy(
  enemy: Enemy,
  stage: Stage,
  waveIndex: number,
): ResolvedEnemy {
  const linkedCharacter = enemy.characterId
    ? CHARACTER_BY_ID.get(enemy.characterId)
    : undefined;
  const isBoss = enemy.isBoss ?? waveIndex === stage.enemies.length - 1;
  const bossMultiplier = isBoss ? 1.12 : 1;
  const baseline = linkedCharacter
    ? ENEMY_STAT_BASELINES[linkedCharacter.rarity]
    : undefined;
  const attackFactor = linkedCharacter
    ? linkedCharacter.baseStats.atk / baseline!.atk
    : 1;
  const defenseFactor = linkedCharacter
    ? linkedCharacter.baseStats.def / baseline!.def
    : 1;
  const speedFactor = linkedCharacter
    ? linkedCharacter.baseStats.spd / baseline!.spd
    : 1;
  const baseAttack =
    enemy.atk ??
    Math.max(
      1,
      Math.round(
        (18 + stage.recommended * 0.12) * attackFactor * bossMultiplier,
      ),
    );
  const baseDefense =
    enemy.def ??
    Math.max(
      0,
      Math.round(
        (8 + stage.recommended * 0.08) * defenseFactor * bossMultiplier,
      ),
    );
  const baseSpeed =
    enemy.spd ??
    Math.max(
      1,
      Math.round((15 + stage.recommended * 0.06) * speedFactor),
    );
  return {
    ...enemy,
    level: Math.max(1, Math.round(stage.recommended)),
    atk: Math.max(1, Math.round(baseAttack * (stage.enemyAttackMultiplier ?? 1))),
    def: Math.max(0, Math.round(baseDefense * (stage.enemyDefenseMultiplier ?? 1))),
    spd: Math.max(1, Math.round(baseSpeed * (stage.enemySpeedMultiplier ?? 1))),
    element: normalizeElement(enemy.element ?? linkedCharacter?.element ?? getEnemyElement(stage, waveIndex + 1)),
    isBoss,
  };
}

function resolveStage(stage: Stage): ResolvedStage {
  return {
    ...stage,
    enemies: stage.enemies.map((enemy, index) =>
      resolveEnemy(enemy, stage, index),
    ),
  };
}

const RESOLVED_STAGE_BY_ID = new Map(
  ALL_STAGES.map((stage) => {
    const resolved = resolveStage(stage);
    return [resolved.id, resolved] as const;
  }),
);

function validateGameData() {
  const characterIds = new Set(ROSTER.map((character) => character.id));
  const characterNames = new Set(ROSTER.map((character) => character.name));
  const stageIds = new Set(ALL_STAGES.map((stage) => stage.id));
  const expectedRosterSize = 151;
  if (
    ROSTER.length !== expectedRosterSize ||
    characterIds.size !== ROSTER.length
  ) {
    throw new Error(
      `Character catalog must contain ${expectedRosterSize} retained unique IDs.`,
    );
  }
  if (characterNames.size !== ROSTER.length) {
    throw new Error("Retained character names must be unique.");
  }
  const expectedSourceCounts = { gacha: 66, dungeon: 78, reward: 7 } as const;
  Object.entries(expectedSourceCounts).forEach(([source, expected]) => {
    const actual = ROSTER.filter((character) => character.source === source).length;
    if (actual !== expected) {
      throw new Error(`Retained ${source} catalog must contain ${expected} characters.`);
    }
  });
  const expectedRarityCounts: Record<Rarity, number> = {
    R: 81,
    SR: 39,
    SSR: 24,
    EX: 7,
  };
  Object.entries(expectedRarityCounts).forEach(([rarity, expected]) => {
    const actual = ROSTER.filter((character) => character.rarity === rarity).length;
    if (actual !== expected) {
      throw new Error(`Retained ${rarity} catalog must contain ${expected} characters.`);
    }
  });
  // Fixed evolution artwork and random appearance sets are validated separately.
  const eliteCharacterIds = new Set(
    ROSTER.filter(
      (character) => character.id !== LUCKY_BURNS_ID && (character.rarity === "SSR" || character.rarity === "EX"),
    ).map((character) => character.id),
  );
  const evolutionVisualIds = new Set<string>(EVOLUTION_12_CHARACTER_IDS);
  if (
    eliteCharacterIds.size !== ELITE_MOTION_CHARACTER_IDS.size ||
    eliteCharacterIds.size !== evolutionVisualIds.size ||
    [...eliteCharacterIds].some(
      (characterId) =>
        !ELITE_MOTION_CHARACTER_IDS.has(characterId) ||
        !evolutionVisualIds.has(characterId),
    )
  ) {
    throw new Error("Every fixed-appearance SSR and EX must have base and evolution-12 motion assets.");
  }
  if (LUCKY_BURNS_VISUALS.length !== 11 || LUCKY_BURNS_VISUALS.some((visual) =>
    !visual.portrait || visual.motionFrames.length !== 6 || new Set(visual.motionFrames).size !== 6
  )) throw new Error("Every Lucky Burns appearance must have six dedicated motion frames.");
  if (ALL_STAGES.length !== 494 || stageIds.size !== ALL_STAGES.length) {
    throw new Error("Stage catalog must contain 494 unique IDs.");
  }
  if (
    EXPANDED_GACHA_DESIGNS.length !== 75 ||
    DUNGEON_CHARACTER_DESIGNS.length !== 107
  ) {
    throw new Error("Character design catalog size is invalid.");
  }

  ROSTER.forEach((character) => {
    const stats = Object.values(character.baseStats);
    if (
      !character.name.trim() ||
      !character.role.trim() ||
      !character.skill.trim() ||
      !character.source ||
      stats.some((value) => !Number.isFinite(value) || value < 0)
    ) {
      throw new Error(`Invalid character data: ${character.id}`);
    }
  });

  ALL_STAGES.forEach((stage) => {
    if (!stage.enemies.length) {
      throw new Error(`Stage has no encounters: ${stage.id}`);
    }
    if (stage.recommended > 225) {
      throw new Error(`Recommended level cannot exceed 225: ${stage.id}`);
    }
    if (stage.dropCharacterId && !characterIds.has(stage.dropCharacterId)) {
      throw new Error(`Unknown stage reward: ${stage.id}`);
    }
    if (
      stage.firstClearRewardCharacterId &&
      !characterIds.has(stage.firstClearRewardCharacterId)
    ) {
      throw new Error(`Unknown first-clear reward: ${stage.id}`);
    }
    if (
      stage.dropCharacterPoolIds?.some(
        (characterId) => !characterIds.has(characterId),
      )
    ) {
      throw new Error(`Unknown stage reward pool: ${stage.id}`);
    }
    const resolved = RESOLVED_STAGE_BY_ID.get(stage.id)!;
    resolved.enemies.forEach((enemy) => {
      if (
        (enemy.characterId && !characterIds.has(enemy.characterId)) ||
        (!enemy.characterId &&
          !(enemy.id && PHASE4_NEW_ENEMY_ID_SET.has(enemy.id)) &&
          !PRESENTED_ABYSS_ENEMIES.some(
            (presented) => presented.image === enemy.image,
          )) ||
        !Number.isFinite(enemy.maxHp) ||
        enemy.maxHp <= 0 ||
        !Number.isFinite(enemy.atk) ||
        enemy.atk <= 0 ||
        !Number.isFinite(enemy.def) ||
        enemy.def < 0 ||
        !Number.isFinite(enemy.spd) ||
        enemy.spd <= 0
      ) {
        throw new Error(`Invalid enemy data: ${stage.id}/${enemy.name}`);
      }
    });
    if (!resolved.enemies.at(-1)?.isBoss) {
      throw new Error(`Stage is missing its final boss: ${stage.id}`);
    }
  });

  [
    ...EXPEDITION_STAGES,
    ...FEATURED_DUNGEON_STAGES,
    ...VOID_GAUNTLET_STAGES,
    ...PHASE4_EVENT_DUNGEONS,
    ...PHASE4_VOID_DUNGEONS,
  ].forEach((stage) => {
    if (stage.enemies.length < 3 || stage.enemies.length > 20) {
      throw new Error(`Dungeon length must be 3-20 floors: ${stage.id}`);
    }
  });

  VOID_GAUNTLET_STAGES.forEach((stage) => {
    if (
      stage.difficultyLabel !== "無級" ||
      stage.recommended > 225 ||
      stage.enemies.length !== 20 ||
      !stage.singleEnemyWaves ||
      !stage.reusesExistingBosses ||
      stage.dropCharacterId !== "void" ||
      stage.dropRate !== 0.8 ||
      stage.rewardMode !== "chance"
    ) {
      throw new Error(`Invalid 無 difficulty dungeon: ${stage.id}`);
    }
  });

  PHASE4_VOID_DUNGEONS.forEach((stage) => {
    if (
      stage.difficultyLabel !== "無級" ||
      stage.recommended > 225 ||
      stage.enemies.length < 3 ||
      stage.enemies.length > 20 ||
      !stage.singleEnemyWaves ||
      stage.reusesExistingBosses ||
      !stage.dropCharacterId ||
      stage.dropCharacterPoolIds?.length ||
      stage.dropRate !== 0.8 ||
      stage.firstClearRewardCharacterId ||
      stage.enemies.some((enemy) => {
        const enemyId = enemy.id ?? enemy.characterId;
        return !enemyId || !PHASE4_NEW_ENEMY_ID_SET.has(enemyId);
      })
    ) {
      throw new Error(`Invalid Phase 4 無 difficulty dungeon: ${stage.id}`);
    }
  });

  if (MATERIAL_STAGES.length !== 16) {
    throw new Error("Growth dungeons must contain four families and four tiers.");
  }
  const expectedMaterialDrops = [
    [0.1, 1, 0.15, 1],
    [0.5, 1, 0.5, 1],
    [0.7, 1, 0.8, 2],
    [0.95, 2, 1, 4],
  ];
  MATERIAL_STAGES.forEach((stage) => {
    const difficultyIndex = stage.number - 1;
    const expected = expectedMaterialDrops[difficultyIndex];
    const normal = stage.normalDefeatDrops?.[0];
    const boss = stage.bossDefeatDrops?.[0];
    if (
      stage.dropPolicy !== "defeat-only" ||
      stage.trainingCrystalReward !== undefined ||
      stage.evoStoneReward !== undefined ||
      !expected ||
      !normal ||
      !boss ||
      normal.kind !== boss.kind ||
      normal.chance !== expected[0] ||
      normal.amount !== expected[1] ||
      boss.chance !== expected[2] ||
      boss.amount !== expected[3]
    ) {
      throw new Error(`Invalid growth dungeon drops: ${stage.id}`);
    }
  });

  ALL_STAGES.filter(
    (stage) =>
      (stage.kind === "event" || stage.kind === "strong") &&
      (stage.dropCharacterId || stage.dropCharacterPoolIds?.length),
  ).forEach((stage) => {
    const difficulty = getStageDifficultyLabel(stage);
    const expected = difficulty
      ? EVENT_BOSS_DROP_RATES[difficulty]
      : undefined;
    if (expected === undefined || getStageCharacterDropRate(stage) !== expected)
      throw new Error(`Invalid event boss drop rate: ${stage.id}`);
  });

  GACHA_SERIES.forEach((series, index) => {
    (["R", "SR", "SSR"] as Rarity[]).forEach((rarity) => {
      if (!series.some((character) => character.rarity === rarity)) {
        throw new Error(`Gacha series ${index + 1} is missing ${rarity}.`);
      }
    });
  });

  if (!ELEMENT_ROTATION.length) {
    throw new Error("No complete elemental summon pool is available.");
  }
  ELEMENT_ROTATION.forEach((element) => {
    (["R", "SR", "SSR"] as Rarity[]).forEach((rarity) => {
      if (
        !STANDARD_GACHA_POOL.some(
          (character) =>
            character.rarity === rarity && character.element.includes(element),
        )
      ) {
        throw new Error(`Element summon ${element} is missing ${rarity}.`);
      }
    });
  });

  const seriesCharacters = GACHA_SERIES.flat();
  const standardIds = new Set(
    STANDARD_GACHA_POOL.map((character) => character.id),
  );
  if (
    seriesCharacters.length !== STANDARD_GACHA_POOL.length ||
    new Set(seriesCharacters.map((character) => character.id)).size !==
      standardIds.size ||
    seriesCharacters.some((character) => !standardIds.has(character.id))
  ) {
    throw new Error("Gacha series must partition the retained standard pool.");
  }
  STANDARD_GACHA_POOL.forEach((character) => {
    if (
      !characterIds.has(character.id) ||
      character.rarity === "EX" ||
      character.source !== "gacha"
    ) {
      throw new Error(`Invalid standard summon character: ${character.id}`);
    }
  });
  LIMITED_IDS.map(requireCharacter).forEach((character) => {
    if (
      character.rarity !== "SSR" ||
      character.source !== "gacha" ||
      standardIds.has(character.id)
    ) {
      throw new Error(`Invalid limited summon character: ${character.id}`);
    }
  });
  const totalRate = GACHA_RATES.SSR + GACHA_RATES.SR + GACHA_RATES.R;
  if (
    Math.abs(totalRate - 1) > Number.EPSILON ||
    !(GACHA_RATES.SSR < GACHA_RATES.SR && GACHA_RATES.SR < GACHA_RATES.R)
  ) {
    throw new Error("Summon rates must total 100% and decrease by rarity.");
  }
  const reachableGachaIds = new Set([...standardIds, ...LIMITED_IDS]);
  ROSTER.filter((character) => character.source === "gacha").forEach(
    (character) => {
      if (!reachableGachaIds.has(character.id)) {
        throw new Error(`Unreachable summon character: ${character.id}`);
      }
    },
  );
  if (ROLE_ROTATION.length !== 3 || ELEMENT_ROTATION.length === 0) {
    throw new Error("Focused summon pools must support every rarity tier.");
  }
  if (
    new Set(INITIAL_TEAM_IDS).size !== 3 ||
    INITIAL_TEAM_IDS.some((characterId) => !characterIds.has(characterId)) ||
    STARTER_EX_IDS.some(
      (characterId) => requireCharacter(characterId).rarity !== "EX",
    )
  ) {
    throw new Error("Starter character configuration is invalid.");
  }
  const equipmentIds = new Set(EQUIPMENT_ITEMS.map((item) => item.id));
  const equipmentNames = new Set(EQUIPMENT_ITEMS.map((item) => item.name));
  const equipmentSprites = new Set(
    EQUIPMENT_ITEMS.map((item) => item.spriteIndex),
  );
  const validTypes = new Set<UnitType>([
    "人間",
    "獣",
    "龍",
    "機械",
    "魔族",
    "天使",
    "精霊",
    "不明",
  ]);
  if (
    equipmentIds.size !== EQUIPMENT_ITEMS.length ||
    equipmentNames.size !== EQUIPMENT_ITEMS.length ||
    equipmentSprites.size !== EQUIPMENT_ITEMS.length ||
    EQUIPMENT_ITEMS.some(
      (item) =>
        !validTypes.has(item.type) ||
        item.price <= 0 ||
        item.spriteIndex < 0 ||
        item.spriteIndex >= 12,
    )
  ) {
    throw new Error("Equipment catalog is invalid.");
  }
  validTypes.forEach((type) => {
    if (!EQUIPMENT_ITEMS.some((item) => item.type === type))
      throw new Error(`Equipment catalog is missing type: ${type}`);
  });
  const synergyIds = new Set(PARTY_SYNERGIES.map((synergy) => synergy.id));
  const synergyNames = new Set(PARTY_SYNERGIES.map((synergy) => synergy.name));
  if (
    synergyIds.size !== PARTY_SYNERGIES.length ||
    synergyNames.size !== PARTY_SYNERGIES.length ||
    PARTY_SYNERGIES.some(
      (synergy) =>
        new Set(synergy.memberIds).size !== 3 ||
        synergy.memberIds.some((memberId) => !characterIds.has(memberId)),
    ) ||
    new Set(PARTY_SYNERGIES.flatMap((synergy) => synergy.memberIds)).size >=
      ROSTER.length
  ) {
    const unknownMembers = PARTY_SYNERGIES.flatMap((synergy) =>
      synergy.memberIds.filter((memberId) => !characterIds.has(memberId)),
    );
    throw new Error(
      `Party synergy catalog is invalid${unknownMembers.length ? `: ${unknownMembers.join(", ")}` : "."}`,
    );
  }
  ALL_STAGES.forEach((stage) => {
    const equipmentRate = getEquipmentDropChance(
      stage.kind,
      stage.recommended,
    );
    if (equipmentRate < 0.01 || equipmentRate > 0.02)
      throw new Error(`Invalid equipment drop rate: ${stage.id}`);
  });
}

function getStage(stageId: string): ResolvedStage {
  return (
    RESOLVED_STAGE_BY_ID.get(stageId) ??
    RESOLVED_STAGE_BY_ID.get(STAGES[0].id)!
  );
}

const EVENT_BOSS_DROP_RATES: Partial<Record<NonNullable<Stage["difficultyLabel"]>, number>> = {
  初級: 0.005,
  中級: 0.01,
  上級: 0.03,
  白級: 0.55,
  黒級: 0.6,
  無級: 0.8,
};

function getStageDifficultyLabel(stage: Stage): Stage["difficultyLabel"] {
  if (stage.difficultyLabel) return stage.difficultyLabel;
  if (stage.kind === "strong")
    return stage.title.startsWith("白") ? "白級" : "黒級";
  if (stage.number === 1) return "初級";
  if (stage.number === 2) return "中級";
  return "上級";
}

function getStageCharacterDropRate(stage: Stage) {
  if (
    !stage.dropCharacterId && !stage.dropCharacterPoolIds?.length
  )
    return 0;
  if (stage.kind !== "event" && stage.kind !== "strong")
    return getDirectCharacterDropRate(
      stage.rewardMode,
      stage.dropRate ?? 0,
    );
  const fixedRate = EVENT_BOSS_DROP_RATES[getStageDifficultyLabel(stage) ?? "初級"];
  return fixedRate ?? stage.dropRate ?? 0;
}

function getLegacyStageFirstClearCharacterId(stage: Stage) {
  if (stage.firstClearRewardCharacterId)
    return stage.firstClearRewardCharacterId;
  const difficulty = getStageDifficultyLabel(stage);
  if (
    (difficulty === "白級" || difficulty === "黒級") &&
    stage.dropCharacterId &&
    !stage.reusesExistingBosses
  )
    return stage.dropCharacterId;
  return undefined;
}

function getStageFirstClearCharacterId(stage: Stage) {
  if (stage.kind === "event" || stage.kind === "strong") return undefined;
  if (stage.rewardMode === "first-exchange" && stage.dropCharacterId)
    return stage.dropCharacterId;
  return getLegacyStageFirstClearCharacterId(stage);
}

function resolveStageCharacterDrop(stage: Stage, roll: number, choiceRoll: number) {
  if (roll >= getStageCharacterDropRate(stage)) return undefined;
  const pool = stage.dropCharacterPoolIds ?? [];
  return pool.length
    ? pool[Math.max(0, Math.min(pool.length - 1, Math.floor(choiceRoll * pool.length)))]
    : stage.dropCharacterId;
}

function formatDropRate(rate: number) {
  const percent = rate * 100;
  return `${Number.isInteger(percent) ? percent : percent.toFixed(1)}%`;
}

const MATERIAL_DROP_LABELS: Record<DefeatDropKind, string> = {
  trainingCrystals: "強化結晶",
  evoStones: "進化石",
  evolutionMaterialCharacters: "変化の幼精",
  skillMaterialCharacters: "技継ぎの導師",
};

function getMaterialCharacterForDrop(
  kind: DefeatDropKind,
): MaterialCharacter | undefined {
  if (
    kind !== "evolutionMaterialCharacters" &&
    kind !== "skillMaterialCharacters"
  )
    return undefined;
  return MATERIAL_CHARACTER_BY_PROFILE_KEY.get(kind);
}

function getMaterialDropSummary(stage: Stage) {
  const normal = stage.normalDefeatDrops?.[0];
  const boss = stage.bossDefeatDrops?.[0];
  if (!normal || !boss) return "撃破時に素材を抽選";
  return `${MATERIAL_DROP_LABELS[normal.kind]}　通常敵 ${formatDropRate(normal.chance)}×${normal.amount}／ボス ${formatDropRate(boss.chance)}×${boss.amount}`;
}

function getEnemyCount(stage: Stage, wave: number) {
  if (stage.singleEnemyWaves) return 1;
  if (stage.enemies[wave - 1]?.isBoss) return 1;
  const seed = [...`${stage.id}-${wave}`].reduce(
    (sum, character) => sum + character.charCodeAt(0),
    0,
  );
  if (wave === stage.enemies.length) {
    if (stage.kind === "strong" || stage.kind === "material") return 1;
    if (stage.kind === "event" || stage.kind === "abyss")
      return 1 + (seed % 2);
    return 1;
  }
  return 1 + (seed % 3);
}

function getWaveMaxHp(stage: Stage, wave: number) {
  const enemy = stage.enemies[wave - 1];
  const count = getEnemyCount(stage, wave);
  return Math.round(enemy.maxHp * (1 + (count - 1) * 0.72));
}

function getEnemyUnitMaxHp(stage: Stage, wave: number) {
  return Math.max(
    1,
    Math.round(getWaveMaxHp(stage, wave) / getEnemyCount(stage, wave)),
  );
}

function createWaveEnemyHps(stage: Stage, wave: number) {
  return getWaveEnemies(stage, wave).map((enemy) => enemy.maxHp);
}

const waveEnemyCache = new Map<string, WaveEnemy[]>();
export function getWaveEnemies(stage: Stage, wave: number): WaveEnemy[] {
  const key = `${stage.id}:${wave}`;
  const cached = waveEnemyCache.get(key);
  if (cached) return cached;
  const authored = ALL_STAGES.find((candidate) => candidate.id === stage.id) ?? stage;
  const primary = authored.enemies[wave - 1];
  const count = getEnemyCount(stage, wave);
  const candidates = [...authored.enemies, ...NORMAL_ENEMY_POOL].filter((enemy) => !enemy.isBoss && enemy.image !== primary.image);
  const usedImages = new Set([primary.image]);
  const seed = [...key].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const weights = [1, 0.82, 1.18].slice(0, count);
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  const enemies = Array.from({ length: count }, (_, index): WaveEnemy => {
    const candidate = index === 0 ? primary : candidates
      .slice(seed % Math.max(1, candidates.length))
      .concat(candidates)
      .find((enemy) => !usedImages.has(enemy.image)) ?? primary;
    usedImages.add(candidate.image);
    const resolved = resolveEnemy({ ...candidate, isBoss: index === 0 && primary.isBoss, maxHp: primary.maxHp }, authored, wave - 1);
    const combatStyle = count === 1 ? "standard" : (["striker", "swift", "armored"] as const)[index];
    return {
      ...resolved,
      maxHp: Math.max(1, Math.round(getWaveMaxHp(stage, wave) * weights[index] / weightTotal)),
      atk: Math.round(resolved.atk * (combatStyle === "striker" ? 1.18 : combatStyle === "swift" ? 0.85 : 1)),
      def: Math.round(resolved.def * (combatStyle === "armored" ? 1.4 : combatStyle === "swift" ? 0.8 : 1)),
      spd: Math.max(1, Math.round(resolved.spd * (combatStyle === "swift" ? 1.5 : combatStyle === "armored" ? 0.7 : 1))),
      combatStyle,
    };
  });
  waveEnemyCache.set(key, enemies);
  return enemies;
}

export function getEnemyAttackMultiplier(enemy: WaveEnemy, turn: number) {
  return enemy.combatStyle === "striker" && turn % 3 === 0 ? 1.5
    : enemy.combatStyle === "swift" ? 0.9 : 1;
}

export function sortCombatInitiative<T extends { kind: "party" | "enemy"; speed: number; tie: number }>(steps: T[]): T[] {
  return [...steps].sort((left, right) => right.speed - left.speed
    || Number(left.kind === "enemy") - Number(right.kind === "enemy") || left.tie - right.tie);
}

function getAliveEnemyIndices(enemyHps: number[]) {
  return enemyHps.flatMap((hp, index) => (hp > 0 ? [index] : []));
}

function getNextTargetEnemyIndex(enemyHps: number[], preferred = 0) {
  if (enemyHps[preferred] > 0) return preferred;
  return getAliveEnemyIndices(enemyHps)[0] ?? 0;
}

function getActionScope(
  character: Character,
  action: BattleAction,
  skill?: CharacterSkill,
) {
  if (action === "attack") return character.attackScope ?? "single";
  if (action === "skill" && skill?.kind === "damage") return skill.scope;
  return "single";
}

function getStars(totalTurns: number, floors = 3) {
  return totalTurns <= floors * 2 ? 3 : totalTurns <= floors * 3 ? 2 : 1;
}

function getPlayerXpNeeded(level: number) {
  return 100 + level * 50;
}

function getTrainingCrystalCost(characterLevel: number) {
  return Math.max(1, Math.ceil(characterLevel / 5));
}

function getStagePlayerXp(stage: Stage) {
  if (stage.playerXpReward) return stage.playerXpReward;
  if (stage.kind === "strong") return 360 + stage.chapter * 25;
  if (stage.kind === "event") return [80, 150, 260][stage.number - 1] ?? 80;
  if (stage.kind === "abyss") return 45 + Math.ceil(stage.chapter / 5) * 5;
  return 45 + Math.floor(stage.chapter / 3) * 8;
}

function addPlayerXp(level: number, xp: number, gained: number) {
  let nextLevel = level;
  let nextXp = xp + gained;
  while (nextLevel < 100 && nextXp >= getPlayerXpNeeded(nextLevel)) {
    nextXp -= getPlayerXpNeeded(nextLevel);
    nextLevel += 1;
  }
  return { playerLevel: nextLevel, playerXp: nextLevel >= 100 ? 0 : nextXp };
}

const INITIAL_TEAM_IDS = [
  "wave1-flam",
  "wave1-aqua",
  "wave1-seed",
] as const;
const PARTY_COUNT = 5;
const PARTY_SIZE = 3;
const PROFILE_STORAGE_KEY = "relic-rush-profile-v1";
const BATTLE_ACTION_PLAYBACK_RATE = 0.75;
const BATTLE_ACTION_GAP_MS = Math.round(820 / BATTLE_ACTION_PLAYBACK_RATE);
const BATTLE_PARTY_IMPACT_DELAY_MS = Math.round(
  300 / BATTLE_ACTION_PLAYBACK_RATE,
);
const BATTLE_EX_IMPACT_DELAY_MS = Math.round(
  390 / BATTLE_ACTION_PLAYBACK_RATE,
);
const BATTLE_ENEMY_IMPACT_DELAY_MS = Math.round(
  300 / BATTLE_ACTION_PLAYBACK_RATE,
);
const BATTLE_ENEMY_RECOVERY_DELAY_MS = Math.round(
  760 / BATTLE_ACTION_PLAYBACK_RATE,
);
const BATTLE_EX_CUTIN_VISIBLE_MS = Math.round(
  760 / BATTLE_ACTION_PLAYBACK_RATE,
);
const INITIAL_TEAM_LEVELS: Record<string, number> = {
  "wave1-flam": 12,
  "wave1-aqua": 11,
  "wave1-seed": 10,
};
const INITIAL_LEVELS = Object.fromEntries(
  ROSTER.map((character) => [
    character.id,
    INITIAL_TEAM_LEVELS[character.id] ?? 1,
  ]),
);
const INITIAL_EVOLUTIONS = Object.fromEntries(
  ROSTER.map((character) => [character.id, 0]),
);
const INITIAL_SKILL_LEVELS = Object.fromEntries(
  ROSTER.flatMap((character) =>
    getCharacterSkills(character, 20).map((skill) => [skill.id, 1]),
  ),
);
const INITIAL_PROFILE: Profile = {
  username: "冒険者",
  userId: "",
  gems: 4500,
  gold: 3200,
  pity: 0,
  limitedPity: {},
  clears: 0,
  teamLevel: 12,
  playerLevel: 1,
  playerXp: 0,
  shards: 0,
  trainingCrystals: 40,
  evoStones: 12,
  dragonHeadStones: 0,
  crownStones: 0,
  liberationBooks: 0,
  evolutionMaterialCharacters: 0,
  skillMaterialCharacters: 0,
  abyssFloor: 0,
  owned: [...INITIAL_TEAM_IDS],
  team: [...INITIAL_TEAM_IDS],
  parties: Array.from({ length: PARTY_COUNT }, () => [...INITIAL_TEAM_IDS]),
  activePartyIndex: 0,
  levels: INITIAL_LEVELS,
  evolutions: INITIAL_EVOLUTIONS,
  skillLevels: INITIAL_SKILL_LEVELS,
  characterCopies: {},
  bossTokens: {},
  stageStars: {},
  bestTurns: {},
  stageCharacterClaims: [],
  claimedBattleRuns: [],
  equipmentInventory: {},
  equippedItems: {},
  dailyShopPurchases: [],
  discoveredSynergyIds: [],
  seVolume: 60,
  usedCodes: [],
  starterGiftClaimed: false,
  starterGiftCharacterId: null,
  rerollGiftClaimed: false,
};

validateGameData();

function createUserId() {
  const bytes = new Uint8Array(4);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  const random = Array.from(bytes, (value) => value.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return `RR-${random.slice(0, 4)}-${random.slice(4)}`;
}

const LEGACY_CONTROL_FIELDS = [
  "bgmVolume",
  "eventOffset",
  "strongOffset",
  "limitedOffset",
] as const;

function sanitizeSavedProfile(value: Partial<Profile>): Partial<Profile> {
  const cleaned = { ...value } as Partial<Profile> & Record<string, unknown>;
  LEGACY_CONTROL_FIELDS.forEach((field) => delete cleaned[field]);
  return cleaned;
}

function filterCharacterRecord<T>(
  value: Record<string, T> | null | undefined,
) {
  return Object.fromEntries(
    Object.entries(value ?? {}).filter(([characterId]) =>
      CHARACTER_BY_ID.has(characterId),
    ),
  ) as Record<string, T>;
}

function filterStageRecord<T>(value: Record<string, T> | null | undefined) {
  return Object.fromEntries(
    Object.entries(value ?? {}).filter(([stageId]) => STAGE_ID_SET.has(stageId)),
  ) as Record<string, T>;
}

function normalizeProfileCharacters(profile: Profile): Profile {
  const savedOwned = Array.isArray(profile.owned) ? profile.owned : [];
  const savedParty = Array.isArray(profile.team) ? profile.team : [];
  const starterGiftCharacterId = STARTER_EX_IDS.includes(
    (profile.starterGiftCharacterId ?? "") as (typeof STARTER_EX_IDS)[number],
  )
    ? profile.starterGiftCharacterId
    : null;
  const owned = Array.from(
    new Set(
      savedOwned.filter((characterId) => CHARACTER_BY_ID.has(characterId)),
    ),
  );
  if (
    profile.starterGiftClaimed &&
    starterGiftCharacterId &&
    !owned.includes(starterGiftCharacterId)
  ) {
    owned.push(starterGiftCharacterId);
  }
  INITIAL_TEAM_IDS.forEach((characterId) => {
    if (owned.length < 3 && !owned.includes(characterId)) owned.push(characterId);
  });
  const normalizeParty = (candidate: unknown) => {
    const selected = Array.from(
      new Set(
        (Array.isArray(candidate) ? candidate : []).filter(
          (characterId): characterId is string =>
            typeof characterId === "string" &&
            CHARACTER_BY_ID.has(characterId) &&
            owned.includes(characterId),
        ),
      ),
    ).slice(0, PARTY_SIZE);
    return [
      ...selected,
      ...owned.filter((characterId) => !selected.includes(characterId)),
    ].slice(0, PARTY_SIZE);
  };
  const legacyTeam = normalizeParty(savedParty);
  const savedParties = Array.isArray(profile.parties) ? profile.parties : [];
  const parties = Array.from({ length: PARTY_COUNT }, (_, index) =>
    normalizeParty(savedParties[index] ?? legacyTeam),
  );
  const activePartyIndex = Math.max(
    0,
    Math.min(
      PARTY_COUNT - 1,
      Number.isInteger(profile.activePartyIndex) ? profile.activePartyIndex : 0,
    ),
  );
  const team = parties[activePartyIndex];
  const savedStageCharacterClaims = (
    Array.isArray(profile.stageCharacterClaims)
      ? profile.stageCharacterClaims
      : []
  ).filter((claim) => {
    if (typeof claim !== "string") return false;
    const separator = claim.indexOf(":");
    if (separator < 1) return false;
    const stageId = claim.slice(0, separator);
    const characterId = claim.slice(separator + 1);
    return STAGE_ID_SET.has(stageId) && CHARACTER_BY_ID.has(characterId);
  });
  // Before receipt tracking existed, legacy first-clear rewards were keyed only
  // by stageStars. Backfill exactly those old guarantees so existing saves never
  // receive them twice, while newly fixed first-exchange stages remain claimable.
  const legacyStageCharacterClaims = Object.entries(profile.stageStars ?? {})
    .filter(([, stars]) => Number(stars) > 0)
    .flatMap(([stageId]) => {
      const stage = RESOLVED_STAGE_BY_ID.get(stageId);
      const characterId = stage
        ? getLegacyStageFirstClearCharacterId(stage)
        : undefined;
      return characterId
        ? [getStageCharacterClaimKey(stageId, characterId)]
        : [];
    });
  const stageCharacterClaims = Array.from(
    new Set([
      ...savedStageCharacterClaims,
      ...legacyStageCharacterClaims,
    ]),
  );
  const skillLevels = Object.fromEntries(
    ROSTER.flatMap((character) =>
      getCharacterSkills(character, 20).map((skill) => [
        skill.id,
        Math.max(
          1,
          Math.min(
            6,
            Math.floor(
              Number(profile.skillLevels?.[skill.id]) ||
                Number(profile.skillLevels?.[character.id]) ||
                1,
            ),
          ),
        ),
      ]),
    ),
  );
  const claimedBattleRuns = Array.from(
    new Set(
      (Array.isArray(profile.claimedBattleRuns)
        ? profile.claimedBattleRuns
        : []
      ).filter((runId): runId is string => typeof runId === "string" && Boolean(runId)),
    ),
  ).slice(-MAX_CLAIMED_BATTLE_RUNS);
  const equipmentInventory = Object.fromEntries(
    Object.entries(profile.equipmentInventory ?? {})
      .filter(([equipmentId]) => EQUIPMENT_BY_ID.has(equipmentId))
      .map(([equipmentId, amount]) => [
        equipmentId,
        Math.max(
          0,
          Math.min(
            MAX_EQUIPMENT_COUNT,
            Math.floor(Number(amount) || 0),
          ),
        ),
      ]),
  );
  const equippedItems: Record<string, string> = {};
  const equippedCounts: Record<string, number> = {};
  ROSTER.forEach((character) => {
    if (!owned.includes(character.id)) return;
    const equipmentId = profile.equippedItems?.[character.id];
    const item = EQUIPMENT_BY_ID.get(equipmentId ?? "");
    if (
      !item ||
      !isEquipmentCompatible(character.types ?? ["不明"], item) ||
      (equippedCounts[item.id] ?? 0) >= (equipmentInventory[item.id] ?? 0)
    )
      return;
    equippedItems[character.id] = item.id;
    equippedCounts[item.id] = (equippedCounts[item.id] ?? 0) + 1;
  });
  const dailyShopPurchases = Array.from(
    new Set(
      (Array.isArray(profile.dailyShopPurchases)
        ? profile.dailyShopPurchases
        : []
      ).filter((purchaseId): purchaseId is string => {
        if (typeof purchaseId !== "string") return false;
        const match = purchaseId.match(/^(\d{4}-\d{2}-\d{2}):([0-5]):(.+)$/);
        return Boolean(match && EQUIPMENT_BY_ID.has(match[3]));
      }),
    ),
  ).slice(-180);
  const discoveredSynergyIds = Array.from(
    new Set(
      (Array.isArray(profile.discoveredSynergyIds)
        ? profile.discoveredSynergyIds
        : []
      ).filter(
        (synergyId): synergyId is string =>
          typeof synergyId === "string" && PARTY_SYNERGY_BY_ID.has(synergyId),
      ),
    ),
  );
  return {
    ...profile,
    owned,
    team,
    parties,
    activePartyIndex,
    levels: {
      ...INITIAL_LEVELS,
      ...filterCharacterRecord(profile.levels),
    },
    evolutions: {
      ...INITIAL_EVOLUTIONS,
      ...filterCharacterRecord(profile.evolutions),
    },
    skillLevels,
    evolutionMaterialCharacters: Math.max(
      0,
      Math.min(
        MAX_ITEM_COUNT,
        Math.floor(Number(profile.evolutionMaterialCharacters) || 0),
      ),
    ),
    skillMaterialCharacters: Math.max(
      0,
      Math.min(
        MAX_ITEM_COUNT,
        Math.floor(Number(profile.skillMaterialCharacters) || 0),
      ),
    ),
    characterCopies: filterCharacterRecord(profile.characterCopies),
    bossTokens: filterCharacterRecord(profile.bossTokens),
    stageStars: filterStageRecord(profile.stageStars),
    bestTurns: filterStageRecord(profile.bestTurns),
    stageCharacterClaims,
    claimedBattleRuns,
    equipmentInventory,
    equippedItems,
    dailyShopPurchases,
    discoveredSynergyIds,
    limitedPity: Object.fromEntries(
      Object.entries(profile.limitedPity ?? {}).filter(([characterId]) =>
        LIMITED_IDS.includes(characterId),
      ),
    ),
    starterGiftCharacterId,
    starterGiftClaimed:
      profile.starterGiftClaimed && starterGiftCharacterId !== null,
    rerollGiftClaimed: profile.rerollGiftClaimed === true,
  };
}

function createFreshProfile(current: Profile): Profile {
  return normalizeProfileCharacters({
    ...INITIAL_PROFILE,
    userId: createUserId(),
    seVolume: current.seVolume,
    limitedPity: {},
    owned: [...INITIAL_PROFILE.owned],
    team: [...INITIAL_PROFILE.team],
    parties: INITIAL_PROFILE.parties.map((party) => [...party]),
    activePartyIndex: 0,
    levels: { ...INITIAL_LEVELS },
    evolutions: { ...INITIAL_EVOLUTIONS },
    skillLevels: { ...INITIAL_SKILL_LEVELS },
    characterCopies: {},
    bossTokens: {},
    stageStars: {},
    bestTurns: {},
    claimedBattleRuns: [],
    equipmentInventory: {},
    equippedItems: {},
    dailyShopPurchases: [],
    discoveredSynergyIds: [],
    usedCodes: [],
  });
}

function clearStorageByPrefix(storage: Storage, prefix: string) {
  const keys = Array.from({ length: storage.length }, (_, index) =>
    storage.key(index),
  ).filter((key): key is string => Boolean(key?.startsWith(prefix)));
  keys.forEach((key) => storage.removeItem(key));
}

const PROMO_CODES: Record<
  string,
  {
    gems: number;
    gold: number;
    stones: number;
    crystals?: number;
    dragonHeadStones?: number;
    crownStones?: number;
    liberationBooks?: number;
    evolutionMaterialCharacters?: number;
    skillMaterialCharacters?: number;
    xp: number;
    label: string;
    allCharacters?: boolean;
    maxInventory?: boolean;
  }
> = {
  RELIC2026: { gems: 3000, gold: 5000, stones: 5, xp: 0, label: "冒険開始セット" },
  PIXELRUSH: { gems: 900, gold: 2500, stones: 3, xp: 0, label: "ドット勇者セット" },
  ABYSS100: { gems: 1200, gold: 3200, stones: 4, xp: 0, label: "奈落応援セット" },
  THANKU: { gems: 0, gold: 0, stones: 0, xp: 100000, label: "経験値100,000" },
  GOODLUCK: { gems: 120000, gold: 0, stones: 0, xp: 0, label: "ダイヤ120,000個" },
  HUNGRY: { gems: 0, gold: 100000, stones: 0, xp: 0, label: "コイン100,000枚" },
  CIT: {
    gems: 0,
    gold: 1000000,
    stones: 100000,
    crystals: 100000,
    dragonHeadStones: 50000,
    crownStones: 50000,
    liberationBooks: 50000,
    evolutionMaterialCharacters: 50000,
    skillMaterialCharacters: 50000,
    xp: 0,
    label: "全キャラ・育成素材セット",
    allCharacters: true,
  },
  CIT99: {
    gems: 0,
    gold: 0,
    stones: 0,
    xp: 0,
    label: "所持上限解放セット",
    maxInventory: true,
  },
};

const MAX_GOLD = 99_999_999;
const MAX_ITEM_COUNT = 999_999;
const MAX_EQUIPMENT_COUNT = 999;
const MAX_CLAIMED_BATTLE_RUNS = 100;

function createEmptyRunLoot(): RunLoot {
  return {
    trainingCrystals: 0,
    evoStones: 0,
    evolutionMaterialCharacters: 0,
    skillMaterialCharacters: 0,
  };
}

function createBattleRunId() {
  const random = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${random}`;
}

function deterministicDropRoll(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4_294_967_296;
}

function getDefeatLoot(
  stage: ResolvedStage,
  wave: number,
  enemyIndex: number,
  runId: string,
) {
  const defeatedEnemy = stage.enemies[wave - 1];
  const drops = defeatedEnemy.isBoss
    ? stage.bossDefeatDrops
    : stage.normalDefeatDrops;
  const loot = createEmptyRunLoot();
  (drops ?? []).forEach((drop) => {
    const roll = deterministicDropRoll(
      `${runId}:${wave}:${enemyIndex}:${drop.kind}`,
    );
    if (roll < drop.chance) loot[drop.kind] += drop.amount;
  });
  return loot;
}

function addRunLoot(current: RunLoot, gained: RunLoot): RunLoot {
  return {
    trainingCrystals: current.trainingCrystals + gained.trainingCrystals,
    evoStones: current.evoStones + gained.evoStones,
    evolutionMaterialCharacters:
      current.evolutionMaterialCharacters +
      gained.evolutionMaterialCharacters,
    skillMaterialCharacters:
      current.skillMaterialCharacters + gained.skillMaterialCharacters,
  };
}

function settleRunLoot(profile: Profile, battle: Battle): Profile {
  if (profile.claimedBattleRuns.includes(battle.runId)) return profile;
  return {
    ...profile,
    trainingCrystals: Math.min(
      MAX_ITEM_COUNT,
      profile.trainingCrystals + battle.runLoot.trainingCrystals,
    ),
    evoStones: Math.min(
      MAX_ITEM_COUNT,
      profile.evoStones + battle.runLoot.evoStones,
    ),
    evolutionMaterialCharacters: Math.min(
      MAX_ITEM_COUNT,
      profile.evolutionMaterialCharacters +
        battle.runLoot.evolutionMaterialCharacters,
    ),
    skillMaterialCharacters: Math.min(
      MAX_ITEM_COUNT,
      profile.skillMaterialCharacters + battle.runLoot.skillMaterialCharacters,
    ),
    claimedBattleRuns: [...profile.claimedBattleRuns, battle.runId].slice(
      -MAX_CLAIMED_BATTLE_RUNS,
    ),
  };
}

function normalizeBattlePartyIds(
  candidate: readonly string[] | undefined,
  fallback: readonly string[] = INITIAL_TEAM_IDS,
): [string, string, string] {
  const normalize = (ids: readonly string[]) =>
    Array.from(
      new Set(ids.filter((characterId) => CHARACTER_BY_ID.has(characterId))),
    ).slice(0, PARTY_SIZE);
  const selected = normalize(candidate ?? []);
  const resolved = selected.length === PARTY_SIZE ? selected : normalize(fallback);
  const safe =
    resolved.length === PARTY_SIZE ? resolved : [...INITIAL_TEAM_IDS];
  return [safe[0], safe[1], safe[2]];
}

function newBattle(
  stageId = STAGES[0].id,
  synergyId: string | null = null,
  partyIds: readonly string[] = INITIAL_TEAM_IDS,
): Battle {
  const stage = getStage(stageId);
  const enemyHps = createWaveEnemyHps(stage, 1);
  return {
    phase: "combat",
    stageId,
    partyIds: normalizeBattlePartyIds(partyIds),
    wave: 1,
    turn: 1,
    totalTurns: 0,
    enemyHps,
    enemyMaxHps: [...enemyHps],
    actingEnemyIndex: -1,
    targetEnemyIndex: 0,
    targetEnemyIndices: [0, 0, 0],
    selectedPartyIndex: 0,
    hitEnemyIndices: [],
    enemyDamageNumbers: enemyHps.map(() => null),
    partyHpChange: null,
    partyHp: stage.startingPartyHp ?? (stage.number === 1 ? 100 : 90),
    cooldowns: [[], [], []],
    selectedSkillIndices: [0, 0, 0],
    runId: createBattleRunId(),
    processedDefeatKeys: [],
    runLoot: createEmptyRunLoot(),
    activePartyEffects: [],
    synergyId: synergyId && PARTY_SYNERGY_BY_ID.has(synergyId) ? synergyId : null,
    ultimate: 0,
    actions: [null, null, null],
    activeActions: [null, null, null],
    animating: false,
    actingIndex: -1,
    enemyActing: false,
    blessings: [],
    message:
      getEnemyCount(stage, 1) > 1
        ? `全${stage.enemies.length}戦。敵をタップして狙いを決めよう。`
        : `全${stage.enemies.length}戦。3人の行動を選ぼう。`,
  };
}

function normalizeBattleState(
  value: Partial<Battle> & { enemyHp?: number },
  fallbackPartyIds: readonly string[] = INITIAL_TEAM_IDS,
): Battle {
  const stage = getStage(value.stageId ?? STAGES[0].id);
  const wave = Math.min(
    Math.max(1, value.wave ?? 1),
    stage.enemies.length,
  );
  const synergyId =
    typeof value.synergyId === "string" &&
    PARTY_SYNERGY_BY_ID.has(value.synergyId)
      ? value.synergyId
      : null;
  const partyIds = normalizeBattlePartyIds(value.partyIds, fallbackPartyIds);
  const activeSynergy = getActivePartySynergy(partyIds);
  const validatedSynergyId =
    synergyId && activeSynergy?.id === synergyId ? synergyId : null;
  const fresh = newBattle(stage.id, validatedSynergyId, partyIds);
  const maxHps = createWaveEnemyHps(stage, wave);
  const legacyRatio =
    typeof value.enemyHp === "number"
      ? Math.max(0, Math.min(1, value.enemyHp / getWaveMaxHp(stage, wave)))
      : 1;
  const enemyHps =
    Array.isArray(value.enemyHps) && value.enemyHps.length === maxHps.length
      ? value.enemyHps.map((hp, index) =>
          Math.max(0, Math.min(maxHps[index], Math.round((Number(hp) || 0) / Math.max(1, value.enemyMaxHps?.[index] ?? getEnemyUnitMaxHp(stage, wave)) * maxHps[index]))),
        )
      : maxHps.map((maxHp) => Math.round(maxHp * legacyRatio));
  const targetEnemyIndex = getNextTargetEnemyIndex(
    enemyHps,
    value.targetEnemyIndex ?? 0,
  );
  const targetEnemyIndices = [0, 1, 2].map((partyIndex) =>
    getNextTargetEnemyIndex(
      enemyHps,
      Array.isArray(value.targetEnemyIndices)
        ? (value.targetEnemyIndices[partyIndex] ?? targetEnemyIndex)
        : targetEnemyIndex,
    ),
  ) as Battle["targetEnemyIndices"];
  const selectedPartyIndex = Math.max(
    0,
    Math.min(
      PARTY_SIZE - 1,
      Number.isInteger(value.selectedPartyIndex)
        ? (value.selectedPartyIndex ?? 0)
        : 0,
    ),
  );
  const selectedSkillIndices = [0, 1, 2].map((partyIndex) =>
    Math.max(
      0,
      Math.min(
        1,
        Number.isInteger(value.selectedSkillIndices?.[partyIndex])
          ? value.selectedSkillIndices![partyIndex]
          : 0,
      ),
    ),
  ) as Battle["selectedSkillIndices"];
  const savedRunLoot = value.runLoot;
  const runLoot = Object.fromEntries(
    Object.keys(createEmptyRunLoot()).map((kind) => [
      kind,
      Math.max(
        0,
        Math.floor(
          Number(savedRunLoot?.[kind as DefeatDropKind]) || 0,
        ),
      ),
    ]),
  ) as RunLoot;
  const cooldowns = [0, 1, 2].map((partyIndex) => {
    const savedCooldowns = value.cooldowns?.[partyIndex];
    if (Array.isArray(savedCooldowns))
      return savedCooldowns.slice(0, 2).map((cooldown) =>
        Math.max(0, Math.floor(Number(cooldown) || 0)),
      );
    return [Math.max(0, Math.floor(Number(savedCooldowns) || 0))];
  }) as Battle["cooldowns"];
  return {
    ...fresh,
    ...value,
    stageId: stage.id,
    wave,
    enemyHps,
    targetEnemyIndex: targetEnemyIndices[selectedPartyIndex],
    targetEnemyIndices,
    selectedPartyIndex,
    cooldowns,
    selectedSkillIndices,
    runId:
      typeof value.runId === "string" && value.runId
        ? value.runId
        : fresh.runId,
    processedDefeatKeys: Array.isArray(value.processedDefeatKeys)
      ? [...new Set(value.processedDefeatKeys.filter((key) => typeof key === "string"))]
      : [],
    runLoot,
    activePartyEffects: Array.isArray(value.activePartyEffects)
      ? value.activePartyEffects.filter(
          (effect): effect is ActivePartyEffect =>
            Boolean(effect) &&
            typeof effect.id === "string" &&
            typeof effect.sourceCharacterId === "string" &&
            ["atk", "def", "spd", "regen"].includes(effect.kind) &&
            ["self", "party"].includes(effect.scope) &&
            Number.isFinite(effect.remainingTurns) &&
            effect.remainingTurns > 0,
        )
      : [],
    partyIds,
    synergyId: validatedSynergyId,
    ultimate: Math.max(
      0,
      Math.min(
        getUltimateGaugeMax(
          validatedSynergyId
            ? PARTY_SYNERGY_BY_ID.get(validatedSynergyId) ?? null
            : null,
        ),
        Math.floor(Number(value.ultimate) || 0),
      ),
    ),
    hitEnemyIndices: [],
    enemyMaxHps: maxHps,
    actingEnemyIndex: -1,
    enemyDamageNumbers: enemyHps.map(() => null),
    partyHpChange: null,
    activeActions: [null, null, null],
    animating: false,
    actingIndex: -1,
    enemyActing: false,
  } as Battle;
}

function damageEnemies(state: Battle, damageByEnemy: number[]): Battle {
  const stage = getStage(state.stageId);
  const enemyHps = state.enemyHps.map((hp, index) =>
    Math.max(0, hp - (damageByEnemy[index] ?? 0)),
  );
  if (enemyHps.some((hp) => hp > 0))
    {
      const targetEnemyIndices = state.targetEnemyIndices.map((target) =>
        getNextTargetEnemyIndex(enemyHps, target),
      ) as Battle["targetEnemyIndices"];
      return {
        ...state,
        enemyHps,
        targetEnemyIndex:
          targetEnemyIndices[state.selectedPartyIndex] ??
          targetEnemyIndices[0],
        targetEnemyIndices,
      };
    }
  if (state.wave === stage.enemies.length)
    return {
      ...state,
      enemyHps,
      phase: "victory",
      message: `${stage.enemies[stage.enemies.length - 1].name}たちを撃破した！`,
    };
  return {
    ...state,
    enemyHps,
    phase: "blessing",
    message: `${stage.enemies[state.wave - 1].name}たちを倒した！`,
  };
}

function getBannerPool(banner: SummonBanner, series = 0) {
  const special = getSpecialRotation();
  if (banner === "standard") return GACHA_SERIES[series] ?? GACHA_SERIES[0];
  const standard = STANDARD_GACHA_POOL;
  if (banner === "element")
    return standard.filter((character) =>
      character.element.includes(special.element),
    );
  if (banner === "role")
    return standard.filter((character) => character.skillKind === special.role);
  return standard;
}

function rollRarity(guaranteeHigh: boolean): Rarity {
  const roll = Math.random();
  if (roll < GACHA_RATES.SSR) return "SSR";
  if (roll < GACHA_RATES.SSR + GACHA_RATES.SR || guaranteeHigh) return "SR";
  return "R";
}

const DUPLICATE_SHARDS: Record<Rarity, number> = {
  R: 1,
  SR: 5,
  SSR: 15,
  EX: 0,
};

function resolveSummonResults(owned: string[], results: Character[]) {
  const seen = new Set(owned);
  const acquired: string[] = [];
  let shards = 0;
  results.forEach((character) => {
    if (seen.has(character.id)) {
      shards += DUPLICATE_SHARDS[character.rarity];
      return;
    }
    seen.add(character.id);
    acquired.push(character.id);
  });
  return { owned: [...owned, ...acquired], shards };
}

function pickFromPool(pool: Character[], guaranteeHigh = false): Character {
  const rarity = rollRarity(guaranteeHigh);
  const rarityPool = pool.filter((character) => character.rarity === rarity);
  return rarityPool[Math.floor(Math.random() * rarityPool.length)];
}

function pickGuaranteedRarity(pool: Character[], rarity: Rarity): Character {
  const rarityPool = pool.filter((character) => character.rarity === rarity);
  if (rarityPool.length === 0)
    throw new Error(`Summon pool has no ${rarity} characters.`);
  return rarityPool[Math.floor(Math.random() * rarityPool.length)];
}

function rollRerollTen(): Character[] {
  return rollGuaranteedRarityDraw(
    10,
    "SSR",
    () => pickFromPool(STANDARD_GACHA_POOL),
    () => pickGuaranteedRarity(STANDARD_GACHA_POOL, "SSR"),
  );
}

function getDungeonWideRules(stage: ResolvedStage): string[] {
  // Dungeon authoring policy: difficulty may strengthen even familiar small
  // enemies; future global modifiers may include ally HP 50% or ATK x1.5.
  // Enemy-only gimmicks stay out of this list and are disclosed by long press.
  const rules = [stage.rule];
  if (stage.kind === "abyss") rules.push("全3戦・途中で一時強化を1つ選択");
  if (stage.kind === "strong") rules.push("高難度補正：敵の基礎能力が大幅上昇");
  return [...new Set(rules.filter(Boolean))];
}

function getEnemySpecialRules(
  stage: ResolvedStage,
  enemy: ResolvedEnemy,
): string[] {
  const rules = [`次の行動：${enemy.intent}`];
  const style = (enemy as WaveEnemy).combatStyle;
  if (style === "striker") rules.push("強襲：3ターンごとに与えるダメージが1.5倍");
  if (style === "swift") rules.push("速攻：高い速度で先行する。攻撃の威力は90%");
  if (style === "armored") rules.push("重装：防御力が高く、行動速度は低い");
  if ((enemy.isBoss || stage.gimmick?.appliesToAllEnemies) && stage.gimmick)
    rules.push(`${stage.gimmick.name}：${stage.gimmick.description}`);
  return rules;
}

function pickCharacter(
  guaranteeHigh: boolean,
  forceSSR: boolean,
  banner: SummonBanner,
  featured: Character,
  series: number,
): Character {
  const rarity: Rarity = forceSSR ? "SSR" : rollRarity(guaranteeHigh);
  if (rarity === "SSR" && banner === "limited" && Math.random() < 0.5)
    return featured;
  const focused = getBannerPool(banner, series).filter(
    (character) => character.rarity === rarity,
  );
  const fallback = getBannerPool("standard", series).filter(
    (character) => character.rarity === rarity,
  );
  const pool = focused.length ? focused : fallback;
  return pool[Math.floor(Math.random() * pool.length)];
}

function restoreGameProfile(data: Partial<Profile> | null): Profile {
  const parsed = sanitizeSavedProfile(
    data ?? {},
  );
  const owned = Array.isArray(parsed.owned)
    ? parsed.owned.filter((id) =>
        ROSTER.some((character) => character.id === id),
      )
    : INITIAL_PROFILE.owned;
  const savedTeam = Array.isArray(parsed.team)
    ? parsed.team
        .filter(
          (id, index, list) =>
            owned.includes(id) && list.indexOf(id) === index,
        )
        .slice(0, 3)
    : [];
  const team = [
    ...savedTeam,
    ...owned.filter((id) => !savedTeam.includes(id)),
  ].slice(0, 3);
  const stageStars =
    parsed.stageStars ?? ((parsed.clears ?? 0) > 0 ? { "1-1": 3 } : {});
  const restoredProfile = normalizeProfileCharacters({
    ...INITIAL_PROFILE,
    ...parsed,
    username:
      typeof parsed.username === "string" && parsed.username.trim()
        ? parsed.username.trim().slice(0, 12)
        : INITIAL_PROFILE.username,
    userId:
      typeof parsed.userId === "string" && parsed.userId
        ? parsed.userId
        : createUserId(),
    owned,
    team: team.length === 3 ? team : INITIAL_PROFILE.team,
    parties: Array.isArray(parsed.parties)
      ? parsed.parties
      : Array.from({ length: PARTY_COUNT }, () => [
          ...(team.length === PARTY_SIZE ? team : INITIAL_PROFILE.team),
        ]),
    activePartyIndex: Number.isInteger(parsed.activePartyIndex)
      ? (parsed.activePartyIndex ?? 0)
      : 0,
    playerLevel:
      parsed.playerLevel ??
      Math.min(100, 1 + Math.floor((parsed.clears ?? 0) / 3)),
    playerXp: parsed.playerXp ?? 0,
    trainingCrystals:
      parsed.trainingCrystals ?? INITIAL_PROFILE.trainingCrystals,
    dragonHeadStones:
      parsed.dragonHeadStones ??
      (parsed.usedCodes?.includes("CIT") ? 50000 : 0),
    crownStones:
      parsed.crownStones ??
      (parsed.usedCodes?.includes("CIT") ? 50000 : 0),
    liberationBooks:
      parsed.liberationBooks ??
      (parsed.usedCodes?.includes("CIT") ? 50000 : 0),
    evolutionMaterialCharacters:
      parsed.evolutionMaterialCharacters ??
      (parsed.usedCodes?.includes("CIT99")
        ? MAX_ITEM_COUNT
        : parsed.usedCodes?.includes("CIT")
          ? 50000
          : 0),
    skillMaterialCharacters:
      parsed.skillMaterialCharacters ??
      (parsed.usedCodes?.includes("CIT99")
        ? MAX_ITEM_COUNT
        : parsed.usedCodes?.includes("CIT")
          ? 50000
          : 0),
    equipmentInventory:
      parsed.equipmentInventory ??
      (parsed.usedCodes?.includes("CIT99")
        ? Object.fromEntries(
            EQUIPMENT_ITEMS.map((item) => [item.id, MAX_EQUIPMENT_COUNT]),
          )
        : {}),
    equippedItems: { ...(parsed.equippedItems ?? {}) },
    dailyShopPurchases: [...(parsed.dailyShopPurchases ?? [])],
    discoveredSynergyIds: [...(parsed.discoveredSynergyIds ?? [])],
    levels: { ...INITIAL_LEVELS, ...(parsed.levels ?? {}) },
    evolutions: { ...INITIAL_EVOLUTIONS, ...(parsed.evolutions ?? {}) },
    characterCopies: { ...(parsed.characterCopies ?? {}) },
    bossTokens: { ...(parsed.bossTokens ?? {}) },
    stageStars: { ...stageStars },
    bestTurns: { ...(parsed.bestTurns ?? {}) },
  });
  return restoredProfile;
}

export default function Home() {
  const [viewport, setViewport] = useState({ width: 414, height: 896 });
  const [view, setView] = useState<View>("home");
  const [profile, setProfile] = useState<Profile>(INITIAL_PROFILE);
  const [battle, setBattle] = useState<Battle>(newBattle);
  const [preparedStageId, setPreparedStageId] = useState<string | null>(null);
  const [heldSkill, setHeldSkill] = useState<{
    character: Character;
    skill: CharacterSkill;
  } | null>(null);
  const [skillPickerIndex, setSkillPickerIndex] = useState<number | null>(null);
  const [heldEnemyIndex, setHeldEnemyIndex] = useState<number | null>(null);
  const [exCutin, setExCutin] = useState<{
    character: Character;
    skill: CharacterSkill;
  } | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [summoning, setSummoning] = useState(false);
  const [summonResults, setSummonResults] = useState<Character[]>([]);
  const [summonBanner, setSummonBanner] = useSessionState<SummonBanner>("relic-rush-summon-banner", "limited");
  const [storedSummonSeries, setSummonSeries] = useSessionState(
    "relic-rush-summon-series",
    0,
  );
  const summonSeries =
    ((storedSummonSeries % GACHA_SERIES.length) + GACHA_SERIES.length) %
    GACHA_SERIES.length;
  const [battleOrigin, setBattleOrigin] = useSessionState<Exclude<View, "battle">>(
    "relic-rush-battle-origin",
    "stages",
  );
  const [cloudStatus, setCloudStatus] = useState<SaveStatus>("loading");
  const saveSession = useRef<AccountSaveSession<Profile> | null>(null);
  const [savePrefix, setSavePrefix] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saveLoadError, setSaveLoadError] = useState(false);
  const [saveChoice, setSaveChoice] = useState<{
    cloud: CloudSave<Profile>; candidate: Profile; legacy: boolean; guest?: boolean;
  } | null>(null);
  const accountResetting = useRef(false);
  const stableViewport = useRef({ width: 414, height: 896 });
  const [showOpening, setShowOpening] = useState(true);
  const [retreatConfirm, setRetreatConfirm] = useState(false);
  const [lastDrop, setLastDrop] = useState<Character | null>(null);
  const [lastDropWasDuplicate, setLastDropWasDuplicate] = useState(false);
  const [lastTokenDrop, setLastTokenDrop] = useState(0);
  const [lastEquipmentDrop, setLastEquipmentDrop] = useState<EquipmentItem | null>(null);
  const [promoMessage, setPromoMessage] = useState("");
  const rewarded = useRef(false);
  const audioContext = useRef<AudioContext | null>(null);
  const battleTimers = useRef<number[]>([]);
  const battleSequenceLive = useRef(false);
  const skillHoldTimer = useRef<number | null>(null);
  const enemyHoldTimer = useRef<number | null>(null);

  function cancelSkillHold() {
    if (skillHoldTimer.current !== null)
      window.clearTimeout(skillHoldTimer.current);
    skillHoldTimer.current = null;
    setHeldSkill(null);
  }

  function beginSkillHold(character: Character, skill: CharacterSkill) {
    cancelSkillHold();
    skillHoldTimer.current = window.setTimeout(() => {
      setHeldSkill({ character, skill });
      skillHoldTimer.current = null;
    }, 550);
  }

  function cancelEnemyHold() {
    if (enemyHoldTimer.current !== null)
      window.clearTimeout(enemyHoldTimer.current);
    enemyHoldTimer.current = null;
    setHeldEnemyIndex(null);
  }

  function beginEnemyHold(index: number) {
    cancelEnemyHold();
    enemyHoldTimer.current = window.setTimeout(() => {
      setHeldEnemyIndex(index);
      enemyHoldTimer.current = null;
    }, 550);
  }

  function clearBattleSequence() {
    battleSequenceLive.current = false;
    battleTimers.current.forEach((timer) => window.clearTimeout(timer));
    battleTimers.current = [];
  }

  function scheduleBattleStep(callback: () => void, delay: number) {
    const timer = window.setTimeout(() => {
      battleTimers.current = battleTimers.current.filter(
        (activeTimer) => activeTimer !== timer,
      );
      callback();
    }, delay);
    battleTimers.current.push(timer);
  }

  useEffect(
    () => () => {
      battleSequenceLive.current = false;
      battleTimers.current.forEach((timer) => window.clearTimeout(timer));
      if (skillHoldTimer.current !== null)
        window.clearTimeout(skillHoldTimer.current);
      if (enemyHoldTimer.current !== null)
        window.clearTimeout(enemyHoldTimer.current);
    },
    [],
  );

  useEffect(() => {
    ROSTER.filter((character) => character.rarity === "EX").forEach(
      (character) => {
        const cutinImage = new Image();
        cutinImage.src = character.image;
      },
    );
  }, []);

  useEffect(() => {
    const isTextInputFocused = () =>
      document.activeElement instanceof HTMLElement &&
      document.activeElement.matches(
        "input, textarea, select, [contenteditable='true']",
      );
    const fitToScreen = () => {
      const width = Math.round(
        window.visualViewport?.width ?? document.documentElement.clientWidth,
      );
      const height = Math.round(
        window.visualViewport?.height ?? window.innerHeight,
      );
      const keyboardIsOpen =
        isTextInputFocused() &&
        height < stableViewport.current.height - 120;
      if (keyboardIsOpen) {
        window.scrollTo(0, 0);
        return;
      }
      stableViewport.current = { width, height };
      setViewport({ width, height });
    };
    fitToScreen();
    window.addEventListener("resize", fitToScreen, { passive: true });
    window.visualViewport?.addEventListener("resize", fitToScreen, {
      passive: true,
    });
    return () => {
      window.removeEventListener("resize", fitToScreen);
      window.visualViewport?.removeEventListener("resize", fitToScreen);
    };
  }, []);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const saved = Number(
        window.sessionStorage.getItem(`relic-rush-scroll-${view}`) ?? 0,
      );
      const target = document.querySelector<HTMLElement>(
        ".game-content > section",
      );
      if (target) target.scrollTop = saved;
    });
    const target = document.querySelector<HTMLElement>(
      ".game-content > section",
    );
    const saveScroll = () => {
      if (target)
        window.sessionStorage.setItem(
          `relic-rush-scroll-${view}`,
          String(target.scrollTop),
        );
    };
    target?.addEventListener("scroll", saveScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      saveScroll();
      target?.removeEventListener("scroll", saveScroll);
    };
  }, [view]);

  useEffect(() => {
    const controller = new AbortController();
    setHydrated(false);
    setSaveLoadError(false);
    setCloudStatus("loading");
    void fetch("/api/save", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not identify save account");
        const raw = await response.json() as CloudSave<Partial<Profile>>;
        if (raw.accountId !== null && typeof raw.accountId !== "string") throw new Error("Invalid save identity");
        if (raw.updatedAt !== null && !Number.isSafeInteger(raw.updatedAt)) throw new Error("Invalid revision");
        const cloud: CloudSave<Profile> = { ...raw, profile: raw.profile ? restoreGameProfile(raw.profile) : null };
        if (controller.signal.aborted) return;
        const prefix = accountStoragePrefix(cloud.accountId);
        const local = readSaveEnvelope<Profile>(window.localStorage, prefix + "profile");
        const selected = chooseSave(cloud, local);
        if (selected.conflict) {
          window.localStorage.setItem(prefix + "conflict-backup", JSON.stringify(selected.conflict));
          setSaveChoice({ cloud, candidate: restoreGameProfile(selected.conflict), legacy: false });
          setCloudStatus("conflict");
          return;
        }
        // Pre-account saves remain untouched until their owner explicitly imports
        // them. Never silently assign the shared legacy slot to a new account.
        const guestPrefix = accountStoragePrefix(null);
        const guest = readSaveEnvelope<Profile>(window.localStorage, guestPrefix + "profile");
        if (cloud.accountId !== null && !local && guest && !window.localStorage.getItem(guestPrefix + "claimed") && !window.localStorage.getItem(prefix + "guest-reviewed")) {
          setSaveChoice({ cloud, candidate: restoreGameProfile(guest.profile), legacy: true, guest: true });
          setCloudStatus("conflict");
          return;
        }
        const legacy = window.localStorage.getItem(PROFILE_STORAGE_KEY);
        if (!local && legacy && !window.localStorage.getItem(PROFILE_STORAGE_KEY + ":claimed") && !window.localStorage.getItem(prefix + "legacy-reviewed")) {
          try {
            const candidate = restoreGameProfile(JSON.parse(legacy) as Partial<Profile>);
            if (JSON.stringify(candidate) !== JSON.stringify(cloud.profile)) {
              setSaveChoice({ cloud, candidate, legacy: true });
              setCloudStatus("conflict");
              return;
            }
          } catch { /* Keep the original bytes for recovery. */ }
        }
        activateSave(cloud, restoreGameProfile(selected.profile), Boolean(local && local.baseRevision === cloud.updatedAt));
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Save loading failed", error);
        setSaveLoadError(true);
        setCloudStatus("offline");
      });
    const retry = () => { void saveSession.current?.flush(); };
    window.addEventListener("online", retry);
    return () => {
      controller.abort();
      saveSession.current?.stop();
      window.removeEventListener("online", retry);
    };
  }, [loadAttempt]);

  function activateSave(cloud: CloudSave<Profile>, loaded: Profile, restoreBattle = false) {
    saveSession.current?.stop();
    const session = new AccountSaveSession(cloud.accountId, cloud, loaded, window.localStorage, setCloudStatus, () => {
      clearBattleSequence();
      setExCutin(null);
      setHydrated(false);
      setLoadAttempt((attempt) => attempt + 1);
    });
    saveSession.current = session;
    setSavePrefix(session.prefix);
    setProfile(loaded);
    setSaveChoice(null);
    setShowOpening(window.sessionStorage.getItem("relic-rush-opening-seen") !== "1");
    setView("home");
    setBattle(newBattle());
    if (restoreBattle) {
      const savedView = window.sessionStorage.getItem(session.prefix + "view") as View | null;
      if (savedView && ["home", "stages", "events", "abyss", "battle", "party", "growth", "evolution", "shop", "summon", "codex", "equipment", "tags", "inbox", "settings"].includes(savedView)) setView(savedView);
      const savedBattle = window.sessionStorage.getItem(session.prefix + "battle");
      if (savedBattle) try {
        setBattle(normalizeBattleState(JSON.parse(savedBattle), loaded.team));
      } catch { setView("home"); }
    }
    setHydrated(true);
  }

  function resolveSaveChoice(useLocal: boolean) {
    if (!saveChoice) return;
    const { cloud, candidate, legacy, guest } = saveChoice;
    const prefix = accountStoragePrefix(cloud.accountId);
    if (legacy) {
      window.localStorage.setItem(prefix + (guest ? "guest-reviewed" : "legacy-reviewed"), "1");
      if (useLocal) window.localStorage.setItem(guest ? accountStoragePrefix(null) + "claimed" : PROFILE_STORAGE_KEY + ":claimed", prefix);
      if (useLocal) {
        const previousPrefix = guest ? accountStoragePrefix(null) : "relic-rush-";
        for (const key of ["view", "battle"]) {
          const saved = window.sessionStorage.getItem(previousPrefix + key);
          if (saved) window.sessionStorage.setItem(prefix + key, saved);
        }
      }
    }
    if (cloud.profile) window.localStorage.setItem(prefix + "cloud-backup", JSON.stringify(cloud.profile));
    activateSave(cloud, useLocal ? candidate : restoreGameProfile(cloud.profile), useLocal);
  }

  useEffect(() => {
    if (!hydrated || accountResetting.current) return;
    saveSession.current?.stage(profile);
  }, [profile, hydrated]);

  useEffect(() => {
    if (!hydrated || !savePrefix) return;
    window.sessionStorage.setItem(savePrefix + "view", view);
    if (!battle.animating) window.sessionStorage.setItem(savePrefix + "battle", JSON.stringify(battle));
  }, [view, battle, hydrated, savePrefix]);

  function ensureAudio() {
    if (!audioContext.current) audioContext.current = new AudioContext();
    if (audioContext.current.state === "suspended")
      void audioContext.current.resume();
    return audioContext.current;
  }

  useEffect(() => {
    if (!hydrated) return;
    profile.team.forEach((id) => {
      if (CHARACTER_BY_ID.get(id)?.rarity !== "EX") return;
      const preload = new Image();
      preload.src = getExCutinImage(id);
    });
  }, [hydrated, profile.team]);

  function playSe(frequency = 520, duration = 0.09) {
    if (profile.seVolume <= 0) return;
    const context = ensureAudio();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    gain.gain.setValueAtTime(profile.seVolume / 2200, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      context.currentTime + duration,
    );
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }

  function playChord(root: number, duration = 0.22) {
    if (profile.seVolume <= 0) return;
    ensureAudio();
    [1, 1.25, 1.5].forEach((ratio, index) =>
      window.setTimeout(() => playSe(root * ratio, duration), index * 35),
    );
  }

  useEffect(() => {
    if (
      hydrated &&
      battle.phase === "victory" &&
      !rewarded.current
    ) {
      rewarded.current = true;
      if (profile.claimedBattleRuns.includes(battle.runId)) return;
      const clearedStage = getStage(battle.stageId);
      const stars = getStars(battle.totalTurns, clearedStage.enemies.length);
      const firstExchangeReward = resolveFirstExchangeRun({
        rewardMode: clearedStage.rewardMode,
        stageId: clearedStage.id,
        characterId: clearedStage.dropCharacterId,
        claims: profile.stageCharacterClaims,
        baseTokenReward: clearedStage.tokenReward ?? 1,
        tokenRoll: deterministicDropRoll(`${battle.runId}:boss-token`),
      });
      const earnedTokens = firstExchangeReward.tokenReward;
      const configuredFirstClearCharacterId =
        getStageFirstClearCharacterId(clearedStage);
      const firstClearCharacterId =
        firstExchangeReward.firstClearCharacterId ??
        (configuredFirstClearCharacterId &&
        !hasStageCharacterClaim(
          profile.stageCharacterClaims,
          clearedStage.id,
          configuredFirstClearCharacterId,
        )
          ? configuredFirstClearCharacterId
          : undefined);
      const firstClearClaimKey = firstClearCharacterId
        ? getStageCharacterClaimKey(clearedStage.id, firstClearCharacterId)
        : null;
      const chanceDropId = resolveStageCharacterDrop(
        clearedStage,
        deterministicDropRoll(`${battle.runId}:character-roll`),
        deterministicDropRoll(`${battle.runId}:character-choice`),
      );
      const droppedId = firstClearCharacterId ?? chanceDropId;
      const equipmentDrop = rollEquipmentDrop(
        clearedStage.id,
        clearedStage.kind,
        clearedStage.recommended,
        battle.runId,
      );
      setLastDrop(
        droppedId
          ? (ROSTER.find((character) => character.id === droppedId) ?? null)
          : null,
      );
      setLastDropWasDuplicate(
        Boolean(droppedId && profile.owned.includes(droppedId)),
      );
      setLastTokenDrop(earnedTokens);
      setLastEquipmentDrop(equipmentDrop);
      setProfile((current) => {
        if (current.claimedBattleRuns.includes(battle.runId)) return current;
        const firstClear = !current.stageStars[clearedStage.id];
        const duplicateDrop = Boolean(
          droppedId && current.owned.includes(droppedId),
        );
        const playerProgress = addPlayerXp(
          current.playerLevel,
          current.playerXp,
          getStagePlayerXp(clearedStage),
        );
        const bestTurns = current.bestTurns[clearedStage.id];
        const abyssFloor = clearedStage.id.startsWith("A-")
          ? Number(clearedStage.id.slice(2))
          : current.abyssFloor;
        const voidReward =
          clearedStage.id === "A-100" && !current.owned.includes("void");
        const stageStars = {
          ...current.stageStars,
          [clearedStage.id]: Math.max(
            current.stageStars[clearedStage.id] ?? 0,
            stars,
          ),
        };
        const saintReward =
          STAGES.every((stage) => (stageStars[stage.id] ?? 0) >= 3) &&
          !current.owned.includes("white-dragon-saint");
        const rewards = [
          ...new Set([
            ...current.owned,
            ...(voidReward ? ["void"] : []),
            ...(saintReward ? ["white-dragon-saint"] : []),
            ...(droppedId ? [droppedId] : []),
          ]),
        ];
        return {
          ...current,
          gems: current.gems + clearedStage.gems + (firstClear ? 100 : 0),
          gold: Math.min(MAX_GOLD, current.gold + clearedStage.gold),
          ...playerProgress,
          trainingCrystals:
            Math.min(
              MAX_ITEM_COUNT,
              current.trainingCrystals +
                (clearedStage.dropPolicy === "defeat-only"
                  ? battle.runLoot.trainingCrystals
                  : (clearedStage.trainingCrystalReward ?? 0)),
            ),
          evoStones:
            Math.min(
              MAX_ITEM_COUNT,
              current.evoStones +
                (clearedStage.dropPolicy === "defeat-only"
                  ? battle.runLoot.evoStones
                  : (clearedStage.evoStoneReward ??
                    (clearedStage.number === 3 ? 2 : 1))),
            ),
          evolutionMaterialCharacters: Math.min(
            MAX_ITEM_COUNT,
            current.evolutionMaterialCharacters +
              battle.runLoot.evolutionMaterialCharacters,
          ),
          skillMaterialCharacters: Math.min(
            MAX_ITEM_COUNT,
            current.skillMaterialCharacters +
              battle.runLoot.skillMaterialCharacters,
          ),
          clears: current.clears + 1,
          abyssFloor: Math.max(current.abyssFloor, abyssFloor),
          owned: rewards,
          characterCopies: duplicateDrop && droppedId
            ? {
                ...current.characterCopies,
                [droppedId]: (current.characterCopies[droppedId] ?? 0) + 1,
              }
            : current.characterCopies,
          bossTokens:
            earnedTokens > 0 && clearedStage.dropCharacterId
              ? {
                  ...current.bossTokens,
                  [clearedStage.dropCharacterId]: Math.min(
                    MAX_ITEM_COUNT,
                    (current.bossTokens[clearedStage.dropCharacterId] ?? 0) +
                      earnedTokens,
                  ),
                }
              : current.bossTokens,
          equipmentInventory: equipmentDrop
            ? {
                ...current.equipmentInventory,
                [equipmentDrop.id]: Math.min(
                  MAX_EQUIPMENT_COUNT,
                  (current.equipmentInventory[equipmentDrop.id] ?? 0) + 1,
                ),
              }
            : current.equipmentInventory,
          stageCharacterClaims:
            firstClearClaimKey &&
            !current.stageCharacterClaims.includes(firstClearClaimKey)
              ? [...current.stageCharacterClaims, firstClearClaimKey]
              : current.stageCharacterClaims,
          claimedBattleRuns: [
            ...current.claimedBattleRuns,
            battle.runId,
          ].slice(-MAX_CLAIMED_BATTLE_RUNS),
          stageStars,
          bestTurns: {
            ...current.bestTurns,
            [clearedStage.id]: bestTurns
              ? Math.min(bestTurns, battle.totalTurns)
              : battle.totalTurns,
          },
        };
      });
    }
  }, [
    hydrated,
    battle.phase,
    battle.runId,
    battle.runLoot,
    battle.stageId,
    battle.totalTurns,
    profile.claimedBattleRuns,
    profile.owned,
    profile.stageCharacterClaims,
    profile.stageStars,
  ]);

  useEffect(() => {
    if (
      !hydrated ||
      battle.phase !== "defeat" ||
      getStage(battle.stageId).dropPolicy !== "defeat-only"
    )
      return;
    setProfile((current) => settleRunLoot(current, battle));
  }, [
    hydrated,
    battle.phase,
    battle.runId,
    battle.runLoot,
    battle.stageId,
  ]);

  function startBattle(stageId = STAGES[0].id) {
    const selectedStage = getStage(stageId);
    if (
      ((selectedStage.kind === "event" ||
        selectedStage.kind === "strong" ||
        selectedStage.kind === "material") &&
        profile.playerLevel < EVENT_UNLOCK_LEVEL) ||
      (selectedStage.kind === "abyss" &&
        profile.playerLevel < ABYSS_UNLOCK_LEVEL) ||
      profile.playerLevel < (selectedStage.unlockLevel ?? 1)
    )
      return;
    clearBattleSequence();
    setExCutin(null);
    rewarded.current = false;
    setLastDrop(null);
    setLastDropWasDuplicate(false);
    setLastTokenDrop(0);
    setLastEquipmentDrop(null);
    const activeSynergy = getActivePartySynergy(profile.team);
    const isNewSynergy = Boolean(
      activeSynergy &&
        !profile.discoveredSynergyIds.includes(activeSynergy.id),
    );
    if (activeSynergy)
      setProfile((current) =>
        current.discoveredSynergyIds.includes(activeSynergy.id)
          ? current
          : {
              ...current,
              discoveredSynergyIds: [
                ...current.discoveredSynergyIds,
                activeSynergy.id,
              ],
            },
      );
    const kind = selectedStage.kind;
    playChord(
      kind === "strong"
        ? 196
        : kind === "abyss"
          ? 110
          : kind === "event"
            ? 293.66
            : 220,
      0.13,
    );
    if (view !== "battle") setBattleOrigin(view);
    const nextBattle = newBattle(
      stageId,
      activeSynergy?.id ?? null,
      profile.team,
    );
    if (isNewSynergy && activeSynergy)
      nextBattle.message = `連携覚醒「${activeSynergy.name}」を発見！ ${activeSynergy.awakeningName}が発動した。`;
    setBattle(nextBattle);
    setPreparedStageId(null);
    setView("battle");
  }

  function prepareBattle(stageId = STAGES[0].id) {
    const selectedStage = getStage(stageId);
    if (
      ((selectedStage.kind === "event" ||
        selectedStage.kind === "strong" ||
        selectedStage.kind === "material") &&
        profile.playerLevel < EVENT_UNLOCK_LEVEL) ||
      (selectedStage.kind === "abyss" &&
        profile.playerLevel < ABYSS_UNLOCK_LEVEL) ||
      profile.playerLevel < (selectedStage.unlockLevel ?? 1)
    )
      return;
    if (view !== "battle" && view !== "party") setBattleOrigin(view);
    setPreparedStageId(stageId);
  }

  function navigateTo(nextView: View) {
    setPreparedStageId(null);
    cancelEnemyHold();
    cancelSkillHold();
    setView(nextView);
  }

  function closeOpening() {
    window.sessionStorage.setItem("relic-rush-opening-seen", "1");
    setShowOpening(false);
  }

  async function resetAccount(): Promise<string | null> {
    if (!saveSession.current || !savePrefix) return "セーブの確認が終わるまでお待ちください。";
    accountResetting.current = true;
    try {
      const freshProfile = createFreshProfile(profile);
      window.localStorage.setItem(savePrefix + "before-reset", JSON.stringify(profile));
      await saveSession.current.replace(freshProfile);
      clearStorageByPrefix(window.sessionStorage, savePrefix);
      window.location.reload();
      return null;
    } catch {
      accountResetting.current = false;
      setCloudStatus("offline");
      return "初期化を完了できませんでした。進行データは保管されています。通信を確認して再読み込みしてください。";
    }
  }

  function retreatBattle() {
    clearBattleSequence();
    setExCutin(null);
    setRetreatConfirm(false);
    if (getStage(battle.stageId).dropPolicy === "defeat-only")
      setProfile((current) => settleRunLoot(current, battle));
    setView(battleOrigin);
  }

  function selectAction(
    index: number,
    action: BattleAction,
    requestedSkillIndex?: number,
  ) {
    setSkillPickerIndex(null);
    playSe(action === "skill" ? 740 : action === "guard" ? 260 : 520, 0.07);
    setBattle((current) => {
      const unit = party[index];
      const availableSkills = getCharacterSkills(
        unit,
        profile.evolutions[unit.id] ?? 0,
      );
      const selectedSkillIndex = Math.max(
        0,
        Math.min(
          availableSkills.length - 1,
          requestedSkillIndex ?? current.selectedSkillIndices[index],
        ),
      );
      if (
        current.animating ||
        (action === "skill" &&
          (current.cooldowns[index]?.[selectedSkillIndex] ?? 0) > 0)
      )
        return current;
      const skill = availableSkills[selectedSkillIndex];
      const actions = [...current.actions] as Battle["actions"];
      const selectedSkillIndices = [
        ...current.selectedSkillIndices,
      ] as Battle["selectedSkillIndices"];
      actions[index] = action;
      selectedSkillIndices[index] = selectedSkillIndex;
      const needsEnemyTarget =
        action === "attack" ||
        (action === "skill" && skill.kind === "damage");
      return {
        ...current,
        actions,
        selectedSkillIndices,
        selectedPartyIndex: index,
        targetEnemyIndex: current.targetEnemyIndices[index],
        message:
          needsEnemyTarget && getActionScope(unit, action, skill) === "single"
            ? `${unit.name}を選択中。攻撃する敵をタップしよう。`
            : `${unit.name}の行動を選択した。`,
      };
    });
  }

  function selectPartyForTarget(index: number) {
    setBattle((current) => {
      if (current.animating) return current;
      const action = current.actions[index];
      const unit = party[index];
      const skill = getCharacterSkills(
        unit,
        profile.evolutions[unit.id] ?? 0,
      )[current.selectedSkillIndices[index]];
      const needsEnemyTarget =
        !action ||
        ((action === "attack" ||
          (action === "skill" && skill?.kind === "damage")) &&
          getActionScope(unit, action, skill) === "single");
      return {
        ...current,
        selectedPartyIndex: index,
        targetEnemyIndex: current.targetEnemyIndices[index],
        message: needsEnemyTarget
          ? `${party[index].name}の攻撃対象を選択中。`
          : `${party[index].name}の行動は対象選択不要。`,
      };
    });
    playSe(330, 0.04);
  }

  function selectEnemyTarget(index: number) {
    setBattle((current) => {
      if (current.animating || current.enemyHps[index] <= 0) return current;
      const selectedPartyIndex = Math.max(
        0,
        Math.min(PARTY_SIZE - 1, current.selectedPartyIndex),
      );
      const action = current.actions[selectedPartyIndex];
      const unit = party[selectedPartyIndex];
      const skill = getCharacterSkills(
        unit,
        profile.evolutions[unit.id] ?? 0,
      )[current.selectedSkillIndices[selectedPartyIndex]];
      const needsEnemyTarget =
        !action ||
        ((action === "attack" ||
          (action === "skill" &&
            skill?.kind === "damage")) &&
          getActionScope(unit, action, skill) === "single");
      if (!needsEnemyTarget)
        return {
          ...current,
          message: `${party[selectedPartyIndex].name}の行動は対象選択不要。`,
        };
      const targetEnemyIndices = [
        ...current.targetEnemyIndices,
      ] as Battle["targetEnemyIndices"];
      targetEnemyIndices[selectedPartyIndex] = index;
      return {
        ...current,
        targetEnemyIndex: index,
        targetEnemyIndices,
        message: `${party[selectedPartyIndex].name}は${waveEnemies[index].name}を狙う。`,
      };
    });
    playSe(420, 0.045);
  }

  function executeTurn(useUltimate = false) {
    const activeSynergy = battle.synergyId
      ? PARTY_SYNERGY_BY_ID.get(battle.synergyId) ?? null
      : null;
    const ultimateTier = useUltimate
      ? getUltimateTier(battle.ultimate, activeSynergy)
      : "none";
    if (
      battle.animating ||
      (!useUltimate && battle.actions.some((action) => !action)) ||
      (useUltimate && ultimateTier === "none")
    )
      return;
    const isExtremeUltimate = ultimateTier === "extreme";
    const ultimateCost = isExtremeUltimate ? 200 : 100;
    clearBattleSequence();
    battleSequenceLive.current = true;
    const actions: Battle["actions"] = useUltimate
      ? ["skill", "skill", "skill"]
      : battle.actions;
    const bonus = battle.blessings.length * 3;
    const queuedPartyEffects: ActivePartyEffect[] = useUltimate
      ? []
      : party.flatMap((unit, partyIndex) => {
          if (actions[partyIndex] !== "skill") return [];
          const skill = getCharacterSkills(
            unit,
            profile.evolutions[unit.id] ?? 0,
          )[battle.selectedSkillIndices[partyIndex] ?? 0];
          if (!skill || (skill.kind !== "guard" && skill.kind !== "buff")) return [];
          return (skill.effects ?? [])
            .filter((effect) => effect.kind !== "regen")
            .map((effect, effectIndex) => ({
              ...effect,
              id: `${unit.id}:${skill.id}:${effect.kind}:${effect.scope}:${effectIndex}`,
              sourceCharacterId: unit.id,
              remainingTurns: effect.duration,
            }));
        });
    const turnEffectMap = new Map(
      [...battle.activePartyEffects, ...queuedPartyEffects].map((effect) => [
        effect.id,
        effect,
      ]),
    );
    const turnPartyStats = getBattlePartyStats(party, profile, [
      ...turnEffectMap.values(),
    ], activeSynergy);
    const actionOrder = [0, 1, 2].sort(
      (left, right) => turnPartyStats[right].spd - turnPartyStats[left].spd,
    );
    const simulatedEnemyHps = [...battle.enemyHps];
    let bonusApplied = false;
    const actionResults = actionOrder.map((partyIndex, orderIndex) => {
      const action = actions[partyIndex] ?? "attack";
      const unit = party[partyIndex];
      const skillIndex = battle.selectedSkillIndices[partyIndex] ?? 0;
      const selectedSkill =
        getCharacterSkills(
          unit,
          profile.evolutions[unit.id] ?? 0,
        )[skillIndex] ?? getCharacterSkills(unit, 0)[0];
      const isDamageSkill =
        action === "skill" && selectedSkill.kind === "damage";
      const isDamageAction = useUltimate || action === "attack" || isDamageSkill;
      const critical =
        isDamageAction && Math.random() * 100 < turnPartyStats[partyIndex].crit;
      const damageByEnemy = battle.enemyHps.map(() => 0);
      let targetIndices: number[] = [];
      let healing = 0;

      if (useUltimate) {
        targetIndices = getAliveEnemyIndices(simulatedEnemyHps);
        const memberDamage = Math.round(
          turnPartyStats[partyIndex].atk *
            (isExtremeUltimate
              ? activeSynergy?.extremePower ?? 2.55
              : activeSynergy?.ultimatePower ?? 1.7) *
            (critical ? 1.5 : 1) +
            (orderIndex === 0 ? bonus : 0),
        );
        const damagePerEnemy = Math.max(
          1,
          Math.round(memberDamage / Math.max(1, targetIndices.length)),
        );
        targetIndices.forEach((enemyIndex) => {
          damageByEnemy[enemyIndex] = damagePerEnemy;
          simulatedEnemyHps[enemyIndex] = Math.max(
            0,
            simulatedEnemyHps[enemyIndex] - damagePerEnemy,
          );
        });
        healing =
          orderIndex === actionOrder.length - 1
            ? isExtremeUltimate
              ? activeSynergy?.extremeHeal ?? 36
              : activeSynergy?.ultimateHeal ?? 22
            : 0;
      } else if (isDamageAction) {
        const scope = getActionScope(unit, action, selectedSkill);
        const aliveEnemies = getAliveEnemyIndices(simulatedEnemyHps);
        if (aliveEnemies.length > 0) {
          targetIndices =
            scope === "all"
              ? aliveEnemies
              : [
                  getNextTargetEnemyIndex(
                    simulatedEnemyHps,
                    battle.targetEnemyIndices[partyIndex],
                  ),
                ];
          const baseMultiplier = isDamageSkill
            ? 1.8 * selectedSkill.power
            : 1;
          const areaMultiplier =
            scope === "all" && aliveEnemies.length > 1 ? 0.7 : 1;
          targetIndices.forEach((enemyIndex, targetOffset) => {
            const targetEnemy = waveEnemies[enemyIndex];
            const affinity = getElementMultiplier(unit.element, targetEnemy.element);
            const actionDamage = Math.max(1, Math.round(
              turnPartyStats[partyIndex].atk * baseMultiplier * areaMultiplier *
              (critical ? 1.5 : 1) * affinity,
            ) - Math.round(targetEnemy.def * 0.16));
            const addedBonus = !bonusApplied && targetOffset === 0 ? bonus : 0;
            const resolvedDamage = actionDamage + addedBonus;
            damageByEnemy[enemyIndex] = resolvedDamage;
            simulatedEnemyHps[enemyIndex] = Math.max(
              0,
              simulatedEnemyHps[enemyIndex] - resolvedDamage,
            );
            if (addedBonus > 0) bonusApplied = true;
          });
        }
      } else if (action === "skill" && selectedSkill.kind === "heal") {
        healing = Math.round(
          (12 + turnPartyStats[partyIndex].atk * 0.65) * selectedSkill.power,
        );
      }

      return {
        partyIndex,
        action,
        skillIndex,
        selectedSkill,
        actionName:
          action === "skill"
            ? selectedSkill.name
            : action === "guard"
              ? "防御"
              : "攻撃",
        critical,
        damageByEnemy,
        targetIndices,
        healing,
        skillEffects:
          !useUltimate && action === "skill"
            ? (selectedSkill.effects ?? [])
            : [],
      };
    });
    type PartyInitiativeStep = {
      kind: "party";
      speed: number;
      tie: number;
      result: (typeof actionResults)[number];
    };
    type EnemyInitiativeStep = {
      kind: "enemy";
      speed: number;
      tie: number;
      enemyIndex: number;
    };
    const partyInitiative: PartyInitiativeStep[] = actionResults.map((result) => ({
        kind: "party" as const,
        speed: turnPartyStats[result.partyIndex].spd,
        tie: result.partyIndex,
        result,
      }));
    const isPriorityBuff = (step: PartyInitiativeStep) =>
      step.result.action === "guard" ||
      (step.result.action === "skill" &&
        (step.result.selectedSkill.kind === "guard" ||
          step.result.selectedSkill.kind === "buff"));
    const priorityBuffs = partyInitiative
      .filter(isPriorityBuff)
      .sort((left, right) => right.speed - left.speed || left.tie - right.tie);
    const speedInitiative = sortCombatInitiative<PartyInitiativeStep | EnemyInitiativeStep>([
      ...partyInitiative.filter((step) => !isPriorityBuff(step)),
      ...waveEnemies.flatMap((unit, enemyIndex) => battle.enemyHps[enemyIndex] > 0 ? [{
        kind: "enemy" as const,
        speed: unit.spd,
        tie: PARTY_SIZE + enemyIndex,
        enemyIndex,
      }] : []),
    ]);
    const initiative: Array<PartyInitiativeStep | EnemyInitiativeStep> = [
      ...priorityBuffs,
      ...speedInitiative,
    ];
    const enemyInitiativeIndex = initiative.findIndex(
      (step) => step.kind === "enemy",
    );
    const guardPowerBeforeEnemy = initiative
      .slice(0, enemyInitiativeIndex)
      .reduce((sum, step) => {
        if (step.kind !== "party") return sum;
        const { action } = step.result;
        if (action === "guard") return sum + 1;
        if (action === "skill" && step.result.selectedSkill.kind === "guard")
          return sum + 2 * step.result.selectedSkill.power;
        return sum;
      }, 0);
    const previewEnemyHps = [...battle.enemyHps];
    const defeatedEnemySteps = new Set<number>();
    let waveDefeatAt = -1;
    initiative.forEach((step, index) => {
      if (step.kind === "enemy") {
        if (previewEnemyHps[step.enemyIndex] <= 0) defeatedEnemySteps.add(index);
        return;
      }
      if (waveDefeatAt >= 0) return;
      previewEnemyHps.forEach((hp, enemyIndex) => {
        previewEnemyHps[enemyIndex] = Math.max(
          0,
          hp - (step.result.damageByEnemy[enemyIndex] ?? 0),
        );
      });
      if (previewEnemyHps.every((hp) => hp <= 0)) waveDefeatAt = index;
    });
    const effectiveInitiative = (
      waveDefeatAt >= 0
        ? useUltimate
          ? initiative.filter(
              (step, index) => step.kind === "party" || index <= waveDefeatAt,
            )
          : initiative.slice(0, waveDefeatAt + 1)
        : initiative).filter((step) => !defeatedEnemySteps.has(initiative.indexOf(step)));
    const nextCooldowns = battle.cooldowns.map((skillCooldowns) =>
      skillCooldowns.map((value) => Math.max(0, value - 1)),
    ) as Battle["cooldowns"];
    if (!useUltimate)
      effectiveInitiative.forEach((step) => {
        if (step.kind !== "party" || step.result.action !== "skill") return;
        const { partyIndex, skillIndex, selectedSkill } = step.result;
        const memberCooldowns = [...(nextCooldowns[partyIndex] ?? [])];
        memberCooldowns[skillIndex] = getEffectiveSkillCooldown(
          selectedSkill,
          profile.skillLevels[selectedSkill.id] ?? 1,
        );
        nextCooldowns[partyIndex] = memberCooldowns;
      });
    const actionGap = BATTLE_ACTION_GAP_MS;
    const initiativeLabel = effectiveInitiative
      .map((step) =>
        step.kind === "enemy"
          ? `敵${step.enemyIndex + 1}`
          : ["①", "②", "③"][step.result.partyIndex],
      )
      .join(" → ");

    playSe(useUltimate ? 920 : 610, useUltimate ? 0.22 : 0.1);
    setBattle((current) => ({
      ...current,
      animating: true,
      actions: [null, null, null],
      activeActions: actions,
      ultimate: useUltimate
        ? Math.max(0, current.ultimate - ultimateCost)
        : current.ultimate,
      enemyDamageNumbers: current.enemyHps.map(() => null),
      partyHpChange: null,
      message: useUltimate
        ? `連携奥義${isExtremeUltimate ? "・極" : ""}：${activeSynergy?.ultimateName ?? "トリニティ・レリック"}${isExtremeUltimate ? "・極" : ""}！`
        : `行動順：${initiativeLabel}（補助行動は先行）`,
    }));
    effectiveInitiative.forEach((step, initiativeIndex) => {
      const stepDelay = initiativeIndex * actionGap;
      if (step.kind === "party") {
        const { result } = step;
        const unit = party[result.partyIndex];
        const area = result.targetIndices.length > 1 ? "［全体］" : "";
        const hasImpact =
          result.targetIndices.length > 0 ||
          result.healing > 0 ||
          result.skillEffects.length > 0;
        const impactDelay =
          unit.rarity === "EX"
            ? BATTLE_EX_IMPACT_DELAY_MS
            : BATTLE_PARTY_IMPACT_DELAY_MS;

        scheduleBattleStep(() => {
          if (!battleSequenceLive.current) return;
          if (!hasImpact)
            playSe(result.action === "guard" ? 280 : 650, 0.08);
          setBattle((current) => {
            if (
              !current.animating ||
              current.phase !== "combat" ||
              current.partyHp <= 0
            )
              return current;
            return {
              ...current,
              selectedPartyIndex: result.partyIndex,
              targetEnemyIndex:
                current.targetEnemyIndices[result.partyIndex],
              actingIndex: result.partyIndex,
              hitEnemyIndices: [],
              enemyDamageNumbers: current.enemyHps.map(() => null),
              partyHpChange: null,
              enemyActing: false,
              message: `${unit.name}の${result.actionName}${area}！`,
            };
          });
          if (unit.rarity === "EX" && result.action === "skill") {
            setExCutin({ character: unit, skill: result.selectedSkill });
            scheduleBattleStep(
              () => setExCutin(null),
              BATTLE_EX_CUTIN_VISIBLE_MS,
            );
          }
        }, stepDelay);

        if (hasImpact)
          scheduleBattleStep(() => {
            if (!battleSequenceLive.current) return;
            playSe(result.critical ? 860 : 650, 0.08);
            setBattle((current) => {
              if (
                !current.animating ||
                current.phase !== "combat" ||
                current.partyHp <= 0
              )
                return current;
              const appliedDamage = current.enemyHps.map((hp, enemyIndex) =>
                Math.min(hp, result.damageByEnemy[enemyIndex] ?? 0),
              );
              const enemyHps = current.enemyHps.map((hp, enemyIndex) =>
                Math.max(0, hp - appliedDamage[enemyIndex]),
              );
              const currentStage = getStage(current.stageId);
              const processedDefeatKeys = [...current.processedDefeatKeys];
              let runLoot = current.runLoot;
              current.enemyHps.forEach((previousHp, enemyIndex) => {
                const defeatKey = `${current.wave}:${enemyIndex}`;
                if (
                  previousHp <= 0 ||
                  enemyHps[enemyIndex] > 0 ||
                  processedDefeatKeys.includes(defeatKey)
                )
                  return;
                processedDefeatKeys.push(defeatKey);
                runLoot = addRunLoot(
                  runLoot,
                  getDefeatLoot(
                    currentStage,
                    current.wave,
                    enemyIndex,
                    current.runId,
                  ),
                );
              });
              const targetEnemyIndices = current.targetEnemyIndices.map(
                (target) => getNextTargetEnemyIndex(enemyHps, target),
              ) as Battle["targetEnemyIndices"];
              const healedPartyHp = Math.min(
                100,
                current.partyHp + result.healing,
              );
              const actualHealing = Math.max(
                0,
                Math.round(healedPartyHp - current.partyHp),
              );
              const actualHealingHp = Math.round((partyMaxHp * actualHealing) / 100);
              let activePartyEffects = [...current.activePartyEffects];
              result.skillEffects.forEach((effect, effectIndex) => {
                const id = `${unit.id}:${result.selectedSkill.id}:${effect.kind}:${effect.scope}:${effectIndex}`;
                activePartyEffects = activePartyEffects.filter(
                  (activeEffect) => activeEffect.id !== id,
                );
                activePartyEffects.push({
                  ...effect,
                  id,
                  sourceCharacterId: unit.id,
                  remainingTurns: effect.duration,
                });
              });
              const critical = result.critical ? " CRITICAL!" : "";
              return {
                ...current,
                enemyHps,
                processedDefeatKeys,
                runLoot,
                activePartyEffects,
                targetEnemyIndices,
                selectedPartyIndex: result.partyIndex,
                targetEnemyIndex: targetEnemyIndices[result.partyIndex],
                actingIndex: result.partyIndex,
                hitEnemyIndices: result.targetIndices,
                enemyDamageNumbers: appliedDamage.map((amount, enemyIndex) =>
                  amount > 0
                    ? {
                        amount: Math.round(amount),
                        critical: result.critical,
                        stamp: Date.now() + enemyIndex,
                      }
                    : null,
                ),
                partyHp: healedPartyHp,
                partyHpChange:
                  actualHealing > 0
                    ? {
                        amount: actualHealingHp,
                        kind: "heal",
                        stamp: Date.now(),
                      }
                    : null,
                enemyActing: false,
                message: `${unit.name}の${result.actionName}${area}！${critical}`,
              };
            });
          }, stepDelay + impactDelay);
        return;
      }

      scheduleBattleStep(() => {
        if (!battleSequenceLive.current) return;
        setBattle((current) => {
          if (
            !current.animating ||
            current.phase !== "combat" ||
            current.partyHp <= 0 ||
            current.enemyHps[step.enemyIndex] <= 0
          )
            return current;
          const currentEnemy = getWaveEnemies(getStage(current.stageId), current.wave)[step.enemyIndex];
          return {
            ...current,
            actingIndex: -1,
            hitEnemyIndices: [],
            enemyDamageNumbers: current.enemyHps.map(() => null),
            partyHpChange: null,
            enemyActing: true,
            actingEnemyIndex: step.enemyIndex,
            message: `${currentEnemy.name}の${currentEnemy.intent}！`,
          };
        });
      }, stepDelay);

      scheduleBattleStep(() => {
        if (!battleSequenceLive.current) return;
        playSe(170, 0.14);
        setBattle((current) => {
          if (
            !current.animating ||
            !current.enemyActing || current.actingEnemyIndex !== step.enemyIndex ||
            current.phase !== "combat" ||
            current.partyHp <= 0 ||
            current.enemyHps[step.enemyIndex] <= 0
          )
            return current;
          const stagePower = getStage(current.stageId);
          const attackingEnemy = getWaveEnemies(stagePower, current.wave)[step.enemyIndex];
          const initialEnemyCount = current.enemyHps.length;
          const gimmick = attackingEnemy.isBoss || stagePower.gimmick?.appliesToAllEnemies
            ? stagePower.gimmick
            : undefined;
          const enraged = Boolean(
            gimmick?.hpThreshold &&
              current.enemyHps[step.enemyIndex] / attackingEnemy.maxHp <= gimmick.hpThreshold,
          );
          const doomTriggered = Boolean(
            gimmick?.doomTurn && current.turn >= gimmick.doomTurn,
          );
          const baseDamage =
            (20 + 18 * (current.wave / stagePower.enemies.length)) *
            stagePower.scale *
            (stagePower.number === 2 ? 1.15 : 1) *
            ((1 + (initialEnemyCount - 1) * 0.3) / initialEnemyCount) *
            getEnemyAttackMultiplier(attackingEnemy, current.turn) *
            clamp(
              attackingEnemy.atk /
                Math.max(1, 18 + stagePower.recommended * 0.12),
              0.72,
              1.35,
            ) *
            (enraged ? (gimmick?.damageMultiplier ?? 2) : 1);
          const defendingStats = getBattlePartyStats(party, profile, current.activePartyEffects, activeSynergy);
          const averageDefense = defendingStats.reduce((sum, stats) => sum + stats.def, 0) / PARTY_SIZE;
          const totalHp = defendingStats.reduce((sum, stats) => sum + stats.hp, 0);
          const incoming = doomTriggered
            ? 999
            : Math.max(
                1,
                Math.round(
                  (baseDamage -
                    averageDefense * 0.18 / initialEnemyCount -
                    guardPowerBeforeEnemy * 10 / initialEnemyCount) *
                    (420 / totalHp),
                ),
              );
          const actualDamagePercent = Math.min(current.partyHp, incoming);
          const actualDamageHp = Math.max(
            1,
            Math.ceil((totalHp * actualDamagePercent) / 100),
          );
          return {
            ...current,
            partyHp: Math.max(0, current.partyHp - incoming),
            partyHpChange: {
              amount: actualDamageHp,
              kind: "damage",
              stamp: Date.now(),
            },
            phase: "combat",
            message: doomTriggered
              ? `${gimmick?.name}――${actualDamageHp}ダメージ！`
              : enraged
                ? `${gimmick?.name}が発動！ ${actualDamageHp}ダメージを受けた。`
                : guardPowerBeforeEnemy > 0
                  ? `防御で軽減し、${actualDamageHp}ダメージを受けた。`
                  : `${actualDamageHp}ダメージを受けた。`,
          };
        });
      }, stepDelay + BATTLE_ENEMY_IMPACT_DELAY_MS);

      scheduleBattleStep(() => {
        setBattle((current) => {
          if (!current.animating || current.phase !== "combat") return current;
          if (current.partyHp <= 0)
            {
              battleSequenceLive.current = false;
              return {
                ...current,
                phase: "defeat",
                totalTurns: current.totalTurns + 1,
                cooldowns: nextCooldowns,
                actingIndex: -1,
                hitEnemyIndices: [],
                enemyDamageNumbers: current.enemyHps.map(() => null),
                partyHpChange: null,
                enemyActing: false,
                animating: false,
                actions: [null, null, null],
                activeActions: [null, null, null],
              };
            }
          return {
            ...current,
            partyHpChange: null,
            enemyActing: false,
          };
        });
      }, stepDelay + BATTLE_ENEMY_RECOVERY_DELAY_MS);
    });

    scheduleBattleStep(() => {
      battleSequenceLive.current = false;
      setBattle((current) => {
        if (!current.animating || current.phase !== "combat") return current;
        if (current.partyHp <= 0)
          return {
            ...current,
            phase: "defeat",
            totalTurns: current.totalTurns + 1,
            cooldowns: nextCooldowns,
            actingIndex: -1,
            hitEnemyIndices: [],
            enemyDamageNumbers: current.enemyHps.map(() => null),
            partyHpChange: null,
            enemyActing: false,
            animating: false,
            actions: [null, null, null],
            activeActions: [null, null, null],
          };
        const regenPercent = current.activePartyEffects.reduce(
          (total, effect) =>
            effect.kind === "regen" ? total + (effect.amount ?? 0) : total,
          0,
        );
        const healedPartyHp = Math.min(100, current.partyHp + regenPercent);
        const actualRegeneration = Math.max(
          0,
          Math.round(((healedPartyHp - current.partyHp) * partyMaxHp) / 100),
        );
        const activePartyEffects = current.activePartyEffects
          .map((effect) => ({
            ...effect,
            remainingTurns: effect.remainingTurns - 1,
          }))
          .filter((effect) => effect.remainingTurns > 0);
        const progressed = damageEnemies(
          { ...current, partyHp: healedPartyHp, activePartyEffects },
          current.enemyHps.map(() => 0),
        );
        if (progressed.phase !== "combat")
          return {
            ...progressed,
            totalTurns: current.totalTurns + 1,
            cooldowns: nextCooldowns,
            actingIndex: -1,
            hitEnemyIndices: [],
            enemyDamageNumbers: current.enemyHps.map(() => null),
            partyHpChange:
              actualRegeneration > 0
                ? {
                    amount: actualRegeneration,
                    kind: "heal",
                    stamp: Date.now(),
                  }
                : null,
            enemyActing: false,
            animating: false,
            actions: [null, null, null],
            activeActions: [null, null, null],
          };
        return {
          ...progressed,
          totalTurns: current.totalTurns + 1,
          cooldowns: nextCooldowns,
          ultimate: activeSynergy
            ? Math.min(
                getUltimateGaugeMax(activeSynergy),
                current.ultimate + 24,
              )
            : 0,
          turn: current.turn + 1,
          actingIndex: -1,
          hitEnemyIndices: [],
          enemyDamageNumbers: current.enemyHps.map(() => null),
          partyHpChange:
            actualRegeneration > 0
              ? {
                  amount: actualRegeneration,
                  kind: "heal",
                  stamp: Date.now(),
                }
              : null,
          enemyActing: false,
          animating: false,
          actions: [null, null, null],
          activeActions: [null, null, null],
          message: `${current.message}${actualRegeneration > 0 ? ` 継続回復で${actualRegeneration}回復。` : ""} 次の行動を選ぼう。`,
        };
      });
    }, effectiveInitiative.length * actionGap);
  }

  function chooseBlessing(name: string) {
    clearBattleSequence();
    setBattle((current) => {
      const wave = current.wave + 1;
      const enemyHps = createWaveEnemyHps(getStage(current.stageId), wave);
      return {
        ...current,
        phase: "combat",
        wave,
        turn: 1,
        enemyHps,
        enemyMaxHps: [...enemyHps],
        actingEnemyIndex: -1,
        targetEnemyIndex: 0,
        targetEnemyIndices: [0, 0, 0],
        selectedPartyIndex: 0,
        hitEnemyIndices: [],
        enemyDamageNumbers: enemyHps.map(() => null),
        partyHpChange: null,
        actions: [null, null, null],
        activeActions: [null, null, null],
        blessings: [...current.blessings, name],
        message: `${name}を獲得。次の敵が現れた！`,
      };
    });
  }

  function summon(count: 1 | 10) {
    const cost = count * 300;
    if (profile.gems < cost || summoning) return;
    setSummoning(true);
    setSummonResults([]);
    window.setTimeout(() => {
      const rotation = getLimitedRotation(Date.now());
      let pity =
        summonBanner === "limited"
          ? (profile.limitedPity[rotation.key] ?? 0)
          : profile.pity;
      const results: Character[] = [];
      for (let index = 0; index < count; index += 1) {
        pity += 1;
        const character = pickCharacter(
          count === 10 && index === 9,
          pity >= 80,
          summonBanner,
          rotation.featured,
          summonSeries,
        );
        if (character.rarity === "SSR") pity = 0;
        results.push(character);
      }
      setProfile((current) => {
        const resolved = resolveSummonResults(current.owned, results);
        return {
          ...current,
          gems: current.gems - cost,
          pity: summonBanner !== "limited" ? pity : current.pity,
          limitedPity:
            summonBanner === "limited"
              ? { ...current.limitedPity, [rotation.key]: pity }
              : current.limitedPity,
          owned: resolved.owned,
          shards: current.shards + resolved.shards,
        };
      });
      setSummonResults(results);
      setSummoning(false);
    }, 1100);
  }

  function levelUp(characterId: string, requestedLevel?: number) {
    setProfile((current) => {
      if (!current.owned.includes(characterId)) return current;
      const level = current.levels[characterId] ?? 1;
      const evolution = current.evolutions[characterId] ?? 0;
      const levelCap = getLevelCap(evolution);
      const plan = getLevelUpgradePlan(
        level,
        levelCap,
        current.gold,
        current.trainingCrystals,
        requestedLevel,
      );
      if (
        level >= levelCap ||
        plan.targetLevel <= level ||
        current.gold < plan.goldCost ||
        current.trainingCrystals < plan.crystalCost
      )
        return current;
      return {
        ...current,
        gold: current.gold - plan.goldCost,
        trainingCrystals:
          current.trainingCrystals - plan.crystalCost,
        levels: { ...current.levels, [characterId]: plan.targetLevel },
      };
    });
  }

  function evolveCharacter(characterId: string) {
    setProfile((current) => {
      const character = ROSTER.find((unit) => unit.id === characterId);
      if (!character) return current;
      const evolution = current.evolutions[characterId] ?? 0;
      const level = current.levels[characterId] ?? 1;
      const maxEvolution = getCharacterMaxEvolution(character);
      const levelCap = getLevelCap(evolution);
      const requirement = getEvolutionRequirements(character, evolution);
      if (
        evolution >= maxEvolution ||
        level < levelCap ||
        current[requirement.material] < requirement.amount ||
        current.evolutionMaterialCharacters <
          requirement.evolutionMaterialCharacters ||
        (current.characterCopies[characterId] ?? 0) < requirement.copies
      )
        return current;
      return {
        ...current,
        [requirement.material]:
          current[requirement.material] - requirement.amount,
        evolutionMaterialCharacters:
          current.evolutionMaterialCharacters -
          requirement.evolutionMaterialCharacters,
        characterCopies: requirement.copies
          ? {
              ...current.characterCopies,
              [characterId]:
                (current.characterCopies[characterId] ?? 0) - requirement.copies,
            }
          : current.characterCopies,
        evolutions: { ...current.evolutions, [characterId]: evolution + 1 },
      };
    });
  }

  function levelUpSkill(characterId: string, skillId: string) {
    setProfile((current) => {
      const character = CHARACTER_BY_ID.get(characterId);
      if (!character || !current.owned.includes(characterId)) return current;
      const evolution = current.evolutions[characterId] ?? 0;
      const skill = getCharacterSkills(character, evolution).find(
        (candidate) => candidate.id === skillId,
      );
      if (!skill) return current;
      const level = Math.max(
        1,
        Math.min(6, current.skillLevels[skillId] ?? 1),
      );
      const cost = SKILL_LEVEL_COSTS[level - 1] ?? 0;
      if (level >= 6 || current.skillMaterialCharacters < cost) return current;
      return {
        ...current,
        skillMaterialCharacters: current.skillMaterialCharacters - cost,
        skillLevels: { ...current.skillLevels, [skillId]: level + 1 },
      };
    });
  }

  function exchangeBossCopy(characterId: string) {
    setProfile((current) => {
      if (
        !EXCHANGEABLE_BOSS_IDS.has(characterId) ||
        !CHARACTER_BY_ID.has(characterId) ||
        (current.bossTokens[characterId] ?? 0) < 100
      )
        return current;
      const alreadyOwned = current.owned.includes(characterId);
      return {
        ...current,
        owned: alreadyOwned ? current.owned : [...current.owned, characterId],
        characterCopies: alreadyOwned
          ? {
              ...current.characterCopies,
              [characterId]: (current.characterCopies[characterId] ?? 0) + 1,
            }
          : current.characterCopies,
        bossTokens: {
          ...current.bossTokens,
          [characterId]: current.bossTokens[characterId] - 100,
        },
      };
    });
    playChord(820, 0.18);
  }

  function exchangeStarterEx(characterId: string) {
    setProfile((current) => {
      if (
        !STARTER_EX_IDS.includes(
          characterId as (typeof STARTER_EX_IDS)[number],
        ) ||
        current.owned.includes(characterId) ||
        current.shards < 1_500
      )
        return current;
      return {
        ...current,
        shards: current.shards - 1_500,
        owned: [...current.owned, characterId],
        levels: { ...current.levels, [characterId]: 1 },
      };
    });
    playChord(900, 0.2);
  }

  function exchangeShards(
    reward:
      | "gold"
      | "crystals"
      | "stones"
      | "dragonHeadStones"
      | "crownStones"
      | "liberationBooksByShards"
      | "liberationBooksByCrowns",
  ) {
    setProfile((current) => {
      const shardCost =
        reward === "crownStones"
          ? 200
          : reward === "liberationBooksByShards"
            ? 250
            : reward === "liberationBooksByCrowns"
              ? 0
              : 100;
      const crownCost = reward === "liberationBooksByCrowns" ? 150 : 0;
      if (current.shards < shardCost || current.crownStones < crownCost)
        return current;
      return {
        ...current,
        shards: current.shards - shardCost,
        crownStones:
          Math.min(
            MAX_ITEM_COUNT,
            current.crownStones - crownCost +
              (reward === "crownStones" ? 5 : 0),
          ),
        dragonHeadStones:
          Math.min(
            MAX_ITEM_COUNT,
            current.dragonHeadStones +
              (reward === "dragonHeadStones" ? 10 : 0),
          ),
        liberationBooks:
          Math.min(
            MAX_ITEM_COUNT,
            current.liberationBooks +
              (reward === "liberationBooksByShards" ||
              reward === "liberationBooksByCrowns"
                ? 5
                : 0),
          ),
        gold: Math.min(
          MAX_GOLD,
          current.gold + (reward === "gold" ? 1000 : 0),
        ),
        trainingCrystals:
          Math.min(
            MAX_ITEM_COUNT,
            current.trainingCrystals + (reward === "crystals" ? 10 : 0),
          ),
        evoStones: Math.min(
          MAX_ITEM_COUNT,
          current.evoStones + (reward === "stones" ? 5 : 0),
        ),
      };
    });
    playChord(780, 0.16);
  }

  function buyDailyEquipment(offerId: string, purchaseTime: number) {
    setProfile((current) => {
      const offer = getDailyEquipmentOffers(purchaseTime).find(
        (candidate) => candidate.id === offerId,
      );
      if (
        !offer ||
        current.dailyShopPurchases.includes(offer.id) ||
        current.gold < offer.item.price ||
        (current.equipmentInventory[offer.item.id] ?? 0) >=
          MAX_EQUIPMENT_COUNT
      )
        return current;
      return {
        ...current,
        gold: current.gold - offer.item.price,
        equipmentInventory: {
          ...current.equipmentInventory,
          [offer.item.id]:
            (current.equipmentInventory[offer.item.id] ?? 0) + 1,
        },
        dailyShopPurchases: [
          ...current.dailyShopPurchases,
          offer.id,
        ].slice(-180),
      };
    });
    playChord(720, 0.14);
  }

  function equipCharacterItem(
    characterId: string,
    equipmentId: string | null,
  ) {
    setProfile((current) => {
      const character = CHARACTER_BY_ID.get(characterId);
      if (!character || !current.owned.includes(characterId)) return current;
      if (equipmentId === null) {
        if (!current.equippedItems[characterId]) return current;
        const equippedItems = { ...current.equippedItems };
        delete equippedItems[characterId];
        return { ...current, equippedItems };
      }
      const item = EQUIPMENT_BY_ID.get(equipmentId);
      if (
        !item ||
        !isEquipmentCompatible(character.types ?? ["不明"], item)
      )
        return current;
      const usedByOthers = Object.entries(current.equippedItems).filter(
        ([ownerId, itemId]) =>
          ownerId !== characterId && itemId === equipmentId,
      ).length;
      if (
        usedByOthers >= (current.equipmentInventory[equipmentId] ?? 0)
      )
        return current;
      return {
        ...current,
        equippedItems: {
          ...current.equippedItems,
          [characterId]: equipmentId,
        },
      };
    });
    playSe(equipmentId ? 680 : 260, 0.08);
  }

  function setTeamMember(slot: number, characterId: string) {
    setProfile((current) => {
      if (!current.owned.includes(characterId)) return current;
      const safeSlot = Math.max(0, Math.min(PARTY_SIZE - 1, slot));
      const activePartyIndex = Math.max(
        0,
        Math.min(PARTY_COUNT - 1, current.activePartyIndex),
      );
      const parties = current.parties.map((party) => [...party]);
      const team = [...(parties[activePartyIndex] ?? current.team)];
      const duplicateSlot = team.indexOf(characterId);
      if (duplicateSlot >= 0)
        [team[safeSlot], team[duplicateSlot]] = [
          team[duplicateSlot],
          team[safeSlot],
        ];
      else team[safeSlot] = characterId;
      parties[activePartyIndex] = team;
      return { ...current, team, parties };
    });
  }

  function setActiveParty(index: number) {
    setProfile((current) => {
      const activePartyIndex = Math.max(0, Math.min(PARTY_COUNT - 1, index));
      const team = current.parties[activePartyIndex] ?? current.team;
      return { ...current, activePartyIndex, team: [...team] };
    });
  }

  function claimStarterGift(characterId: string) {
    if (
      !STARTER_EX_IDS.includes(
        characterId as (typeof STARTER_EX_IDS)[number],
      )
    )
      return;
    setProfile((current) => {
      if (current.starterGiftClaimed) return current;
      return {
        ...current,
        starterGiftClaimed: true,
        starterGiftCharacterId: characterId,
        owned: current.owned.includes(characterId)
          ? current.owned
          : [...current.owned, characterId],
        levels: { ...current.levels, [characterId]: 1 },
      };
    });
    playChord(920, 0.22);
  }

  function claimRerollGift(results: Character[]) {
    if (results.length !== 10) return;
    setProfile((current) => {
      if (current.rerollGiftClaimed) return current;
      const resolved = resolveSummonResults(current.owned, results);
      return {
        ...current,
        rerollGiftClaimed: true,
        owned: resolved.owned,
        shards: current.shards + resolved.shards,
      };
    });
    playChord(980, 0.28);
  }

  function changeVolume(value: number) {
    setProfile((current) => ({
      ...current,
      seVolume: value,
    }));
    if (value > 0) window.setTimeout(() => playSe(660, 0.08), 0);
  }

  function redeemPromo(rawCode: string) {
    const code = rawCode.trim().toUpperCase();
    const reward = PROMO_CODES[code];
    if (!reward) {
      setPromoMessage("コードが見つかりません。");
      playSe(150, 0.12);
      return;
    }
    if (profile.usedCodes.includes(code)) {
      setPromoMessage("このコードは受け取り済みです。");
      return;
    }
    setProfile((current) => {
      const progress = addPlayerXp(
        current.playerLevel,
        current.playerXp,
        reward.xp,
      );
      if (reward.maxInventory) {
        return {
          ...current,
          gold: MAX_GOLD,
          shards: MAX_ITEM_COUNT,
          trainingCrystals: MAX_ITEM_COUNT,
          evoStones: MAX_ITEM_COUNT,
          dragonHeadStones: MAX_ITEM_COUNT,
          crownStones: MAX_ITEM_COUNT,
          liberationBooks: MAX_ITEM_COUNT,
          evolutionMaterialCharacters: MAX_ITEM_COUNT,
          skillMaterialCharacters: MAX_ITEM_COUNT,
          equipmentInventory: Object.fromEntries(
            EQUIPMENT_ITEMS.map((item) => [item.id, MAX_EQUIPMENT_COUNT]),
          ),
          bossTokens: Object.fromEntries(
            Array.from(
              new Set([
                ...Object.keys(current.bossTokens),
                ...ROSTER.filter((character) =>
                  EXCHANGEABLE_BOSS_IDS.has(character.id),
                ).map((character) => character.id),
              ]),
            ).map((characterId) => [characterId, MAX_ITEM_COUNT]),
          ),
          usedCodes: [...current.usedCodes, code],
        };
      }
      return {
        ...current,
        ...progress,
        gems: current.gems + reward.gems,
        gold: current.gold + reward.gold,
        evoStones: current.evoStones + reward.stones,
        trainingCrystals:
          current.trainingCrystals + (reward.crystals ?? 0),
        dragonHeadStones:
          current.dragonHeadStones + (reward.dragonHeadStones ?? 0),
        crownStones: current.crownStones + (reward.crownStones ?? 0),
        liberationBooks:
          current.liberationBooks + (reward.liberationBooks ?? 0),
        evolutionMaterialCharacters:
          current.evolutionMaterialCharacters +
          (reward.evolutionMaterialCharacters ?? 0),
        skillMaterialCharacters:
          current.skillMaterialCharacters +
          (reward.skillMaterialCharacters ?? 0),
        owned: reward.allCharacters
          ? ROSTER.map((character) => character.id)
          : current.owned,
        usedCodes: [...current.usedCodes, code],
      };
    });
    setPromoMessage(`${reward.label}を受け取りました！`);
    playSe(880, 0.18);
  }

  const stage = getStage(battle.stageId);
  const waveEnemies = getWaveEnemies(stage, battle.wave);
  const enemy = waveEnemies[battle.targetEnemyIndex] ?? waveEnemies[0];
  const heldEnemy = waveEnemies[heldEnemyIndex ?? 0] ?? waveEnemies[0];
  const enemyCount = getEnemyCount(stage, battle.wave);
  const aliveEnemyIndices = getAliveEnemyIndices(battle.enemyHps);
  const party = battle.partyIds.map((id) =>
    resolveProfileCharacterVisual(
      CHARACTER_BY_ID.get(id) ?? requireCharacter(INITIAL_TEAM_IDS[0]),
      profile,
      battle.runId,
    ),
  );
  const appearanceRunId = battle.partyIds.includes(LUCKY_BURNS_ID) ? battle.runId : undefined;
  const battleSynergy = battle.synergyId
    ? PARTY_SYNERGY_BY_ID.get(battle.synergyId) ?? null
    : null;
  const battleUltimateTier = getUltimateTier(battle.ultimate, battleSynergy);
  const partyStats = getBattlePartyStats(
    party,
    profile,
    battle.activePartyEffects,
    battleSynergy,
  );
  const partyMaxHp = partyStats.reduce((sum, stats) => sum + stats.hp, 0);
  const partyCurrentHp = Math.max(
    0,
    Math.ceil((partyMaxHp * battle.partyHp) / 100),
  );
  const selectedPartyAction = battle.actions[battle.selectedPartyIndex];
  const selectedPartyUnit = party[battle.selectedPartyIndex];
  const selectedPartySkill = getCharacterSkills(
    selectedPartyUnit,
    profile.evolutions[selectedPartyUnit.id] ?? 0,
  )[battle.selectedSkillIndices[battle.selectedPartyIndex]];
  const selectedPartyCanTarget =
    !selectedPartyAction ||
    ((selectedPartyAction === "attack" ||
      (selectedPartyAction === "skill" &&
        selectedPartySkill?.kind === "damage")) &&
      getActionScope(
        selectedPartyUnit,
        selectedPartyAction,
        selectedPartySkill,
      ) === "single");

  if (!hydrated) return (
    <main className="game-shell">
      <section className="game-phone relic-ui save-loading" aria-live="polite">
        <h1>レリック・ラッシュ</h1>
        <p>{saveLoadError ? "セーブを確認できませんでした。通信を確認して再度お試しください。" : saveChoice ? "続ける冒険を選んでください。" : "セーブを確認中…"}</p>
        {saveLoadError && <button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>再読み込み</button>}
        <AlertDialog open={Boolean(saveChoice)}>
          <AlertDialogContent className="save-choice-dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>{saveChoice?.legacy ? "以前の端末データが見つかりました" : "別の端末で冒険が進んでいます"}</AlertDialogTitle>
              <AlertDialogDescription>
                {saveChoice?.legacy ? "このデータが自分の冒険か確認してください。引き継ぐと、現在のアカウントで続けられます。" : "両方のデータを保管しました。どちらから続けるか選んでください。所持品や通貨は、選んだデータの内容になります。"}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {saveChoice && <>
              <div className="save-choice-summary">
                <p><b>この端末</b><span>{saveChoice.candidate.username} · Lv.{saveChoice.candidate.playerLevel} · クリア {saveChoice.candidate.clears}</span><small>{saveChoice.candidate.userId}</small></p>
                <p><b>{saveChoice.cloud.profile ? "クラウド" : "新しい冒険"}</b><span>{saveChoice.cloud.profile ? `${saveChoice.cloud.profile.username} · Lv.${saveChoice.cloud.profile.playerLevel} · クリア ${saveChoice.cloud.profile.clears}` : "初期状態から始めます"}</span><small>{saveChoice.cloud.profile?.userId}</small></p>
              </div>
              <AlertDialogFooter>
                <button type="button" onClick={() => resolveSaveChoice(false)}>{saveChoice.cloud.profile ? "クラウドから続ける" : "新しく始める"}</button>
                <button type="button" onClick={() => resolveSaveChoice(true)}>{saveChoice.legacy ? "自分のデータを引き継ぐ" : "この端末の冒険から続ける"}</button>
              </AlertDialogFooter>
            </>}
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </main>
  );

  return (
    <main
      className="game-shell"
      data-viewport={`${viewport.width}x${viewport.height}`}
      style={
        {
          "--viewport-width": `${viewport.width}px`,
          "--viewport-height": `${viewport.height}px`,
        } as CSSProperties
      }
    >
      <section
        className="game-phone relic-ui"
        data-view={view}
        aria-label="レリック・ラッシュ"
      >
        {showOpening && <OpeningView closeOpening={closeOpening} />}
        {view !== "battle" && (
          <header className="player-hud">
            <div className="hud-topline">
              <div className="hud-player-summary" aria-label="プレイヤー情報">
                <UserRound size={18} />
                <span>
                  <strong>{profile.username}</strong>
                  <small>Lv.{profile.playerLevel}</small>
                </span>
                <div className="hud-exp">
                  <i>
                    <b style={{ width: `${Math.min(100, (profile.playerXp / getPlayerXpNeeded(profile.playerLevel)) * 100)}%` }} />
                  </i>
                  <small>EXP {profile.playerXp} / {getPlayerXpNeeded(profile.playerLevel)}</small>
                </div>
              </div>
              <div className="hud-utilities">
                <button
                  className={`hud-icon-button ${profile.starterGiftClaimed && profile.rerollGiftClaimed ? "" : "has-notice"}`}
                  type="button"
                  aria-label="プレゼントボックス"
                  onClick={() => navigateTo("inbox")}
                >
                  <Gift size={20} />
                  {(!profile.starterGiftClaimed || !profile.rerollGiftClaimed) && (
                    <i>{Number(!profile.starterGiftClaimed) + Number(!profile.rerollGiftClaimed)}</i>
                  )}
                </button>
              </div>
            </div>
            <div className="hud-statusline">
              <div className="hud-wallet" aria-label="所持通貨">
                <span>
                  <Gem size={14} />
                  <b>{profile.gems.toLocaleString()}</b>
                </span>
                <span>
                  <Coins size={14} />
                  <b>{profile.gold.toLocaleString()}</b>
                </span>
              </div>
            </div>
          </header>
        )}

        <div className="game-content" data-screen={view}>
          {view === "home" && (
            <HomeView
              profile={profile}
              setView={navigateTo}
              replayOpening={() => setShowOpening(true)}
            />
          )}
          {view === "stages" && (
            <StageView profile={profile} startBattle={prepareBattle} />
          )}
          {view === "events" && (
            profile.playerLevel >= EVENT_UNLOCK_LEVEL ? (
              <EventView profile={profile} startBattle={prepareBattle} />
            ) : (
              <ModeLockedView
                title="イベント"
                currentLevel={profile.playerLevel}
                requiredLevel={EVENT_UNLOCK_LEVEL}
                setView={navigateTo}
              />
            )
          )}
          {view === "abyss" && (
            profile.playerLevel >= ABYSS_UNLOCK_LEVEL ? (
              <AbyssView profile={profile} startBattle={prepareBattle} />
            ) : (
              <ModeLockedView
                title="深淵奈落"
                currentLevel={profile.playerLevel}
                requiredLevel={ABYSS_UNLOCK_LEVEL}
                setView={navigateTo}
              />
            )
          )}

          {view === "battle" && (
            <section className="battle-view">
              {battle.phase === "blessing" && (
                <button
                  className="retreat-button retreat-button-overlay"
                  type="button"
                  onClick={() => setRetreatConfirm(true)}
                  disabled={battle.animating}
                >
                  <LogOut size={14} />
                  撤退
                </button>
              )}
              {battle.phase === "combat" && (
                <>
                  {exCutin && (
                    <div
                      className={`ex-cutin ex-cutin-${exCutin.character.id.replace("ex-", "")}`}
                      aria-live="assertive"
                    >
                      <div className="ex-cutin-speedlines" />
                      <img src={getExCutinImage(exCutin.character.id)} alt={exCutin.character.name} />
                      <div className="ex-cutin-copy">
                        <small>EX奥義</small>
                        <strong>{exCutin.character.name}</strong>
                        <b>{exCutin.skill.name}</b>
                      </div>
                    </div>
                  )}
                  <div
                    className="battle-scene"
                    style={{
                      backgroundImage: `linear-gradient(180deg,${stage.atmosphere ?? "#06121b24"},#07141ec9),url('${stage.background}')`,
                    }}
                  >
                    <div className="battle-topbar">
                      <div className="battle-hud">
                        <span className="battle-stage-title">{stage.title}</span>
                        <span className="battle-stage-meta">
                          戦闘 {battle.wave}/{stage.enemies.length} ・ {enemy.isBoss ? "ボス" : stage.area}
                        </span>
                      </div>
                      <button
                        className="retreat-button"
                        type="button"
                        onClick={() => setRetreatConfirm(true)}
                        disabled={battle.animating}
                      >
                        <LogOut size={14} />
                        撤退
                      </button>
                    </div>
                    <div className="battle-status-row">
                      <div className="turn-badge">
                        <small>ターン</small>
                        <strong>{battle.turn}</strong>
                      </div>
                      <div className="battle-enemy-count" aria-label={`残り ${aliveEnemyIndices.length} / ${enemyCount}`}>
                        <small>残り</small>
                        <strong>{aliveEnemyIndices.length}</strong>
                        <i>/</i>
                        <span>{enemyCount}</span>
                      </div>
                      <div className="enemy-scan-hint">
                        <Crosshair size={15} />
                        <span>敵を長押し</span>
                        <strong>個別情報を確認</strong>
                      </div>
                    </div>
                    <div
                      className={`enemy-pack count-${enemyCount}`}
                      role="group"
                      aria-label="攻撃する敵を選択"
                    >
                      {battle.enemyHps.map((hp, index) => {
                        const enemy = waveEnemies[index];
                        const enemyUnitMaxHp = enemy.maxHp;
                        const defeated = hp <= 0;
                        const targeted =
                          !defeated &&
                          selectedPartyCanTarget &&
                          battle.targetEnemyIndices[
                            battle.selectedPartyIndex
                          ] === index;
                        const damageNumber = battle.enemyDamageNumbers[index];
                        const hit =
                          battle.animating &&
                          !battle.enemyActing &&
                          battle.hitEnemyIndices.includes(index);
                        return (
                          <button
                            className={`enemy-unit pack-${enemyCount} ${targeted ? "is-targeted" : ""} ${defeated ? "is-defeated" : ""}`}
                            key={`${enemy.name}-${index}`}
                            type="button"
                            onClick={() => selectEnemyTarget(index)}
                            onPointerDown={() => beginEnemyHold(index)}
                            onPointerUp={cancelEnemyHold}
                            onPointerCancel={cancelEnemyHold}
                            onPointerLeave={cancelEnemyHold}
                            onContextMenu={(event) => event.preventDefault()}
                            disabled={battle.animating || defeated}
                            aria-pressed={targeted}
                            aria-label={`${enemy.name}${enemyCount > 1 ? ` ${index + 1}` : ""} HP ${Math.ceil(hp)} / ${enemyUnitMaxHp}${targeted ? " 選択中" : ""}`}
                          >
                            {targeted && !defeated && (
                              <span
                                className="enemy-target-scope"
                                aria-label={`${party[battle.selectedPartyIndex].name}が選択中`}
                              >
                                <Crosshair size={16} />
                              </span>
                            )}
                            {damageNumber && (
                              <span
                                className={`damage-number enemy-damage-number ${damageNumber.critical ? "is-critical" : ""}`}
                                key={damageNumber.stamp}
                              >
                                -{damageNumber.amount}
                              </span>
                            )}
                            <img
                              className={`boss-sprite ${battle.enemyActing && battle.actingEnemyIndex === index && !defeated ? "is-attacking" : ""} ${hit ? "is-hit" : ""}`}
                              src={enemy.image}
                              alt=""
                              style={
                                {
                                  "--enemy-hue": `${enemy.hue ?? 0}deg`,
                                  "--enemy-delay": `${index * -0.16}s`,
                                } as React.CSSProperties
                              }
                            />
                            <span className="enemy-unit-health">
                              <small>
                                <span>{defeated ? "撃破" : enemy.name}</span>
                                {!defeated && <em>Lv.{enemy.level}</em>}
                              </small>
                              <b>
                                {Math.ceil(hp)} / {enemyUnitMaxHp}
                              </b>
                              <i>
                                <em
                                  style={{
                                    width: `${Math.max(0, (hp / enemyUnitMaxHp) * 100)}%`,
                                  }}
                                />
                              </i>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {battle.partyHpChange && (
                      <span
                        className={`damage-number party-damage-number ${battle.partyHpChange.kind === "heal" ? "is-heal" : "is-taken"}`}
                        key={battle.partyHpChange.stamp}
                      >
                        {battle.partyHpChange.kind === "heal" ? "+" : "-"}
                        {battle.partyHpChange.amount}
                      </span>
                    )}
                    <div className="battle-party">
                      {party.map((character, index) => (
                        <div
                          className={`battle-unit unit-${index} rarity-${character.rarity.toLowerCase()} char-${character.id} ${character.motionFrames?.length === 6 ? "has-motion-frames" : ""} motion-${ROSTER.findIndex((unit) => unit.id === character.id) % 37} motion-type-${getMotionType(character)} move-${battle.activeActions[index] ?? "idle"} evo-${profile.evolutions[character.id] ?? 0} ${battle.actingIndex === index ? "is-acting" : ""}`}
                          key={character.id}
                          style={getMotionStyle(character)}
                        >
                          <i className="motion-effect" />
                          {character.motionFrames?.length === 6 ? (
                            <i
                              className="elite-motion-frames"
                              role="img"
                              aria-label={character.name}
                            >
                              {character.motionFrames.map((frame, frameIndex) => (
                                <img
                                  className={`elite-motion-frame elite-motion-frame-${frameIndex + 1}`}
                                  src={frame}
                                  alt=""
                                  aria-hidden="true"
                                  key={frame}
                                />
                              ))}
                            </i>
                          ) : (
                            <>
                              <img
                                className="idle-sprite"
                                src={character.image}
                                alt={character.name}
                              />
                              <img
                                className="action-sprite"
                                src={character.actionImage}
                                alt=""
                              />
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="combat-panel">
                    <div className="party-health">
                      <HeartPulse size={16} />
                      <div className="hp-track">
                        <i style={{ width: `${battle.partyHp}%` }} />
                      </div>
                      <strong>{partyCurrentHp.toLocaleString()} / {partyMaxHp.toLocaleString()}</strong>
                    </div>
                    {battleSynergy && (
                      <div
                        className="battle-synergy-banner"
                        style={{ "--synergy-color": battleSynergy.color } as CSSProperties}
                      >
                        <Link2 size={16} />
                        <span><small>連携覚醒</small><strong>{battleSynergy.name}</strong></span>
                        <b>{battleSynergy.awakeningName}</b>
                      </div>
                    )}
                    {battle.activePartyEffects.length > 0 && (
                      <div className="active-effect-list" aria-label="発動中の効果">
                        {battle.activePartyEffects.map((effect) => (
                          <span key={effect.id}>
                            {effect.kind === "atk"
                              ? "攻撃UP"
                              : effect.kind === "def"
                                ? "防御UP"
                                : effect.kind === "spd"
                                  ? "速度UP"
                                  : "継続回復"}
                            <b>{effect.remainingTurns}</b>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="command-list">
                      {party.map((unit, index) => {
                        const selectedAction = battle.actions[index];
                        const unitSkills = getCharacterSkills(
                          unit,
                          profile.evolutions[unit.id] ?? 0,
                        );
                        const selectedSkillIndex = Math.min(
                          unitSkills.length - 1,
                          battle.selectedSkillIndices[index] ?? 0,
                        );
                        const selectedSkill = unitSkills[selectedSkillIndex];
                        const selectedSkillCooldown =
                          battle.cooldowns[index]?.[selectedSkillIndex] ?? 0;
                        const targetsEnemy = Boolean(
                          !selectedAction ||
                            selectedAction === "attack" ||
                            (selectedAction === "skill" &&
                              selectedSkill.kind === "damage"),
                        );
                        const targetsAll = Boolean(
                          targetsEnemy &&
                            selectedAction &&
                            getActionScope(
                              unit,
                              selectedAction,
                              selectedSkill,
                            ) === "all",
                        );
                        return (
                          <div
                            className={`command-row ${battle.selectedPartyIndex === index ? "is-targeting" : ""}`}
                            key={unit.id}
                          >
                            <button
                              className="command-name"
                              type="button"
                              onClick={() => selectPartyForTarget(index)}
                              disabled={battle.animating}
                              aria-pressed={battle.selectedPartyIndex === index}
                              aria-label={`${unit.name}の攻撃対象を選ぶ`}
                            >
                              <strong>{unit.name}<small className="command-level">Lv.{profile.levels[unit.id] ?? 1}</small></strong>
                              <b>
                                <Crosshair size={11} />
                                {!targetsEnemy
                                  ? "対象なし"
                                  : targetsAll
                                  ? "敵全体"
                                  : enemyCount > 1
                                    ? `敵 ${battle.targetEnemyIndices[index] + 1}`
                                    : "敵"}
                              </b>
                            </button>
                            <div className="command-actions">
                            <button
                              className={
                                `${battle.actions[index] === "attack" ? "is-selected" : ""} ${unit.attackScope === "all" ? "is-area-action" : ""}`
                              }
                              type="button"
                              onClick={() => selectAction(index, "attack")}
                              disabled={battle.animating}
                              aria-label={`${unit.name}の${unit.attackScope === "all" ? "全体攻撃" : "攻撃"}`}
                            >
                              <Swords size={14} />
                              攻撃
                            </button>
                            <button
                              className={
                                `${battle.actions[index] === "skill" ? "is-selected" : ""} ${selectedSkill.kind === "damage" && selectedSkill.scope === "all" ? "is-area-action" : ""}`
                              }
                              type="button"
                              onClick={() => setSkillPickerIndex((current) => current === index ? null : index)}
                              disabled={battle.animating}
                              aria-label={`${unit.name}のスキル一覧${selectedSkill.kind === "damage" && selectedSkill.scope === "all" ? "、選択中は敵全体" : ""}`}
                              onPointerDown={() => beginSkillHold(unit, selectedSkill)}
                              onPointerUp={cancelSkillHold}
                              onPointerCancel={cancelSkillHold}
                              onPointerLeave={cancelSkillHold}
                              onContextMenu={(event) => event.preventDefault()}
                            >
                              {selectedSkill.kind === "heal" ? (
                                <HeartPulse size={14} />
                              ) : selectedSkill.kind === "guard" ? (
                                <Shield size={14} />
                              ) : selectedSkill.kind === "buff" ? (
                                <Sparkles size={14} />
                              ) : (
                                <Flame size={14} />
                              )}
                              スキル
                              {selectedSkillCooldown > 0 && (
                                <small className="skill-cooldown-badge">{selectedSkillCooldown}</small>
                              )}
                            </button>
                            <button
                              className={
                                battle.actions[index] === "guard"
                                  ? "is-selected"
                                  : ""
                              }
                              type="button"
                              onClick={() => selectAction(index, "guard")}
                              disabled={battle.animating}
                            >
                              <Shield size={14} />
                              防御
                            </button>
                            {skillPickerIndex === index && (
                              <div className="skill-picker" role="menu" aria-label={`${unit.name}のスキル選択`}>
                                {unitSkills.map((skill, skillIndex) => {
                                  const cooldown =
                                    battle.cooldowns[index]?.[skillIndex] ?? 0;
                                  const skillLevel =
                                    profile.skillLevels[skill.id] ?? 1;
                                  return (
                                    <button
                                      key={skill.id}
                                      type="button"
                                      role="menuitem"
                                      aria-disabled={cooldown > 0}
                                      className={cooldown > 0 ? "is-cooling-down" : ""}
                                      onClick={() =>
                                        cooldown === 0
                                          ? selectAction(index, "skill", skillIndex)
                                          : undefined
                                      }
                                      onPointerDown={() => beginSkillHold(unit, skill)}
                                      onPointerUp={cancelSkillHold}
                                      onPointerCancel={cancelSkillHold}
                                      onPointerLeave={cancelSkillHold}
                                    >
                                      <strong>
                                        {skill.name} <em>Lv.{skillLevel}</em>
                                      </strong>
                                      <small>
                                        {cooldown > 0
                                          ? `あと${cooldown}ターン`
                                          : getSkillDescription(skill, skillLevel)}
                                      </small>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="turn-actions">
                      <button
                        className="execute-button"
                        type="button"
                        onClick={() => executeTurn(false)}
                        disabled={
                          battle.animating ||
                          battle.actions.some((action) => !action)
                        }
                      >
                        <Swords size={18} />
                        {battle.animating ? "行動中…" : "3人の行動開始"}
                      </button>
                      <button
                        className={`ultimate-button ${battleUltimateTier !== "none" ? "is-ready" : ""} ${battleUltimateTier === "extreme" ? "is-extreme" : ""}`}
                        type="button"
                        onClick={() => executeTurn(true)}
                        disabled={battleUltimateTier === "none" || battle.animating}
                      >
                        <Sparkles size={17} />
                        <span>
                          {battleSynergy
                            ? battleUltimateTier === "extreme"
                              ? "連携奥義・極"
                              : "連携奥義"
                            : "連携なし"}
                        </span>
                        <span className="ultimate-gauge" aria-label={`連携奥義ゲージ ${battle.ultimate} / ${getUltimateGaugeMax(battleSynergy)}`}>
                          <i><b style={{ width: `${Math.min(100, battle.ultimate)}%` }} /></i>
                          <i className={battleSynergy ? "" : "is-locked"}><b style={{ width: `${Math.max(0, Math.min(100, battle.ultimate - 100))}%` }} /></i>
                        </span>
                      </button>
                    </div>
                    <p className="battle-message" aria-live="polite">
                      {battle.message}
                    </p>
                    {heldSkill && (
                      <div className="hold-disclosure skill-disclosure" aria-live="polite">
                        <Flame size={20} />
                        <span><small>長押し中：スキル詳細</small><strong>{heldSkill.skill.name}</strong><b>{getSkillDescription(heldSkill.skill, profile.skillLevels[heldSkill.skill.id] ?? 1)}</b></span>
                      </div>
                    )}
                  </div>
                  {heldEnemyIndex !== null && battle.enemyHps[heldEnemyIndex] > 0 && (
                    <div className="hold-disclosure battle-enemy-disclosure" aria-live="polite">
                      <img src={heldEnemy.image} alt="" />
                      <span><small>長押し中：モンスター個別情報</small><strong>{heldEnemy.name}</strong>
                        {getEnemySpecialRules(stage, heldEnemy).map((rule) => <b key={rule}>{rule}</b>)}
                        <em>属性 {heldEnemy.element}　攻撃 {heldEnemy.atk}　防御 {heldEnemy.def}　速度 {heldEnemy.spd}</em>
                      </span>
                    </div>
                  )}
                </>
              )}

              {battle.phase === "blessing" && (
                <div className="overlay-screen blessing-screen">
                  <span className="result-kicker">敵を撃破</span>
                  <h2>力をひとつ奪える</h2>
                  <p>この挑戦中だけ有効な能力を選ぼう。</p>
                  <div className="blessing-list">
                    {[
                      {
                        name: "連撃の火花",
                        copy: "通常攻撃ダメージが上昇",
                        icon: <Flame />,
                      },
                      {
                        name: "守護の皮膜",
                        copy: "敵の大技ダメージを軽減",
                        icon: <Shield />,
                      },
                      {
                        name: "精霊の雫",
                        copy: "次の戦闘開始時にHP回復",
                        icon: <HeartPulse />,
                      },
                    ].map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => chooseBlessing(item.name)}
                      >
                        {item.icon}
                        <span>
                          <strong>{item.name}</strong>
                          <small>{item.copy}</small>
                        </span>
                        <ChevronRight />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(battle.phase === "victory" || battle.phase === "defeat") && (
                <div className={`overlay-screen ${battle.phase}-screen`}>
                  {battle.phase === "victory" ? (
                    <Trophy size={56} />
                  ) : (
                    <Shield size={56} />
                  )}
                  <span className="result-kicker">
                    {battle.phase === "victory"
                      ? `${"★".repeat(getStars(battle.totalTurns, stage.enemies.length))}${"☆".repeat(3 - getStars(battle.totalTurns, stage.enemies.length))} クエストクリア`
                      : "敗北"}
                  </span>
                  <h2>
                    {battle.phase === "victory"
                      ? `${stage.title} 制覇！`
                      : "パーティーが倒れた"}
                  </h2>
                  {battle.phase === "victory" ? (
                    <>
                      <p className="turn-record">
                        合計 {battle.totalTurns}ターン
                      </p>
                      <p className="player-level-result">
                        プレイヤーLv.{profile.playerLevel}　EXP {profile.playerXp} /{" "}
                        {getPlayerXpNeeded(profile.playerLevel)}
                      </p>
                      {stage.id === "A-100" && (
                        <p className="void-unlock">
                          EX 暗黒龍：ヴォイドが仲間になった！
                        </p>
                      )}
                      {lastDrop && (
                        <p className="drop-unlock">
                          {lastDropWasDuplicate
                            ? `${lastDrop.name}を再獲得。同じキャラ×1を獲得！`
                            : `${lastDrop.rarity} ${lastDrop.name}が仲間になった！`}
                        </p>
                      )}
                      {lastTokenDrop > 0 && stage.dropCharacterId && (
                        <p className="drop-unlock">
                          {ROSTER.find((character) => character.id === stage.dropCharacterId)?.name ?? "ボス"}の専用素材 ×{lastTokenDrop}
                          {lastTokenDrop === 2 ? "　追加獲得！" : ""}
                        </p>
                      )}
                      {lastEquipmentDrop && (
                        <p className="drop-unlock equipment-drop-unlock">
                          <EquipmentIcon item={lastEquipmentDrop} />
                          装備「{lastEquipmentDrop.name}」を獲得！
                        </p>
                      )}
                      <div className="reward-row">
                        <span>
                          <Gem size={18} />+{stage.gems}
                        </span>
                        <span>
                          <Coins size={18} />+{stage.gold}
                        </span>
                        {stage.dropPolicy !== "defeat-only" && (
                          <span>
                            <Sparkles size={18} />
                            進化石 +
                            {stage.evoStoneReward ??
                              (stage.number === 3 ? 2 : 1)}
                          </span>
                        )}
                        <span>プレイヤーEXP +{getStagePlayerXp(stage)}</span>
                        {stage.dropPolicy !== "defeat-only" &&
                          (stage.trainingCrystalReward ?? 0) > 0 && (
                          <span>
                            <Gem size={18} />
                            強化結晶 +{stage.trainingCrystalReward}
                          </span>
                        )}
                        {stage.dropPolicy === "defeat-only" &&
                          (Object.entries(battle.runLoot) as Array<
                            [DefeatDropKind, number]
                          >).map(([kind, amount]) =>
                            amount > 0 ? (
                              <span key={kind}>
                                <MaterialDropIcon kind={kind} />
                                {MATERIAL_DROP_LABELS[kind]} +{amount}
                              </span>
                            ) : null,
                          )}
                        {stage.dropPolicy === "defeat-only" &&
                          Object.values(battle.runLoot).every(
                            (amount) => amount === 0,
                          ) && <span>素材ドロップなし</span>}
                      </div>
                    </>
                  ) : (
                    <>
                      <p>撃破済みの敵から得た素材は持ち帰れる。編成を整えて再挑戦しよう。</p>
                      {stage.dropPolicy === "defeat-only" && (
                        <div className="reward-row">
                          {(Object.entries(battle.runLoot) as Array<
                            [DefeatDropKind, number]
                          >).map(([kind, amount]) =>
                            amount > 0 ? (
                              <span key={kind}>
                                <MaterialDropIcon kind={kind} />
                                {MATERIAL_DROP_LABELS[kind]} +{amount}
                              </span>
                            ) : null,
                          )}
                          {Object.values(battle.runLoot).every(
                            (amount) => amount === 0,
                          ) && <span>素材ドロップなし</span>}
                        </div>
                      )}
                    </>
                  )}
                  <button
                    className="primary-result"
                    type="button"
                    onClick={() =>
                      setView(battleOrigin)
                    }
                  >
                    {stage.kind === "abyss"
                      ? "深淵奈落へ"
                      : stage.kind === "event" ||
                          stage.kind === "strong" ||
                          stage.kind === "material"
                        ? "イベント・ダンジョンへ"
                        : "ステージ選択へ"}
                  </button>
                  <button
                    className="secondary-result"
                    type="button"
                    onClick={() => startBattle(battle.stageId)}
                  >
                    もう一度挑戦
                  </button>
                </div>
              )}
              {retreatConfirm && (
                <div
                  className="retreat-overlay"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="retreat-title"
                >
                  <div>
                    <LogOut size={34} />
                    <h2 id="retreat-title">冒険から撤退する？</h2>
                    <p>この冒険で獲得した一時強化は失われます。</p>
                    <button
                      className="retreat-accept"
                      type="button"
                      onClick={retreatBattle}
                    >
                      撤退してホームへ
                    </button>
                    <button
                      className="retreat-cancel"
                      type="button"
                      onClick={() => setRetreatConfirm(false)}
                    >
                      冒険を続ける
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {view === "party" && (
            <PartyView
              appearanceRunId={appearanceRunId}
              profile={profile}
              setTeamMember={setTeamMember}
              setActiveParty={setActiveParty}
              setView={navigateTo}
              returnToPreparation={
                preparedStageId ? () => setView(battleOrigin) : undefined
              }
            />
          )}
          {view === "growth" && (
            <GrowthView
              mode="growth"
              profile={profile}
              levelUp={levelUp}
              evolveCharacter={evolveCharacter}
              levelUpSkill={levelUpSkill}
              equipCharacterItem={equipCharacterItem}
              setView={navigateTo}
            />
          )}
          {view === "evolution" && (
            <GrowthView
              mode="evolution"
              profile={profile}
              levelUp={levelUp}
              evolveCharacter={evolveCharacter}
              levelUpSkill={levelUpSkill}
              equipCharacterItem={equipCharacterItem}
              setView={navigateTo}
            />
          )}
          {view === "shop" && (
            <ShopView
              profile={profile}
              exchangeBossCopy={exchangeBossCopy}
              exchangeStarterEx={exchangeStarterEx}
              exchangeShards={exchangeShards}
              buyDailyEquipment={buyDailyEquipment}
            />
          )}
          {view === "summon" && (
            <SummonView
              profile={profile}
              summoning={summoning}
              results={summonResults}
              summon={summon}
              banner={summonBanner}
              setBanner={(banner) => {
                setSummonBanner(banner);
                setSummonResults([]);
              }}
              series={summonSeries}
              setSeries={setSummonSeries}
              closeResults={() => setSummonResults([])}
            />
          )}
          {view === "codex" && <CodexView profile={profile} setView={navigateTo} appearanceRunId={appearanceRunId} />}
          {view === "equipment" && <EquipmentView profile={profile} setView={navigateTo} />}
          {view === "tags" && <TagCodexView profile={profile} setView={navigateTo} />}
          {view === "inbox" && (
            <InboxView
              profile={profile}
              claimStarterGift={claimStarterGift}
              claimRerollGift={claimRerollGift}
            />
          )}
          {view === "settings" && (
            <SettingsView
              profile={profile}
              changeVolume={changeVolume}
              redeemPromo={redeemPromo}
              promoMessage={promoMessage}
              cloudStatus={cloudStatus}
              updateIdentity={(username) =>
                setProfile((current) => ({
                  ...current,
                  username: username.trim().slice(0, 12) || "冒険者",
                }))
              }
              resetAccount={resetAccount}
              returnTitle={() => {
                navigateTo("home");
                setShowOpening(true);
              }}
            />
          )}
          {preparedStageId && view !== "battle" && view !== "party" && (
            <BattlePreparationView
              stage={getStage(preparedStageId)}
              profile={profile}
              setActiveParty={setActiveParty}
              editParty={() => setView("party")}
              close={() => setPreparedStageId(null)}
              start={() => startBattle(preparedStageId)}
            />
          )}
        </div>

        {view !== "battle" && (
          <nav className="game-nav" aria-label="メインメニュー">
            <button
              className={["home", "stages", "events", "abyss"].includes(view) ? "is-active" : ""}
              type="button"
              onClick={() => navigateTo("home")}
            >
              <Swords />
              <span>冒険</span>
            </button>
            <button
              className={["party", "growth", "evolution", "codex", "equipment", "tags"].includes(view) ? "is-active" : ""}
              type="button"
              onClick={() => navigateTo("party")}
            >
              <Users />
              <span>キャラ</span>
            </button>
            <button
              className={view === "shop" ? "is-active" : ""}
              type="button"
              onClick={() => navigateTo("shop")}
            >
              <ShoppingBag />
              <span>ショップ</span>
            </button>
            <button
              className={view === "summon" ? "is-active" : ""}
              type="button"
              onClick={() => navigateTo("summon")}
            >
              <Sparkles />
              <span>召喚</span>
            </button>
            <button
              className={view === "settings" ? "is-active" : ""}
              type="button"
              onClick={() => navigateTo("settings")}
            >
              <Settings />
              <span>設定</span>
            </button>
          </nav>
        )}
      </section>
    </main>
  );
}

function BattlePreparationView({
  stage,
  profile,
  setActiveParty,
  editParty,
  close,
  start,
}: {
  stage: ResolvedStage;
  profile: Profile;
  setActiveParty: (index: number) => void;
  editParty: () => void;
  close: () => void;
  start: () => void;
}) {
  const [showRules, setShowRules] = useState(false);
  const rules = getDungeonWideRules(stage);
  const team = profile.team.map((id) =>
    resolveProfileCharacterVisual(
      CHARACTER_BY_ID.get(id) ?? requireCharacter(INITIAL_TEAM_IDS[0]),
      profile,
    ),
  );
  return (
    <section className="battle-preparation" aria-label="出撃準備">
      <div
        className="preparation-hero"
        style={{ backgroundImage: `linear-gradient(180deg,#06111c55,#06111cf2),url('${stage.background}')` }}
      >
        <button type="button" onClick={close}><ArrowLeft size={17} /> 難易度選択へ</button>
        <span>{stage.area}・出撃待機</span>
        <h2>{stage.title}</h2>
        <small>推奨Lv.{stage.recommended}　全{stage.enemies.length}戦</small>
      </div>

      <button
        className="rule-marquee"
        type="button"
        onClick={() => setShowRules(true)}
        aria-label="特殊ルール一覧を開く"
      >
        <b>特殊ルール</b>
        <span><i>{rules.join("　◆　")}　　{rules.join("　◆　")}</i></span>
        <ChevronRight size={16} />
      </button>

      <div className="preparation-section-heading">
        <strong>パーティ編成</strong><button type="button" onClick={editParty}>メンバー変更</button>
      </div>
      <div className="preparation-party-tabs" aria-label="出撃パーティ選択">
        {profile.parties.map((_, index) => (
          <button
            type="button"
            key={index}
            className={profile.activePartyIndex === index ? "is-active" : ""}
            onClick={() => setActiveParty(index)}
          >P{index + 1}</button>
        ))}
      </div>
      <div className="preparation-party">
        {team.map((character) => (
          <article key={character.id} style={{ "--unit-color": character.color } as CSSProperties}>
            <img src={character.image} alt={character.name} />
            <strong>{character.name}</strong>
            <small>Lv.{profile.levels[character.id] ?? 1}</small>
          </article>
        ))}
      </div>
      <button className="preparation-start" type="button" onClick={start}>
        <Swords size={19} /> このパーティで出撃
      </button>

      {showRules && (
        <div className="preparation-dialog" role="dialog" aria-modal="true">
          <div><span>ダンジョン全体</span><h3>特殊ルール一覧</h3>
            <ul>{rules.map((rule) => <li key={rule}>{rule}</li>)}</ul>
            <p>モンスター固有の能力は、敵を長押しすると確認できます。</p>
            <button type="button" onClick={() => setShowRules(false)}>閉じる</button>
          </div>
        </div>
      )}
    </section>
  );
}

const OPENING_VIDEO = "/assets/opening/opening-anime-12s-v8-op-exclusive-48fps.mp4";
const OPENING_POSTER = "/assets/opening/opening-motion-first-v8-op-exclusive.webp";
const OPENING_TITLE_IMAGE = "/assets/opening/opening-motion-title-v8-op-exclusive.webp";
type OpeningPlaybackState = "loading" | "playing" | "tap" | "title";

function OpeningView({ closeOpening }: { closeOpening: () => void }) {
  const openingVideoRef = useRef<HTMLVideoElement>(null);
  const [openingState, setOpeningState] =
    useState<OpeningPlaybackState>("loading");
  const [hasOpeningStarted, setHasOpeningStarted] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] =
    useState<boolean | null>(null);

  useEffect(() => {
    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    setPrefersReducedMotion(motionPreference.matches);
    if (motionPreference.matches) setOpeningState("title");
  }, []);

  const startOpening = () => {
    const video = openingVideoRef.current;
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
    void video.play().catch(() => setOpeningState("tap"));
  };

  const titleVisible =
    prefersReducedMotion === true || openingState === "title";

  return (
    <section
      className={`opening opening-video-op phase-${openingState} ${hasOpeningStarted ? "has-started" : ""}`}
      aria-label="正式キャラクターを基準に新規制作したOP専用アクションによる全576フレーム・12秒・48fps・1080pの短編アニメーション"
    >
      <button className="opening-skip" type="button" onClick={closeOpening}>
        SKIP <ChevronRight size={14} />
      </button>
      <div className="opening-video-stage">
        <img
          className="opening-video-poster"
          src={OPENING_POSTER}
          alt=""
          aria-hidden="true"
        />
        {prefersReducedMotion === false && (
          <video
            ref={openingVideoRef}
            className="opening-video-media"
            autoPlay
            muted
            playsInline
            preload="auto"
            poster={OPENING_POSTER}
            disablePictureInPicture
            controlsList="nodownload noplaybackrate nofullscreen"
            aria-hidden="true"
            onCanPlay={startOpening}
            onPlaying={() => {
              setHasOpeningStarted(true);
              setOpeningState("playing");
            }}
            onWaiting={(event) => {
              if (!event.currentTarget.ended) setOpeningState("loading");
            }}
            onPause={(event) => {
              if (!event.currentTarget.ended) setOpeningState("tap");
            }}
            onEnded={() => setOpeningState("title")}
            onError={() => setOpeningState("title")}
          >
            <source src={OPENING_VIDEO} type="video/mp4" />
          </video>
        )}
        <div className="opening-video-grade" aria-hidden="true" />
      </div>

      {!titleVisible && openingState !== "playing" && (
        <div className="opening-video-loader" role="status" aria-live="polite">
          <span>FULL HD // PIXEL ANIMATION // 48 FPS</span>
          <strong>
            {openingState === "tap" ? "タップして再生" : "OPENINGを読み込み中"}
          </strong>
          {openingState === "tap" ? (
            <button type="button" onClick={startOpening}>
              <Play size={15} fill="currentColor" /> 再生する
            </button>
          ) : (
            <i aria-hidden="true" />
          )}
        </div>
      )}

      <div className={`opening-video-title ${titleVisible ? "is-visible" : ""}`}>
        <img src={OPENING_TITLE_IMAGE} alt="" aria-hidden="true" />
        <div className="opening-video-title-shade" aria-hidden="true" />
        <div className="opening-logo-lockup">
          <span>TAKE THE RELIC. CHANGE THE END.</span>
          <h1>
            RELIC
            <br />
            <b>RUSH</b>
          </h1>
          <strong>レリック・ラッシュ</strong>
          <small>奪うか、託すか。運命は、その手で決めろ。</small>
          <button type="button" onClick={closeOpening}>
            <Play size={16} fill="currentColor" />
            物語を始める
          </button>
        </div>
      </div>
    </section>
  );
}

function StageView({
  profile,
  startBattle,
}: {
  profile: Profile;
  startBattle: (stageId: string) => void;
}) {
  const [archive, setArchive] = useSessionState("relic-rush-stage-archive", false);
  const shownStages = archive ? LEGACY_NORMAL_STAGES : STAGES;
  const areas = archive ? LEGACY_NORMAL_AREAS : NORMAL_AREAS;
  const totalStars = shownStages.reduce(
    (sum, stage) => sum + (profile.stageStars[stage.id] ?? 0),
    0,
  );
  const firstUncleared = Math.max(
    0,
    shownStages.findIndex((stage) => !profile.stageStars[stage.id]),
  );
  const [storedPhaseIndex, setPhaseIndex] = useSessionState("relic-rush-stage-phase", Math.floor(firstUncleared / 3));
  const phaseIndex = Math.max(0, Math.min(areas.length - 1, storedPhaseIndex));
  const area = areas[phaseIndex];
  const phaseStages = shownStages.filter((stage) => stage.chapter === area.chapter);
  return (
    <section className="menu-view stage-view">
      <div className="menu-heading">
        <span>冒険</span>
        <h2>冒険マップ</h2>
        <p>{archive ? "以前の第51〜64章。進行記録と報酬をそのまま引き継いでいます。" : "本編50章・各3ステージ。全ステージ★3で白龍の聖女が加入。"}</p>
        <div className="map-mode-tabs" role="group" aria-label="冒険の種類">
          <button type="button" aria-pressed={!archive} onClick={() => { setArchive(false); setPhaseIndex(0); }}>本編 50章</button>
          <button type="button" aria-pressed={archive} onClick={() => { setArchive(true); setPhaseIndex(0); }}>外伝 14章</button>
        </div>
      </div>
      <div className="map-progress">
        <span>
          <Trophy size={16} />
          獲得スター
        </span>
        <strong>
          {totalStars} / {shownStages.length * 3} ★
        </strong>
      </div>
      <div className="phase-picker">
        <button
          type="button"
          onClick={() => setPhaseIndex(Math.max(0, phaseIndex - 1))}
          disabled={phaseIndex === 0}
        >
          前へ
        </button>
        <select
          aria-label="章を選択"
          value={phaseIndex}
          onChange={(event) => setPhaseIndex(Number(event.target.value))}
        >
          {areas.map((item, index) => (
            <option value={index} key={item.chapter}>
              {archive ? "外伝" : "第"}{index + 1}章　{item.area}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setPhaseIndex(Math.min(areas.length - 1, phaseIndex + 1))}
          disabled={phaseIndex === areas.length - 1}
        >
          次へ
        </button>
      </div>
      <section className="area-section" key={area.chapter}>
        <div className="area-heading">
          <div>
            <small>{archive ? "外伝" : "第"}{phaseIndex + 1}章</small>
            <strong>{area.area}</strong>
          </div>
          <span>
            {
              shownStages.filter(
                (stage) =>
                  stage.chapter === area.chapter &&
                  profile.stageStars[stage.id],
              ).length
            }{" "}
            / 3
          </span>
        </div>
        <div className="stage-list">
          {phaseStages.map((stage) => {
            const stageIndex = shownStages.findIndex((item) => item.id === stage.id);
            const unlocked =
              stageIndex === 0 ||
              Boolean(profile.stageStars[shownStages[stageIndex - 1].id]) || Boolean(profile.stageStars[stage.id]);
            const stars = profile.stageStars[stage.id] ?? 0;
            const best = profile.bestTurns[stage.id];
            return (
              <button
                className={`${unlocked ? "is-unlocked" : "is-locked"} ${stage.number === 3 ? "is-boss" : ""}`}
                type="button"
                key={stage.id}
                onClick={() => startBattle(stage.id)}
                disabled={!unlocked}
                style={
                  {
                    "--stage-bg": `url('${stage.background}')`,
                  } as React.CSSProperties
                }
              >
                <div className="stage-art">
                  <img
                    loading="lazy"
                    decoding="async"
                    src={stage.enemies[2].image}
                    alt=""
                    style={{
                      filter: `hue-rotate(${stage.enemies[2].hue ?? 0}deg)`,
                    }}
                  />
                  {!unlocked && <LockKeyhole size={22} />}
                </div>
                <div className="stage-copy">
                  <span>
                    {archive ? "外伝" : "第"}{phaseIndex + 1}章-{stage.number} {stage.number === 3 ? "ボス" : "クエスト"}
                  </span>
                  <strong>{stage.title}</strong>
                  <small>
                    推奨Lv.{stage.recommended}　{stage.rule}
                    {stage.dropCharacterId && `　${requireCharacter(stage.dropCharacterId).name} ${formatDropRate(getStageCharacterDropRate(stage))}` }
                  </small>
                  <i>
                    {stars
                      ? `${"★".repeat(stars)}${"☆".repeat(3 - stars)}`
                      : "未クリア"}
                    {best ? `　最短${best}ターン` : ""}
                    {`　EXP +${getStagePlayerXp(stage)}　装備 ${formatDropRate(getEquipmentDropChance(stage.kind, stage.recommended))}`}
                  </i>
                </div>
                <ChevronRight size={18} />
              </button>
            );
          })}
        </div>
      </section>
    </section>
  );
}

function ModeLockedView({
  title,
  currentLevel,
  requiredLevel,
  setView,
}: {
  title: string;
  currentLevel: number;
  requiredLevel: number;
  setView: (view: View) => void;
}) {
  return (
    <section className="menu-view mode-locked-view">
      <LockKeyhole size={48} />
      <span>未解放</span>
      <h2>{title}</h2>
      <p>
        プレイヤーLv.{requiredLevel}で解放。現在はLv.{currentLevel}です。
      </p>
      <button type="button" onClick={() => setView("stages")}>
        冒険マップで経験値を集める
        <ChevronRight size={17} />
      </button>
    </section>
  );
}

function EventView({
  profile,
  startBattle,
}: {
  profile: Profile;
  startBattle: (stageId: string) => void;
}) {
  const [rotationNow] = useState(Date.now);
  const rotation = getEventRotation(rotationNow);
  const endLabel = rotation.endsAt.toLocaleDateString("ja-JP", {
    month: "numeric",
    day: "numeric",
  });
  const [selected, setSelected] = useSessionState<{
    kind: "event" | "strong" | "material" | "featured";
    index: number;
  } | null>("relic-rush-event-selection", null);
  const [genre, setGenre] = useSessionState<"event" | "strong" | "material" | "featured" | null>(
    "relic-rush-event-genre", null,
  );
  const genreNames = {
    material: "育成ダンジョン",
    event: "期間限定イベント",
    featured: "特別ダンジョン",
    strong: "強敵ダンジョン",
  };
  const phase4EventIndex =
    rotation.rotationIndex % PHASE4_EVENT_DUNGEONS.length;
  const phase4Event = PHASE4_EVENT_DUNGEONS[phase4EventIndex];
  const themes = [
    ...MATERIAL_FAMILIES.map((family, index) => {
      const stages = MATERIAL_STAGES.filter(
        (stage) => stage.chapter === index + 1,
      );
      const featuredStage = stages[stages.length - 1];
      return {
        kind: "material" as const,
        index,
        name: family.name,
        stages,
        image:
          getMaterialCharacterForDrop(family.dropKind)?.image ??
          featuredStage.enemies[featuredStage.enemies.length - 1].image,
        background: featuredStage.background,
      };
    }),
    ...rotation.activeEvents.map((index) => ({
      kind: "event" as const,
      index,
      name: EVENT_NAMES[index],
      stages: EVENT_STAGES.filter((stage) => stage.chapter === index + 1),
      image: EVENT_STAGES[index * 3].enemies[2].image,
      background: EVENT_STAGES[index * 3].background,
    })),
    ...rotation.activeExpeditions.map((index) => {
      const stage = EXPEDITION_STAGES[index];
      return {
      kind: "event" as const,
      index: 1000 + index,
      name: stage.title,
      stages: [stage],
      image: stage.enemies[stage.enemies.length - 1].image,
      background: stage.background,
      };
    }),
    {
      kind: "event" as const,
      index: 2000 + phase4EventIndex,
      name: phase4Event.area,
      stages: [phase4Event],
      image: phase4Event.enemies[phase4Event.enemies.length - 1].image,
      background: phase4Event.background,
    },
    {
      kind: "featured" as const,
      index: 0,
      name: "深海戦機開発区",
      stages: FEATURED_DUNGEON_STAGES.filter((stage) => stage.area === "深海戦機開発区"),
      image: FEATURED_NEW_CHARACTERS.find((unit) => unit.id === "mech-orca")!.image,
      background: DUNGEON_BACKGROUNDS.underseaCity,
    },
    {
      kind: "featured" as const,
      index: 1,
      name: "魔界火口域",
      stages: FEATURED_DUNGEON_STAGES.filter((stage) => stage.area === "魔界火口域"),
      image: FEATURED_NEW_CHARACTERS.find((unit) => unit.id === "cracker")!.image,
      background: DUNGEON_BACKGROUNDS.innerEarth,
    },
    {
      kind: "featured" as const,
      index: 2,
      name: "無界・終焉回廊",
      stages: VOID_GAUNTLET_STAGES,
      image: requireCharacter("void").image,
      background: DUNGEON_BACKGROUNDS.dragonTemple,
    },
    ...PHASE4_VOID_DUNGEONS.map((stage, index) => ({
      kind: "featured" as const,
      index: 3 + index,
      name: stage.area,
      stages: [stage],
      image: stage.enemies[stage.enemies.length - 1].image,
      background: stage.background,
    })),
    {
      kind: "strong" as const,
      index: rotation.activeStrong,
      name: STRONG_NAMES[rotation.activeStrong],
      stages: STRONG_STAGES.filter(
        (stage) => stage.chapter === rotation.activeStrong + 1,
      ),
      image: STRONG_STAGES[rotation.activeStrong * 2].enemies[2].image,
      background: STRONG_STAGES[rotation.activeStrong * 2].background,
    },
  ];
  const activeTheme = selected
    ? themes.find(
        (theme) =>
          theme.kind === selected.kind && theme.index === selected.index,
      )
    : null;
  const isRotatingExpedition = Boolean(
    activeTheme?.stages.some((stage) => stage.id.startsWith("L-")),
  );
  const isVoidTheme = Boolean(
    activeTheme?.stages.length &&
      activeTheme.stages.every((stage) => stage.difficultyLabel === "無級"),
  );
  const renderStage = (stage: Stage) => {
    const firstClearRewardId = getStageFirstClearCharacterId(stage);
    const firstClearClaimed = Boolean(
      firstClearRewardId &&
      hasStageCharacterClaim(
        profile.stageCharacterClaims,
        stage.id,
        firstClearRewardId,
      ),
    );
    const rewardIds = [...new Set([
      ...(firstClearRewardId
        ? [firstClearRewardId]
        : []),
      ...(stage.dropCharacterPoolIds ?? []),
      ...(stage.dropCharacterId ? [stage.dropCharacterId] : []),
    ])];
    const dropCandidates = rewardIds
      .map((characterId) => ROSTER.find((character) => character.id === characterId))
      .filter((character): character is Character => Boolean(character));
    const drop = dropCandidates[0];
    const materialCharacter =
      stage.kind === "material" && stage.normalDefeatDrops?.[0]
        ? getMaterialCharacterForDrop(stage.normalDefeatDrops[0].kind)
        : undefined;
    const owned = drop ? profile.owned.includes(drop.id) : false;
    const unlocked = profile.playerLevel >= (stage.unlockLevel ?? 1);
    return (
      <button
        className={`event-stage-card ${stage.kind === "strong" ? "is-strong" : ""} ${!unlocked ? "is-locked" : ""}`}
        key={stage.id}
        type="button"
        disabled={!unlocked}
        onClick={() => startBattle(stage.id)}
      >
        <div className="stage-art">
          <img loading="lazy" decoding="async" src={stage.enemies[stage.enemies.length - 1].image} alt="" />
        </div>
        <div className="stage-copy">
          <span>
            {stage.difficultyLabel ?? (stage.id.startsWith("L-")
              ? `${stage.enemies.length}F・${stage.number === 1 ? "低" : stage.number === 2 ? "中" : "高"}`
              : stage.kind === "strong"
              ? stage.title.startsWith("白")
                ? "白級"
                : "黒級"
              : stage.number === 1
                ? "初級"
                : stage.number === 2
                  ? "中級"
                  : "上級")}
          </span>
          <strong>{stage.title}</strong>
          <small>
            推奨Lv.{stage.recommended}　{stage.rule}
          </small>
          <i>
            {!unlocked
              ? `プレイヤーLv.${stage.unlockLevel}で解放`
              : stage.kind === "material"
                ? `${getMaterialDropSummary(stage)}・装備 ${formatDropRate(getEquipmentDropChance(stage.kind, stage.recommended))}`
                : stage.dropCharacterPoolIds?.length
                    ? `仲間候補${stage.dropCharacterPoolIds.length}体 ${formatDropRate(getStageCharacterDropRate(stage))}・装備 ${formatDropRate(getEquipmentDropChance(stage.kind, stage.recommended))}`
                    : !stage.dropCharacterId
                      ? `キャラドロップなし・EXP +${stage.playerXpReward?.toLocaleString()}・装備 ${formatDropRate(getEquipmentDropChance(stage.kind, stage.recommended))}`
                      : `${firstClearRewardId && !firstClearClaimed ? "初回クリアで仲間確定" : profile.stageStars[stage.id] ? "クリア済み" : "未クリア"}　通常獲得 ${formatDropRate(getStageCharacterDropRate(stage))}・装備 ${formatDropRate(getEquipmentDropChance(stage.kind, stage.recommended))}`}
          </i>
        </div>
        {(drop || materialCharacter) && (
          <div className={`drop-preview ${materialCharacter || owned ? "is-owned" : "is-unknown"}`}>
            <img
              loading="lazy"
              decoding="async"
              src={drop?.image ?? materialCharacter!.image}
              alt={materialCharacter?.name ?? (owned ? drop!.name : "未入手キャラクター")}
            />
            <small>
              {materialCharacter
                ? `${materialCharacter.name}を獲得`
                : stage.dropCharacterPoolIds?.length
                ? `候補 ${stage.dropCharacterPoolIds.length}体`
                : owned
                  ? drop!.name
                  : "未入手"}
            </small>
          </div>
        )}
      </button>
    );
  };
  return (
    <section className="menu-view event-view">
      <div className="menu-heading">
        <span>イベント・ダンジョン</span>
        <h2>{activeTheme ? activeTheme.name : genre ? genreNames[genre] : "ダンジョンジャンル"}</h2>
        <p>
          {activeTheme
            ? activeTheme.kind === "material"
              ? "倒した魔物ごとに素材獲得を判定。高い難易度ほど獲得率と個数が上がります。"
              : isRotatingExpedition || activeTheme.kind === "featured"
                ? isVoidTheme
                  ? "速度と固有ギミックを越える最高難易度。クリア時に80%の確率でボスが仲間になります。"
                  : "階層と報酬が異なる期間限定ダンジョン。難易度ごとの確率でボスが仲間になります。"
                : "挑戦する難易度を選択。ボスの獲得率は難易度ごとに設定されています。"
            : genre ? "ダンジョンを選んで、挑戦する難易度を確認しよう。" : "遊びたいジャンルを選ぼう。"}
        </p>
      </div>
      <div className="event-timer">
        <RotateCcw size={16} />
        <span>{activeTheme?.kind === "material" || activeTheme?.kind === "featured" ? "開催期間" : "次回更新"}</span>
        <strong>
          {activeTheme?.kind === "material" || activeTheme?.kind === "featured" ? "常時開催" : endLabel}
        </strong>
      </div>
      {activeTheme ? (
        <>
          <button
            className="event-back"
            type="button"
            onClick={() => {
              setGenre(activeTheme.kind);
              setSelected(null);
            }}
          >
            ← {genreNames[activeTheme.kind]}一覧へ
          </button>
          <div
            className="event-difficulty-hero"
            style={{
              backgroundImage: `linear-gradient(90deg,#071521e8,#07152155),url('${activeTheme.background}')`,
            }}
          >
            <img loading="lazy" decoding="async" src={activeTheme.image} alt="" />
            <strong>
              {activeTheme.kind === "material"
                ? "初級・中級・上級・実りの大地"
                : isRotatingExpedition || activeTheme.kind === "featured"
                ? isVoidTheme
                  ? `全${activeTheme.stages[0].enemies.length}階・最高難易度「無」`
                  : "階数・難易度を選んで挑戦"
                : activeTheme.kind === "strong"
                ? "白級・黒級"
                : "初級・中級・上級"}
            </strong>
          </div>
          <div className="event-list difficulty-list">
            {activeTheme.stages.map(renderStage)}
          </div>
        </>
      ) : !genre ? (
        <div className="dungeon-genre-grid">
          {(["material", "event", "featured", "strong"] as const).map((kind) => {
            const group = themes.filter((theme) => theme.kind === kind);
            return (
              <button key={kind} type="button" onClick={() => setGenre(kind)}>
                <img src={group[0].background} alt="" />
                <span><strong>{genreNames[kind]}</strong><small>{group.length}つのダンジョン</small></span>
                <ChevronRight size={22} />
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <button className="event-back" type="button" onClick={() => setGenre(null)}>← ジャンル選択へ</button>
          {genre === "material" && <h3>常設・育成</h3>}
          {themes
            .filter((theme) => theme.kind === "material" && genre === "material")
            .map((theme) => (
              <button
                className="strong-theme-card material-theme-card"
                key={`${theme.kind}-${theme.index}`}
                type="button"
                onClick={() =>
                  setSelected({ kind: theme.kind, index: theme.index })
                }
                style={{
                  backgroundImage: `linear-gradient(90deg,#063348e6,#15183aaa),url('${theme.background}')`,
                }}
              >
                <img
                  loading="lazy"
                  decoding="async"
                  src={theme.image}
                  alt=""
                />
                <span>
                  <small>育成素材・常時開催</small>
                  <strong>{theme.name}</strong>
                </span>
                <ChevronRight />
              </button>
            ))}
          {genre === "event" && <h3>開催中イベント</h3>}
          <div className="event-theme-grid">
            {themes
              .filter((theme) => theme.kind === "event" && genre === "event")
              .map((theme) => (
                <button
                  key={`${theme.kind}-${theme.index}`}
                  type="button"
                  onClick={() =>
                    setSelected({ kind: theme.kind, index: theme.index })
                  }
                  style={{
                    backgroundImage: `linear-gradient(180deg,transparent,#071521ee),url('${theme.background}')`,
                  }}
                >
                  <img loading="lazy" decoding="async" src={theme.image} alt="" />
                  <span>
                    <small>
                      {theme.stages.length === 1
                        ? `${theme.stages[0].enemies.length}階・期間限定`
                        : `${theme.stages.length}つの難易度`}
                    </small>
                    <strong>{theme.name}</strong>
                  </span>
                  <ChevronRight />
                </button>
              ))}
          </div>
          {genre === "featured" && <h3>特別ダンジョン</h3>}
          <div className="event-theme-grid">
            {themes
              .filter((theme) => theme.kind === "featured" && genre === "featured")
              .map((theme) => (
                <button
                  key={`${theme.kind}-${theme.index}`}
                  type="button"
                  onClick={() => setSelected({ kind: theme.kind, index: theme.index })}
                  style={{
                    backgroundImage: `linear-gradient(180deg,transparent,#071521ee),url('${theme.background}')`,
                  }}
                >
                  <img loading="lazy" decoding="async" src={theme.image} alt="" />
                  <span>
                    <small>
                      {theme.stages.every((stage) => stage.difficultyLabel === "無級")
                        ? `最高難易度・全${theme.stages[0].enemies.length}階`
                        : `${theme.stages.length}つのダンジョン`}
                    </small>
                    <strong>{theme.name}</strong>
                  </span>
                  <ChevronRight />
                </button>
              ))}
          </div>
          {genre === "strong" && <h3>開催中の強敵</h3>}
          {themes
            .filter((theme) => theme.kind === "strong" && genre === "strong")
            .map((theme) => (
              <button
                className="strong-theme-card"
                key={`${theme.kind}-${theme.index}`}
                type="button"
                onClick={() =>
                  setSelected({ kind: theme.kind, index: theme.index })
                }
                style={{
                  backgroundImage: `linear-gradient(90deg,#23080ee6,#100b17aa),url('${theme.background}')`,
                }}
              >
                <img loading="lazy" decoding="async" src={theme.image} alt="" />
                <span>
                  <small>強敵・白級 / 黒級</small>
                  <strong>{theme.name}</strong>
                </span>
                <ChevronRight />
              </button>
            ))}
        </>
      )}
    </section>
  );
}

function EquipmentIcon({
  item,
  label = false,
}: {
  item: EquipmentItem;
  label?: boolean;
}) {
  const column = item.spriteIndex % 4;
  const row = Math.floor(item.spriteIndex / 4);
  return (
    <span
      className="equipment-icon"
      role={label ? "img" : undefined}
      aria-label={label ? item.name : undefined}
      aria-hidden={label ? undefined : true}
      style={
        {
          "--equipment-x": `${(column / 3) * 100}%`,
          "--equipment-y": `${(row / 2) * 100}%`,
        } as CSSProperties
      }
    />
  );
}

function MaterialCharacterCard({
  character,
  count,
  compact = false,
}: {
  character: MaterialCharacter;
  count: number;
  compact?: boolean;
}) {
  return (
    <article
      className={`material-character-card ${compact ? "is-compact" : ""}`}
      style={{ "--material-color": character.color } as CSSProperties}
    >
      <div className="material-character-art">
        <img
          loading="lazy"
          decoding="async"
          src={character.image}
          alt={character.name}
        />
      </div>
      <div className="material-character-copy">
        <small>{character.title}</small>
        <strong>{character.name}</strong>
        {!compact && <p>{character.description}</p>}
        <em>{character.acquisition}</em>
      </div>
      <div className="material-character-count">
        <b>所持 ×{count}体</b>
        <small>{character.usage}</small>
      </div>
    </article>
  );
}

function MaterialCharacterCatalog({
  profile,
  compact = false,
}: {
  profile: Profile;
  compact?: boolean;
}) {
  return (
    <section className={`material-character-catalog ${compact ? "is-compact" : ""}`}>
      <div className="material-character-heading">
        <span>育成素材キャラ</span>
        <small>育成ダンジョンで出会える2体</small>
      </div>
      <div className="material-character-grid">
        {MATERIAL_CHARACTERS.map((character) => (
          <MaterialCharacterCard
            key={character.id}
            character={character}
            count={profile[character.profileKey]}
            compact={compact}
          />
        ))}
      </div>
    </section>
  );
}

function MaterialDropIcon({ kind }: { kind: DefeatDropKind }) {
  const character = getMaterialCharacterForDrop(kind);
  return character ? (
    <img
      className="material-character-inline"
      src={character.image}
      alt=""
      aria-hidden="true"
    />
  ) : (
    <Sparkles size={18} />
  );
}

function getEquippedItemCount(
  profile: Profile,
  equipmentId: string,
  excludedCharacterId?: string,
) {
  return Object.entries(profile.equippedItems).filter(
    ([characterId, equippedId]) =>
      characterId !== excludedCharacterId && equippedId === equipmentId,
  ).length;
}

function EquipmentView({
  profile,
  setView,
}: {
  profile: Profile;
  setView: (view: View) => void;
}) {
  const [filter, setFilter] = useSessionState<"all" | "owned">(
    "relic-rush-equipment-filter",
    "owned",
  );
  const visibleItems = EQUIPMENT_ITEMS.filter(
    (item) => filter === "all" || (profile.equipmentInventory[item.id] ?? 0) > 0,
  );
  const ownedKinds = EQUIPMENT_ITEMS.filter(
    (item) => (profile.equipmentInventory[item.id] ?? 0) > 0,
  ).length;
  return (
    <section className="menu-view equipment-view">
      <div className="menu-heading">
        <span>EQUIPMENT ARCHIVE</span>
        <h2>装備図鑑</h2>
        <p>装備の効果と対応タイプを確認できます。装備変更はキャラ強化から行えます。</p>
      </div>
      <CharacterSectionNav active="equipment" setView={setView} />
      <div className="equipment-progress">
        <Package size={18} />
        <span>発見した装備</span>
        <strong>{ownedKinds} / {EQUIPMENT_ITEMS.length}</strong>
      </div>
      <div className="codex-filters">
        <button className={filter === "owned" ? "is-active" : ""} type="button" onClick={() => setFilter("owned")}>所持品</button>
        <button className={filter === "all" ? "is-active" : ""} type="button" onClick={() => setFilter("all")}>全装備</button>
      </div>
      {visibleItems.length ? (
        <div className="equipment-codex-grid">
          {visibleItems.map((item) => {
            const count = profile.equipmentInventory[item.id] ?? 0;
            const equippedCount = getEquippedItemCount(profile, item.id);
            return (
              <article className={`equipment-card rarity-${item.rarity.toLowerCase()} ${count > 0 ? "is-owned" : "is-unknown"}`} key={item.id}>
                <EquipmentIcon item={item} label />
                <div>
                  <small>{item.rarity}・{item.type}タイプ専用</small>
                  <strong>{count > 0 ? item.name : "未発見の装備"}</strong>
                  {count > 0 ? (
                    <>
                      <b>{item.effectLabel}</b>
                      <p>{item.description}</p>
                      <em>所持 {count}　装備中 {equippedCount}</em>
                    </>
                  ) : (
                    <p>ダンジョンまたは日替わりショップで発見できます。</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="equipment-empty">
          <Package size={32} />
          <strong>装備はまだありません</strong>
          <p>ダンジョンをクリアするか、日替わりショップを確認しよう。</p>
          <button type="button" onClick={() => setView("shop")}>ショップへ</button>
        </div>
      )}
    </section>
  );
}

function TagCodexView({
  profile,
  setView,
}: {
  profile: Profile;
  setView: (view: View) => void;
}) {
  const discovered = new Set(profile.discoveredSynergyIds);
  return (
    <section className="menu-view tag-codex-view">
      <div className="menu-heading">
        <span>LINK AWAKENING</span>
        <h2>タグ図鑑</h2>
        <p>関係を持つ3体で出撃すると、新たな連携覚醒が記録されます。</p>
      </div>
      <CharacterSectionNav active="tags" setView={setView} />
      <div className="tag-progress">
        <Link2 size={18} />
        <span>発見したタグ</span>
        <strong>{profile.discoveredSynergyIds.length} / {PARTY_SYNERGIES.length}</strong>
      </div>
      <div className="tag-codex-list">
        {PARTY_SYNERGIES.map((synergy, index) => {
          if (!discovered.has(synergy.id))
            return (
              <article className="tag-card is-locked" key={synergy.id}>
                <LockKeyhole size={28} />
                <span><small>TAG {String(index + 1).padStart(2, "0")}</small><strong>未発見タグ</strong><p>対象となる3体でダンジョンへ出撃すると判明します。</p></span>
              </article>
            );
          const members = synergy.memberIds.map((id) =>
            resolveProfileCharacterVisual(requireCharacter(id), profile),
          );
          return (
            <article
              className="tag-card is-discovered"
              key={synergy.id}
              style={{ "--synergy-color": synergy.color } as CSSProperties}
            >
              <header><Link2 size={20} /><span><small>発見済み</small><strong>{synergy.name}</strong></span></header>
              <div className="tag-members">
                {members.map((member) => (
                  <span key={member.id}><img src={member.image} alt={member.name} /><b>{member.name}</b></span>
                ))}
              </div>
              <div className="tag-effects">
                <span><small>連携覚醒</small><strong>{synergy.awakeningName}</strong><p>{synergy.awakeningDescription}</p></span>
                <span><small>連携奥義</small><strong>{synergy.ultimateName}</strong><p>ゲージ1段階で発動</p></span>
                <span><small>連携奥義・極</small><strong>{synergy.ultimateName}・極</strong><p>{synergy.extremeDescription}</p></span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ShopView({
  profile,
  exchangeBossCopy,
  exchangeStarterEx,
  exchangeShards,
  buyDailyEquipment,
}: {
  profile: Profile;
  exchangeBossCopy: (characterId: string) => void;
  exchangeStarterEx: (characterId: string) => void;
  exchangeShards: (
    reward:
      | "gold"
      | "crystals"
      | "stones"
      | "dragonHeadStones"
      | "crownStones"
      | "liberationBooksByShards"
    | "liberationBooksByCrowns",
  ) => void;
  buyDailyEquipment: (offerId: string, purchaseTime: number) => void;
}) {
  const [shopNow, setShopNow] = useState(() => Date.now());
  const dayKey = getDailyShopKey(shopNow);
  useEffect(() => {
    const remaining = Math.max(500, getNextDailyShopRefresh(shopNow) - Date.now() + 100);
    const timer = window.setTimeout(() => setShopNow(Date.now()), remaining);
    return () => window.clearTimeout(timer);
  }, [dayKey, shopNow]);
  const dailyOffers = getDailyEquipmentOffers(shopNow);
  const exchangeCharacters = ROSTER.filter((character) =>
    EXCHANGEABLE_BOSS_IDS.has(character.id),
  );
  return (
    <section className="menu-view shop-view">
      <div className="menu-heading">
        <span>交換所</span>
        <h2>ショップ</h2>
        <p>召喚で集めた魂片や、ダンジョンの専用素材を報酬と交換できます。</p>
      </div>

      <div className="shop-wallet" aria-label="交換素材の所持数">
        <span><Sparkles size={15} /><small>魂片</small><strong>{profile.shards.toLocaleString()}</strong></span>
        <span><Coins size={15} /><small>ゴールド</small><strong>{profile.gold.toLocaleString()}</strong></span>
        <span><Gem size={15} /><small>強化結晶</small><strong>{profile.trainingCrystals.toLocaleString()}</strong></span>
        <span><Shield size={15} /><small>進化石</small><strong>{profile.evoStones.toLocaleString()}</strong></span>
        <span><Flame size={15} /><small>龍頭石</small><strong>{profile.dragonHeadStones.toLocaleString()}</strong></span>
        <span><Crown size={15} /><small>王冠石</small><strong>{profile.crownStones.toLocaleString()}</strong></span>
        <span><BookOpen size={15} /><small>解放の書</small><strong>{profile.liberationBooks.toLocaleString()}</strong></span>
      </div>

      <div className="shop-section-heading daily-shop-heading">
        <span>DAILY EQUIPMENT</span>
        <h3>本日の日替わり装備</h3>
        <p><RefreshCw size={14} /> 日本時間0:00に品ぞろえ更新・各1点まで</p>
      </div>
      <div className="daily-equipment-grid">
        {dailyOffers.map((offer) => {
          const purchased = profile.dailyShopPurchases.includes(offer.id);
          const capped =
            (profile.equipmentInventory[offer.item.id] ?? 0) >=
            MAX_EQUIPMENT_COUNT;
          return (
            <article className={`daily-equipment-card rarity-${offer.item.rarity.toLowerCase()}`} key={offer.id}>
              <EquipmentIcon item={offer.item} label />
              <span>
                <small>{offer.item.rarity}・{offer.item.type}専用</small>
                <strong>{offer.item.name}</strong>
                <b>{offer.item.effectLabel}</b>
                <em>所持 {profile.equipmentInventory[offer.item.id] ?? 0}</em>
              </span>
              <button
                type="button"
                disabled={purchased || capped || profile.gold < offer.item.price}
                onClick={() => buyDailyEquipment(offer.id, Date.now())}
              >
                {purchased ? "購入済み" : capped ? "所持上限" : `${offer.item.price.toLocaleString()} G`}
              </button>
            </article>
          );
        })}
      </div>

      <div className="shop-section-heading starter-exchange-heading">
        <span>ORIGIN CONTRACT</span>
        <h3>始原EX契約</h3>
        <p>最初に選ばなかった始原の仲間を、魂片1,500個で迎えられます。</p>
      </div>
      <div className="starter-exchange-grid">
        {STARTER_EX_IDS.map((characterId) => {
          const character = requireCharacter(characterId);
          const owned = profile.owned.includes(characterId);
          return (
            <article key={`starter-contract-${characterId}`}>
              <img src={character.image} alt={character.name} />
              <span><small>EX</small><strong>{character.name}</strong><b>{character.role}</b></span>
              <button type="button" disabled={owned || profile.shards < 1_500} onClick={() => exchangeStarterEx(characterId)}>{owned ? "契約済み" : "魂片 1,500"}</button>
            </article>
          );
        })}
      </div>

      <div className="shop-section-heading evolution-exchange-heading">
        <span>EVOLUTION MATERIAL</span>
        <h3>上位進化素材</h3>
        <p>龍頭・王冠・BEYOND進化に必要な素材。入手はショップ交換のみです。</p>
      </div>
      <div className="evolution-material-list">
        <article>
          <Flame size={24} />
          <span><strong>龍頭石 10個</strong><small>龍頭進化に必要なアイテム</small><i>魂片 100個</i></span>
          <button type="button" disabled={profile.shards < 100} onClick={() => exchangeShards("dragonHeadStones")}>交換</button>
        </article>
        <article>
          <Crown size={24} />
          <span><strong>王冠石 5個</strong><small>王冠進化に必要なアイテム</small><i>魂片 200個</i></span>
          <button type="button" disabled={profile.shards < 200} onClick={() => exchangeShards("crownStones")}>交換</button>
        </article>
        <article className="liberation-material-card">
          <BookOpen size={24} />
          <span><strong>解放の書 5個</strong><small>BEYOND進化に必要なアイテム</small><i>魂片 250個</i></span>
          <button type="button" disabled={profile.shards < 250} onClick={() => exchangeShards("liberationBooksByShards")}>交換</button>
        </article>
        <article className="liberation-material-card">
          <BookOpen size={24} />
          <span><strong>解放の書 5個</strong><small>BEYOND進化に必要なアイテム</small><i>王冠石 150個</i></span>
          <button type="button" disabled={profile.crownStones < 150} onClick={() => exchangeShards("liberationBooksByCrowns")}>交換</button>
        </article>
      </div>

      <div className="shop-section-heading">
        <span>SOUL FRAGMENT</span>
        <h3>魂片交換</h3>
        <p>いずれも魂片100個で1回交換</p>
      </div>
      <div className="shard-exchange-grid">
        <button type="button" disabled={profile.shards < 100} onClick={() => exchangeShards("gold")}>
          <Coins size={22} /><span><strong>1,000 ゴールド</strong><small>魂片 100</small></span>
        </button>
        <button type="button" disabled={profile.shards < 100} onClick={() => exchangeShards("crystals")}>
          <Gem size={22} /><span><strong>強化結晶 10</strong><small>魂片 100</small></span>
        </button>
        <button type="button" disabled={profile.shards < 100} onClick={() => exchangeShards("stones")}>
          <Shield size={22} /><span><strong>進化石 5</strong><small>魂片 100</small></span>
        </button>
      </div>

      <div className="shop-section-heading">
        <span>DUNGEON EXCHANGE</span>
        <h3>キャラ・専用素材交換</h3>
        <p>対象キャラの専用素材100個で仲間1体と交換</p>
      </div>
      <div className="shop-character-list">
        {exchangeCharacters.map((character) => {
          const tokens = profile.bossTokens[character.id] ?? 0;
          const owned = profile.owned.includes(character.id);
          return (
            <article key={`shop-${character.id}`}>
              <img src={character.image} alt={owned ? character.name : "交換キャラクター"} />
              <span>
                <small>{character.rarity}・{character.element}</small>
                <strong>{owned ? character.name : "？？？？"}</strong>
                <i>専用素材 {tokens} / 100</i>
              </span>
              <button type="button" disabled={tokens < 100} onClick={() => exchangeBossCopy(character.id)}>
                {owned ? "同キャラ獲得" : "仲間にする"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function AbyssView({
  profile,
  startBattle,
}: {
  profile: Profile;
  startBattle: (stageId: string) => void;
}) {
  const nextFloor = Math.min(100, profile.abyssFloor + 1);
  const checkpoints = Array.from(
    { length: 10 },
    (_, index) => (index + 1) * 10,
  );
  return (
    <section className="menu-view abyss-view">
      <div className="abyss-hero">
        <div>
          <span>常設ダンジョン</span>
          <h2>深淵奈落</h2>
          <p>
            階を下るごとに景色と魔物が姿を変える100階層。最深部のヴォイドを討て。
          </p>
        </div>
        <img
          src={requireCharacter("void").image}
          alt={requireCharacter("void").name}
        />
      </div>
      <div className="abyss-progress">
        <div>
          <span>到達階層</span>
          <strong>{profile.abyssFloor} / 100階</strong>
        </div>
        <i>
          <b style={{ width: `${profile.abyssFloor}%` }} />
        </i>
      </div>
      <button
        className="abyss-continue"
        type="button"
        onClick={() => startBattle(`A-${nextFloor}`)}
      >
        <Flame size={22} />
        <span>
          <small>{nextFloor % 10 === 0 ? "記録地点のボス" : "次の階層"}</small>
          {nextFloor}Fへ挑戦
        </span>
        <ChevronRight />
      </button>
      <div className="abyss-rules">
        <span>1階ごとに3連戦</span>
        <span>10階ごとに記録地点</span>
        <span>100階初回クリアで暗黒龍：ヴォイドが仲間になる</span>
      </div>
      <h3>チェックポイント</h3>
      <div className="checkpoint-grid">
        {checkpoints.map((floor) => {
          const unlocked =
            floor === 10
              ? profile.abyssFloor >= 10
              : profile.abyssFloor >= floor;
          return (
            <button
              key={floor}
              type="button"
              disabled={!unlocked}
              onClick={() => startBattle(`A-${floor}`)}
              className={floor === 100 ? "is-final" : ""}
            >
              {unlocked ? <Trophy size={15} /> : <LockKeyhole size={15} />}
              <strong>{floor}F</strong>
              <small>{floor === 100 ? "ヴォイド" : "ボス"}</small>
            </button>
          );
        })}
      </div>
      <div className="abyss-enemy-preview">
        <span>深淵に潜むもの</span>
        <div>
          {ABYSS_ENEMIES.slice(0, 13).map((enemy, index) => (
            <img
              loading="lazy"
              decoding="async"
              key={`${enemy.characterId ?? enemy.name}-${index}`}
              src={enemy.image}
              alt={enemy.name}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function HomeView({
  profile,
  setView,
  replayOpening,
}: {
  profile: Profile;
  setView: (view: View) => void;
  replayOpening: () => void;
}) {
  const team = profile.team.map((id) =>
    resolveProfileCharacterVisual(
      CHARACTER_BY_ID.get(id) ?? requireCharacter(INITIAL_TEAM_IDS[0]),
      profile,
    ),
  );
  const teamLevel = Math.round(
    team.reduce(
      (sum, character) => sum + (profile.levels[character.id] ?? 1),
      0,
    ) / 3,
  );
  const nextStage =
    STAGES.find((stage) => !profile.stageStars[stage.id]) ??
    STAGES[STAGES.length - 1];
  const playerXpNeeded = getPlayerXpNeeded(profile.playerLevel);
  const eventUnlocked = profile.playerLevel >= EVENT_UNLOCK_LEVEL;
  const abyssUnlocked = profile.playerLevel >= ABYSS_UNLOCK_LEVEL;
  return (
    <section
      className="home-stage"
      style={{ "--home-art": `url('${nextStage.background}')` } as React.CSSProperties}
    >
      <div className="home-atmosphere" aria-hidden="true" />
      <div className="home-quest-spotlight">
        <div className="home-quest-heading">
          <span>第{nextStage.chapter}章　{nextStage.area}</span>
          <small>次の探索　第{nextStage.chapter}章-{nextStage.number}</small>
          <strong>{nextStage.title}</strong>
        </div>
        <button className="home-op-button" type="button" onClick={replayOpening}>
          <Play size={13} fill="currentColor" />
          OP
        </button>
      </div>

      <div className="home-command-deck">
        <section className="home-progress-card" aria-label="冒険者情報">
          <div className="home-rank">
            <span>{profile.username}</span>
            <strong>Lv.{profile.playerLevel}</strong>
            <small>ユーザーID：{profile.userId}</small>
          </div>
          <div className="home-progress">
            <div>
              <span>EXP</span>
              <b>{profile.playerXp} / {playerXpNeeded}</b>
            </div>
            <i>
              <b
                style={{
                  width: `${Math.min(100, (profile.playerXp / playerXpNeeded) * 100)}%`,
                }}
              />
            </i>
            <small>
              {profile.playerLevel < EVENT_UNLOCK_LEVEL
                ? `次の解放：イベント Lv.${EVENT_UNLOCK_LEVEL}`
                : profile.playerLevel < ABYSS_UNLOCK_LEVEL
                  ? `次の解放：深淵奈落 Lv.${ABYSS_UNLOCK_LEVEL}`
                  : "すべての冒険が解放されています"}
            </small>
          </div>
        </section>

        <section className="home-squad">
          <div className="home-squad-heading">
            <span>パーティー{profile.activePartyIndex + 1}</span>
            <button type="button" onClick={() => setView("party")}>
              平均 Lv.{teamLevel} <ChevronRight size={15} />
            </button>
          </div>
          <div className="home-squad-grid">
            {team.map((character) => (
              <article
                className={`home-squad-card evo-${profile.evolutions[character.id] ?? 0}`}
                key={character.id}
                style={{ "--unit-color": character.color } as React.CSSProperties}
              >
                <img src={character.image} alt={character.name} />
                <span>
                  <strong>{character.name}</strong>
                  <small>{character.element}・{character.types?.join("・") ?? "不明"}</small>
                </span>
                <b>Lv.{profile.levels[character.id] ?? 1}</b>
              </article>
            ))}
          </div>
        </section>

        <button
          className="home-primary-command"
          type="button"
          onClick={() => setView("stages")}
        >
          <Swords size={24} />
          <span>
            <small>第{nextStage.chapter}章-{nextStage.number}へ出発</small>
            冒険を続ける
          </span>
          <ChevronRight size={24} />
        </button>

        <div className="home-quick-grid">
          <button
            className="quick-event"
            type="button"
            onClick={() => setView("events")}
            disabled={!eventUnlocked}
          >
            {eventUnlocked ? <Flame size={19} /> : <LockKeyhole size={19} />}
            <span>
              <strong>{eventUnlocked ? "イベント" : "イベント未解放"}</strong>
              <small>{eventUnlocked ? "開催中の冒険" : `Lv.${EVENT_UNLOCK_LEVEL}で解放`}</small>
            </span>
          </button>
          <button
            className="quick-abyss"
            type="button"
            onClick={() => setView("abyss")}
            disabled={!abyssUnlocked}
          >
            {abyssUnlocked ? <Flame size={19} /> : <LockKeyhole size={19} />}
            <span>
              <strong>深淵奈落</strong>
              <small>{abyssUnlocked ? `${profile.abyssFloor}階から` : `Lv.${ABYSS_UNLOCK_LEVEL}で解放`}</small>
            </span>
          </button>
          <button type="button" onClick={() => setView("codex")}>
            <BookOpen size={19} />
            <span>
              <strong>キャラ図鑑</strong>
              <small>{profile.owned.length} / {ROSTER.length}</small>
            </span>
          </button>
          <button type="button" onClick={() => setView("growth")}>
            <HeartPulse size={19} />
            <span>
              <strong>キャラ強化</strong>
              <small>{profile.owned.length}体の仲間</small>
            </span>
          </button>
          <button
            className="quick-shop"
            type="button"
            onClick={() => setView("shop")}
          >
            <ShoppingBag size={19} />
            <span>
              <strong>ショップ</strong>
              <small>魂片・専用素材を交換</small>
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}

function InboxView({
  profile,
  claimStarterGift,
  claimRerollGift,
}: {
  profile: Profile;
  claimStarterGift: (characterId: string) => void;
  claimRerollGift: (results: Character[]) => void;
}) {
  const [opened, setOpened] = useState(!profile.starterGiftClaimed);
  const [rerollOpened, setRerollOpened] = useState(
    profile.starterGiftClaimed && !profile.rerollGiftClaimed,
  );
  const [rerollResults, setRerollResults] = useState<Character[]>([]);
  const starters = STARTER_EX_IDS.map(
    (id) => ROSTER.find((character) => character.id === id)!,
  );
  const claimed = profile.starterGiftCharacterId
    ? ROSTER.find((character) => character.id === profile.starterGiftCharacterId)
    : null;
  const unclaimedCount =
    Number(!profile.starterGiftClaimed) + Number(!profile.rerollGiftClaimed);

  return (
    <section className="inbox-view">
      <div className="inbox-heading">
        <div>
          <span>プレゼント</span>
          <h2>プレゼントボックス</h2>
        </div>
        <b>{unclaimedCount > 0 ? `未受取 ${unclaimedCount}件` : "すべて受取済み"}</b>
      </div>
      <article className={`starter-mail ${opened ? "is-open" : ""}`}>
        <button
          className="mail-summary"
          type="button"
          aria-expanded={opened}
          aria-controls="starter-gift-details"
          onClick={() => setOpened((value) => !value)}
        >
          <Gift size={24} />
          <span>
            <small>冒険者ギルドより</small>
            <strong>冒険開始記念・選べるEX召喚状</strong>
            <em>{profile.starterGiftClaimed ? `${claimed?.name ?? "EXキャラ"}を受け取りました` : "3体から好きな1体を選択できます"}</em>
          </span>
          <ChevronRight size={18} />
        </button>
        {opened && (
        <div className="starter-mail-body" id="starter-gift-details">
            <p>これから始まる冒険のため、特別な仲間を一人だけ召喚できます。選択後の変更はできません。</p>
            <div className="starter-choice-grid">
              {starters.map((character) => {
                const stats = character.baseStats;
                const selected = profile.starterGiftCharacterId === character.id;
                return (
                  <article className={`starter-choice rarity-ex ${selected ? "is-selected" : ""}`} key={character.id}>
                    <div className="starter-art">
                      <img src={character.image} alt={character.name} />
                      <b>EX</b>
                    </div>
                    <strong>{character.name}</strong>
                    <span>{character.types?.join("・") ?? "不明"}・{character.element}</span>
                    <div className="starter-specialty">
                      {character.id === "ex-swamp" ? "耐久・防御特化" : character.id === "ex-leopard" ? "回復・技能支援" : "攻撃・会心特化"}
                    </div>
                    <small>HP {stats.hp}　攻撃 {stats.atk}　防御 {stats.def}<br />速度 {stats.spd}　会心 {stats.crit}%</small>
                    <em>{character.skill}</em>
                    <button
                      type="button"
                      disabled={profile.starterGiftClaimed}
                      onClick={() => claimStarterGift(character.id)}
                    >
                      {selected ? "受取済み" : profile.starterGiftClaimed ? "選択終了" : "この仲間を選ぶ"}
                    </button>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </article>
      <article className={`starter-mail reroll-mail ${rerollOpened ? "is-open" : ""}`}>
        <button
          className="mail-summary"
          type="button"
          aria-expanded={rerollOpened}
          aria-controls="reroll-gift-details"
          onClick={() => setRerollOpened((value) => !value)}
        >
          <Sparkles size={24} />
          <span>
            <small>冒険者ギルドより</small>
            <strong>初回限定・引き直し10連召喚</strong>
            <em>{profile.rerollGiftClaimed ? "召喚結果を確定しました" : "確定するまで何度でも引き直せます"}</em>
          </span>
          <ChevronRight size={18} />
        </button>
        {rerollOpened && (
          <div className="starter-mail-body reroll-mail-body" id="reroll-gift-details">
            <p>通常召喚のキャラだけが登場し、SSRが1体以上確定する無料10連です。限定SSR・EX・ダンジョン専用キャラは登場しません。結果を確定するまでは何度でも引き直せます。</p>
            {rerollResults.length > 0 && (
              <div className="reroll-result-grid">
                {rerollResults.map((character, index) => (
                  <article
                    key={`${character.id}-${index}`}
                    className={`rarity-${character.rarity.toLowerCase()}`}
                  >
                    <img src={character.image} alt={character.name} />
                    <b>{character.rarity}</b>
                    <strong>{character.name}</strong>
                  </article>
                ))}
              </div>
            )}
            {!profile.rerollGiftClaimed && (
              <div className="reroll-actions">
                <button type="button" onClick={() => setRerollResults(rollRerollTen())}>
                  {rerollResults.length > 0 ? "もう一度引く" : "無料10連を引く"}
                </button>
                {rerollResults.length > 0 && (
                  <button
                    className="confirm-reroll"
                    type="button"
                    onClick={() => claimRerollGift(rerollResults)}
                  >
                    この結果で確定
                  </button>
                )}
              </div>
            )}
            {profile.rerollGiftClaimed && <p className="reroll-complete">召喚結果を受け取りました。</p>}
          </div>
        )}
      </article>
      <p className="inbox-note">受け取った仲間は育成・編成とキャラ図鑑に追加されます。</p>
    </section>
  );
}

type CharacterSort = "rarity" | "level" | "attack" | "name";
type CharacterRarityFilter = "all" | Rarity;

const RARITY_SORT_SCORE: Record<Rarity, number> = {
  EX: 4,
  SSR: 3,
  SR: 2,
  R: 1,
};

const CHARACTER_ELEMENTS: Element[] = ["火", "水", "木", "光", "闇", "認識負荷"];

function getFilteredOwnedCharacters(
  profile: Profile,
  sort: CharacterSort,
  rarity: CharacterRarityFilter,
  element: string,
) {
  return ROSTER.filter(
    (character) =>
      profile.owned.includes(character.id) &&
      (rarity === "all" || character.rarity === rarity) &&
      (element === "all" || character.element === element),
  ).sort((left, right) => {
    if (sort === "name") return left.name.localeCompare(right.name, "ja");
    if (sort === "level")
      return (
        (profile.levels[right.id] ?? 1) - (profile.levels[left.id] ?? 1) ||
        RARITY_SORT_SCORE[right.rarity] - RARITY_SORT_SCORE[left.rarity]
      );
    if (sort === "attack") {
      const leftStats = getCharacterStats(
        left,
        profile.levels[left.id] ?? 1,
        profile.evolutions[left.id] ?? 0,
      );
      const rightStats = getCharacterStats(
        right,
        profile.levels[right.id] ?? 1,
        profile.evolutions[right.id] ?? 0,
      );
      return rightStats.atk - leftStats.atk;
    }
    return (
      RARITY_SORT_SCORE[right.rarity] - RARITY_SORT_SCORE[left.rarity] ||
      (profile.evolutions[right.id] ?? 0) -
        (profile.evolutions[left.id] ?? 0) ||
      (profile.levels[right.id] ?? 1) - (profile.levels[left.id] ?? 1)
    );
  });
}

function CharacterFilters({
  sort,
  setSort,
  rarity,
  setRarity,
  element,
  setElement,
}: {
  sort: CharacterSort;
  setSort: (value: CharacterSort) => void;
  rarity: CharacterRarityFilter;
  setRarity: (value: CharacterRarityFilter) => void;
  element: string;
  setElement: (value: string) => void;
}) {
  return (
    <div className="character-tools">
      <label>
        <ArrowUpDown size={13} />
        <select
          aria-label="並べ替え"
          value={sort}
          onChange={(event) => setSort(event.target.value as CharacterSort)}
        >
          <option value="rarity">レア度順</option>
          <option value="level">レベル順</option>
          <option value="attack">攻撃力順</option>
          <option value="name">名前順</option>
        </select>
      </label>
      <label>
        <Filter size={13} />
        <select
          aria-label="レア度で絞り込み"
          value={rarity}
          onChange={(event) =>
            setRarity(event.target.value as CharacterRarityFilter)
          }
        >
          <option value="all">全レア度</option>
          <option value="EX">EX</option>
          <option value="SSR">SSR</option>
          <option value="SR">SR</option>
          <option value="R">R</option>
        </select>
      </label>
      <label>
        <Filter size={13} />
        <select
          aria-label="属性で絞り込み"
          value={element}
          onChange={(event) => setElement(event.target.value)}
        >
          <option value="all">全属性</option>
          {CHARACTER_ELEMENTS.map((value) => (
            <option value={value} key={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function PartyView({
  profile,
  appearanceRunId,
  setTeamMember,
  setActiveParty,
  setView,
  returnToPreparation,
}: {
  profile: Profile;
  appearanceRunId?: string;
  setTeamMember: (slot: number, id: string) => void;
  setActiveParty: (index: number) => void;
  setView: (view: View) => void;
  returnToPreparation?: () => void;
}) {
  const imagePreview = useCharacterImagePreview();
  const [selectedSlot, setSelectedSlot] = useSessionState(
    "relic-rush-party-slot",
    0,
  );
  const [sort, setSort] = useSessionState<CharacterSort>(
    "relic-rush-party-sort",
    "rarity",
  );
  const [rarity, setRarity] = useSessionState<CharacterRarityFilter>(
    "relic-rush-party-rarity",
    "all",
  );
  const [element, setElement] = useSessionState(
    "relic-rush-party-element",
    "all",
  );
  const safeSelectedSlot = Math.max(
    0,
    Math.min(PARTY_SIZE - 1, selectedSlot),
  );
  const team = profile.team.map((id) =>
    resolveProfileCharacterVisual(
      CHARACTER_BY_ID.get(id) ?? requireCharacter(INITIAL_TEAM_IDS[0]),
      profile,
      appearanceRunId,
    ),
  );
  const activeSynergy = getActivePartySynergy(profile.team);
  const synergyDiscovered = Boolean(
    activeSynergy && profile.discoveredSynergyIds.includes(activeSynergy.id),
  );
  const characters = getFilteredOwnedCharacters(
    profile,
    sort,
    rarity,
    element,
  );
  return (
    <section className="menu-view party-view formation-view" onScrollCapture={imagePreview.cancel}>
      {imagePreview.viewer}
      {returnToPreparation && (
        <button
          className="return-preparation-button"
          type="button"
          onClick={returnToPreparation}
        >
          <ArrowLeft size={15} /> 出撃準備へ戻る
        </button>
      )}
      <div className="menu-heading screen-heading-row">
        <div>
          <span>PARTY</span>
          <h2>パーティ編成</h2>
          <p>タップで編成。キャラを長押しすると画像を拡大できます。</p>
        </div>
      </div>
      <CharacterSectionNav active="party" setView={setView} />

      <div className="party-tabs" role="tablist" aria-label="パーティ選択">
        {profile.parties.map((_, index) => (
          <button
            className={profile.activePartyIndex === index ? "is-active" : ""}
            type="button"
            role="tab"
            aria-selected={profile.activePartyIndex === index}
            key={index}
            onClick={() => {
              setActiveParty(index);
              setSelectedSlot(0);
            }}
          >
            P{index + 1}
          </button>
        ))}
      </div>

      <div className="active-party-label">
        <Users size={15} />
        パーティー{profile.activePartyIndex + 1}を使用中
      </div>
      <div className="team-editor">
        {team.map((character, index) => (
          <button
            className={`${safeSelectedSlot === index ? "is-selecting" : ""} evo-${profile.evolutions[character.id] ?? 0}`}
            type="button"
            key={`${character.id}-${index}`}
            {...imagePreview.bind({ image: character.image, title: character.name })}
            onClick={() => setSelectedSlot(index)}
            style={{ "--unit-color": character.color } as React.CSSProperties}
          >
            <small>{index + 1}人目</small>
            <img src={character.image} alt={character.name} />
            <strong>{character.name}</strong>
            <span>Lv.{profile.levels[character.id] ?? 1}</span>
          </button>
        ))}
      </div>
      <p className="party-help">
        {safeSelectedSlot + 1}人目の交代キャラを選択中
      </p>

      <div className="character-list-heading">
        <h3>所持キャラ</h3>
        <small>{characters.length}体</small>
      </div>
      <CharacterFilters
        sort={sort}
        setSort={setSort}
        rarity={rarity}
        setRarity={setRarity}
        element={element}
        setElement={setElement}
      />
      {characters.length ? (
        <div className="formation-roster">
          {characters.map((baseCharacter) => {
            const character = resolveProfileCharacterVisual(
              baseCharacter,
              profile,
              appearanceRunId,
            );
            const isInTeam = profile.team.includes(character.id);
            return (
              <button
                className={`${isInTeam ? "is-in-team" : ""} rarity-${character.rarity.toLowerCase()} evo-${profile.evolutions[character.id] ?? 0}`}
                type="button"
                key={character.id}
                {...imagePreview.bind({ image: character.image, title: character.name })}
                onClick={() => setTeamMember(safeSelectedSlot, character.id)}
                style={{ "--unit-color": character.color } as React.CSSProperties}
              >
                <span className="formation-art">
                  <img
                    loading="lazy"
                    decoding="async"
                    src={character.image}
                    alt={character.name}
                  />
                  {isInTeam && <em>編成中</em>}
                </span>
                <span className="formation-copy">
                  <b>{character.rarity}</b>
                  <strong>{character.name}</strong>
                  <small>
                    {character.element}・Lv.{profile.levels[character.id] ?? 1}
                  </small>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="character-empty">条件に合うキャラはいません。</p>
      )}

      <div className="party-system-heading"><h3>連携覚醒</h3><button type="button" onClick={() => setView("tags")}>タグ図鑑</button></div>
      <div
        className={`party-synergy-status ${activeSynergy ? "has-reaction" : ""}`}
        style={activeSynergy ? { "--synergy-color": activeSynergy.color } as CSSProperties : undefined}
      >
        <Link2 size={22} />
        {activeSynergy ? (
          synergyDiscovered ? (
            <span><small>発動中</small><strong>{activeSynergy.name}</strong><b>{activeSynergy.awakeningDescription}</b></span>
          ) : (
            <span><small>未知の共鳴</small><strong>連携反応を検出</strong><b>この3体でダンジョンへ出撃すると判明</b></span>
          )
        ) : (
          <span><small>未発動</small><strong>連携覚醒なし</strong><b>関係を持つ3体の組み合わせを探そう</b></span>
        )}
      </div>

      <div className="party-system-heading"><h3>パーティ装備</h3><button type="button" onClick={() => setView("growth")}>装備変更</button></div>
      <div className="party-equipment-row">
        {team.map((character) => {
          const item = EQUIPMENT_BY_ID.get(profile.equippedItems[character.id] ?? "");
          return (
            <article key={`party-equipment-${character.id}`}>
              {item ? <EquipmentIcon item={item} label /> : <span className="empty-equipment-icon"><Package size={20} /></span>}
              <span><small>{character.name}</small><strong>{item?.name ?? "装備なし"}</strong>{item && <b>{item.effectLabel}</b>}</span>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function GrowthView({
  mode,
  profile,
  levelUp,
  evolveCharacter,
  levelUpSkill,
  equipCharacterItem,
  setView,
}: {
  mode: "growth" | "evolution";
  profile: Profile;
  levelUp: (id: string, targetLevel?: number) => void;
  evolveCharacter: (id: string) => void;
  levelUpSkill: (characterId: string, skillId: string) => void;
  equipCharacterItem: (characterId: string, equipmentId: string | null) => void;
  setView: (view: View) => void;
}) {
  const evolutionMode = mode === "evolution";
  const [sort, setSort] = useSessionState<CharacterSort>(
    "relic-rush-growth-sort",
    "rarity",
  );
  const [rarity, setRarity] = useSessionState<CharacterRarityFilter>(
    "relic-rush-growth-rarity",
    "all",
  );
  const [element, setElement] = useSessionState(
    "relic-rush-growth-element",
    "all",
  );
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(
    null,
  );
  const [targetLevel, setTargetLevel] = useState(1);
  const characters = getFilteredOwnedCharacters(profile, sort, rarity, element);
  const selectedBaseCharacter = selectedCharacterId
    ? CHARACTER_BY_ID.get(selectedCharacterId)
    : undefined;
  const selectedCharacter = selectedBaseCharacter
    ? resolveProfileCharacterVisual(selectedBaseCharacter, profile)
    : undefined;

  const wallet = (
    <div className="growth-wallet">
      <span><Coins size={14} />{profile.gold.toLocaleString()} G</span>
      <span><Gem size={14} />強化結晶 {profile.trainingCrystals}</span>
      <span><Sparkles size={14} />進化石 {profile.evoStones}</span>
      <span><Flame size={14} />龍頭石 {profile.dragonHeadStones}</span>
      <span><Crown size={14} />王冠石 {profile.crownStones}</span>
      <span><BookOpen size={14} />解放の書 {profile.liberationBooks}</span>
      <span><img className="material-character-inline" src={MATERIAL_CHARACTER_BY_PROFILE_KEY.get("evolutionMaterialCharacters")?.image} alt="" aria-hidden="true" />変化の幼精 {profile.evolutionMaterialCharacters}</span>
      <span><img className="material-character-inline" src={MATERIAL_CHARACTER_BY_PROFILE_KEY.get("skillMaterialCharacters")?.image} alt="" aria-hidden="true" />技継ぎの導師 {profile.skillMaterialCharacters}</span>
    </div>
  );

  let detail: React.ReactNode = null;
  if (selectedCharacter && profile.owned.includes(selectedCharacter.id)) {
    const level = profile.levels[selectedCharacter.id] ?? 1;
    const evolution = profile.evolutions[selectedCharacter.id] ?? 0;
    const cap = getLevelCap(evolution);
    const maxEvolution = getCharacterMaxEvolution(selectedCharacter);
    const requirement = getEvolutionRequirements(selectedCharacter, evolution);
    const plan = getLevelUpgradePlan(
      level,
      cap,
      profile.gold,
      profile.trainingCrystals,
      targetLevel > level ? targetLevel : undefined,
    );
    const stats = getBattlePartyStats([selectedCharacter], profile)[0];
    const awakening = getUniqueAwakening(selectedCharacter, evolution);
    const skills = getCharacterSkills(selectedCharacter, evolution);
    const equippedItem = EQUIPMENT_BY_ID.get(
      profile.equippedItems[selectedCharacter.id] ?? "",
    );
    const compatibleEquipment = EQUIPMENT_ITEMS.filter(
      (item) =>
        isEquipmentCompatible(selectedCharacter.types ?? ["不明"], item) &&
        ((profile.equipmentInventory[item.id] ?? 0) > 0 ||
          equippedItem?.id === item.id),
    );
    const evolutionMaterialIcon =
      requirement.material === "dragonHeadStones" ? (
        <Flame size={17} />
      ) : requirement.material === "crownStones" ? (
        <Crown size={17} />
      ) : requirement.material === "liberationBooks" ? (
        <BookOpen size={17} />
      ) : (
        <Sparkles size={17} />
      );
    const evolutionUnlock =
      evolution + 1 === 6
        ? "スキル強化"
        : evolution + 1 === 12
          ? `固有覚醒・スキル極化${requirement.evolutionMaterialCharacters > 0 ? "・姿の変化" : ""}`
          : evolution + 1 === 18
            ? "主スキル超越・第2スキル解放"
            : null;
    const canEvolve =
      evolution < maxEvolution &&
      level >= cap &&
      profile[requirement.material] >= requirement.amount &&
      profile.evolutionMaterialCharacters >=
        requirement.evolutionMaterialCharacters &&
      (profile.characterCopies[selectedCharacter.id] ?? 0) >=
        requirement.copies;
    detail = (
      <div className="growth-character-detail">
        <button
          className="growth-detail-back"
          type="button"
          onClick={() => setSelectedCharacterId(null)}
        >
          <ArrowLeft size={17} />キャラ一覧へ
        </button>
        <article
          className={`growth-detail-hero rarity-${selectedCharacter.rarity.toLowerCase()}`}
          style={{ "--unit-color": selectedCharacter.color } as React.CSSProperties}
        >
          <div className="growth-detail-art">
            <img src={selectedCharacter.image} alt={selectedCharacter.name} />
            {profile.team.includes(selectedCharacter.id) && <em>編成中</em>}
          </div>
          <div className="growth-detail-copy">
            <span>{selectedCharacter.rarity}・{normalizeElement(selectedCharacter.element)}</span>
            <h3>{selectedCharacter.name}</h3>
            <EvolutionStars evolution={evolution} />
            <b>Lv.{level} / {cap}</b>
          </div>
        </article>
        <div className="growth-detail-stats">
          {([
            ["HP", stats.hp],
            ["攻撃", stats.atk],
            ["防御", stats.def],
            ["速度", stats.spd],
            ["会心", `${stats.crit}%`],
          ] as const).map(([label, value]) => (
            <span key={label}><small>{label}</small><b>{value}</b></span>
          ))}
        </div>
        {!evolutionMode && <section className="equipment-loadout-panel">
          <div className="growth-panel-heading">
            <span>装備</span>
            <small>{(selectedCharacter.types ?? ["不明"]).join("・")}タイプ対応</small>
          </div>
          {equippedItem ? (
            <div className="equipped-item-summary">
              <EquipmentIcon item={equippedItem} label />
              <span><small>装備中</small><strong>{equippedItem.name}</strong><b>{equippedItem.effectLabel}</b></span>
              <button type="button" onClick={() => equipCharacterItem(selectedCharacter.id, null)}>外す</button>
            </div>
          ) : (
            <p className="equipment-slot-empty"><Package size={18} />装備なし</p>
          )}
          {compatibleEquipment.length ? (
            <div className="compatible-equipment-list">
              {compatibleEquipment.map((item) => {
                const available =
                  (profile.equipmentInventory[item.id] ?? 0) -
                  getEquippedItemCount(profile, item.id, selectedCharacter.id);
                const isEquipped = equippedItem?.id === item.id;
                return (
                  <button
                    className={isEquipped ? "is-equipped" : ""}
                    type="button"
                    key={item.id}
                    disabled={isEquipped || available <= 0}
                    onClick={() => equipCharacterItem(selectedCharacter.id, item.id)}
                  >
                    <EquipmentIcon item={item} />
                    <span><strong>{item.name}</strong><small>{item.effectLabel}</small></span>
                    <b>{isEquipped ? "装備中" : `残り${available}`}</b>
                  </button>
                );
              })}
            </div>
          ) : (
            <small className="no-compatible-equipment">装備できる所持品はまだありません。</small>
          )}
          <button className="open-equipment-codex" type="button" onClick={() => setView("equipment")}><BookOpen size={15} />装備図鑑を見る</button>
        </section>}
        {!evolutionMode && <section className="growth-upgrade-panel">
          <div><span>レベル強化</span><strong>Lv.{level} → Lv.{plan.targetLevel}</strong></div>
          {plan.affordableLevel > level ? (
            <label className="growth-level-target">
              <span>強化先を選択</span>
              <select
                value={plan.targetLevel}
                onChange={(event) => setTargetLevel(Number(event.target.value))}
              >
                {Array.from(
                  { length: plan.affordableLevel - level },
                  (_, index) => level + index + 1,
                ).map((value) => <option key={value} value={value}>Lv.{value}</option>)}
              </select>
            </label>
          ) : (
            <small>{level >= cap ? "現在の進化段階の上限です。" : "強化素材が不足しています。"}</small>
          )}
          <button
            type="button"
            disabled={plan.targetLevel <= level}
            onClick={() => levelUp(selectedCharacter.id, plan.targetLevel)}
          >
            {plan.targetLevel <= level
              ? "強化できません"
              : `一気に強化　${plan.goldCost.toLocaleString()}G・強化結晶${plan.crystalCost}`}
          </button>
        </section>}
        <section className="growth-upgrade-panel evolution-panel">
          <div>
            <span>進化</span>
            <strong className="evolution-next-marks"><EvolutionStars evolution={evolution} />{evolution >= maxEvolution ? "MAX" : <><ArrowRight size={16} /><EvolutionStars evolution={evolution + 1} /></>}</strong>
          </div>
          {evolutionUnlock && <b className="evolution-unlock">解放：{evolutionUnlock}</b>}
          {evolution < maxEvolution && (
            <div className="evolution-requirements" aria-label="進化に必要な素材">
              <span title={requirement.materialName} aria-label={`${requirement.materialName} ${profile[requirement.material]} / ${requirement.amount}`}>
                {evolutionMaterialIcon}
                <b>{profile[requirement.material]} / {requirement.amount}</b>
              </span>
              {requirement.evolutionMaterialCharacters > 0 && (
                <span title="変化の幼精" aria-label={`変化の幼精 ${profile.evolutionMaterialCharacters} / ${requirement.evolutionMaterialCharacters}`}>
                  <img
                    className="material-character-inline"
                    src={MATERIAL_CHARACTER_BY_PROFILE_KEY.get("evolutionMaterialCharacters")?.image}
                    alt=""
                    aria-hidden="true"
                  />
                  <b>{profile.evolutionMaterialCharacters} / {requirement.evolutionMaterialCharacters}</b>
                </span>
              )}
              {requirement.copies > 0 && (
                <span title="同じキャラ" aria-label={`同じキャラ ${profile.characterCopies[selectedCharacter.id] ?? 0} / ${requirement.copies}`}>
                  <UserRound size={17} />
                  <b>{profile.characterCopies[selectedCharacter.id] ?? 0} / {requirement.copies}</b>
                </span>
              )}
            </div>
          )}
          <button
            type="button"
            disabled={!canEvolve}
            onClick={() => evolveCharacter(selectedCharacter.id)}
          >
            {evolution >= maxEvolution
              ? "最大進化到達"
              : level < cap
                ? `Lv.${cap}で進化可能`
                : "進化する"}
          </button>
        </section>
        {!evolutionMode && <section className="skill-level-panel">
          <div className="growth-panel-heading">
            <span className="material-heading-label">
              <img
                className="material-character-inline"
                src={MATERIAL_CHARACTER_BY_PROFILE_KEY.get("skillMaterialCharacters")?.image}
                alt=""
                aria-hidden="true"
              />
              スキル強化
            </span>
            <small>技継ぎの導師 {profile.skillMaterialCharacters}体所持・Lvごとに再使用を1短縮</small>
          </div>
          {skills.map((skill) => {
            const skillLevel = profile.skillLevels[skill.id] ?? 1;
            const cost = SKILL_LEVEL_COSTS[skillLevel - 1] ?? 0;
            return (
              <article key={skill.id}>
                <div>
                  <strong>{skill.name}</strong>
                  <b>Lv.{skillLevel} / 6</b>
                </div>
                <p>{getSkillDescription(skill, skillLevel)}</p>
                <button
                  type="button"
                  disabled={skillLevel >= 6 || profile.skillMaterialCharacters < cost}
                  onClick={() => levelUpSkill(selectedCharacter.id, skill.id)}
                >
                  {skillLevel >= 6
                    ? "最大スキルLv"
                    : `強化　技継ぎの導師×${cost}`}
                </button>
              </article>
            );
          })}
          {evolution < 18 && <small>BEYOND・黄で主スキルが超越し、第2スキルが解放されます。</small>}
        </section>}
        <section className={`awakening-panel ${evolution >= 12 ? "" : "is-locked"}`}>
          <div><Crown size={20} /><span>固有覚醒</span></div>
          <strong>{evolution >= 12 ? awakening.name : "未解放"}</strong>
          <p>{evolution >= 12 ? awakening.description : maxEvolution < 12 ? "このキャラは固有覚醒の対象外です。" : "赤龍頭から黄王冠への進化で解放されます。"}</p>
        </section>
      </div>
    );
  }

  return (
    <section className={`menu-view party-view growth-view ${evolutionMode ? "evolution-view" : ""}`}>
      <div className="menu-heading screen-heading-row">
        <div>
          <span>{evolutionMode ? "EVOLUTION" : "GROWTH"}</span>
          <h2>{evolutionMode ? "キャラ進化" : "キャラ強化"}</h2>
          <p>{evolutionMode ? "進化段階と解放能力を確認し、条件を満たした仲間を進化させよう。" : "育てるキャラを選び、個別画面で強化しよう。"}</p>
        </div>
        <button className="screen-link-button" type="button" onClick={() => setView("party")}>
          <ArrowLeft size={17} />編成へ
        </button>
      </div>
      <CharacterSectionNav active={mode} setView={setView} />
      {wallet}
      {!detail && <MaterialCharacterCatalog profile={profile} compact />}
      {detail ?? (
        <>
          <details className="evolution-guide">
            <summary>進化条件・段階と上限</summary>
            <div>
              {Array.from({ length: 21 }, (_, stage) => (
                <span key={stage}><EvolutionStars evolution={stage} /><small>MAX Lv.{getLevelCap(stage)}</small></span>
              ))}
              <span>R 上限 <EvolutionStars evolution={5} /></span>
              <span>SR 上限 <EvolutionStars evolution={17} /></span>
              <span>SSR・EX 上限 <EvolutionStars evolution={20} /></span>
            </div>
          </details>
          <div className="character-list-heading"><h3>{evolutionMode ? "進化するキャラを選択" : "強化するキャラを選択"}</h3><small>{characters.length}体</small></div>
          <CharacterFilters
            sort={sort}
            setSort={setSort}
            rarity={rarity}
            setRarity={setRarity}
            element={element}
            setElement={setElement}
          />
          {characters.length ? (
            <div className="roster-grid growth-picker-grid">
              {characters.map((baseCharacter) => {
                const character = resolveProfileCharacterVisual(
                  baseCharacter,
                  profile,
                );
                const level = profile.levels[character.id] ?? 1;
                const evolution = profile.evolutions[character.id] ?? 0;
                const cap = getLevelCap(evolution);
                const plan = getLevelUpgradePlan(
                  level,
                  cap,
                  profile.gold,
                  profile.trainingCrystals,
                );
                return (
                  <article className={`is-owned rarity-${character.rarity.toLowerCase()}`} key={character.id}>
                    <button
                      className="growth-roster-pick"
                      type="button"
                      onClick={() => {
                        setSelectedCharacterId(character.id);
                        setTargetLevel(plan.affordableLevel);
                      }}
                    >
                      <div className="roster-art">
                        <img loading="lazy" decoding="async" src={character.image} alt={character.name} />
                        {profile.team.includes(character.id) && <em>使用中</em>}
                      </div>
                      <div className="roster-info">
                        <div><b>{character.rarity}</b><strong>{character.name}</strong></div>
                        <div className="roster-progress"><EvolutionStars evolution={evolution} /><small>Lv.{level} / {cap}</small></div>
                      </div>
                      <span className="growth-select-button">{evolutionMode ? "進化状況を確認" : "このキャラを強化"}</span>
                    </button>
                  </article>
                );
              })}
            </div>
          ) : <p className="character-empty">条件に合うキャラはいません。</p>}
        </>
      )}
    </section>
  );
}

function CharacterSectionNav({
  active,
  setView,
}: {
  active: "party" | "growth" | "evolution" | "codex" | "equipment" | "tags";
  setView: (view: View) => void;
}) {
  return (
    <nav className="character-section-nav" aria-label="キャラメニュー">
      <button className={active === "party" ? "is-active" : ""} type="button" onClick={() => setView("party")}>編成</button>
      <button className={active === "growth" ? "is-active" : ""} type="button" onClick={() => setView("growth")}>強化・装備</button>
      <button className={active === "evolution" ? "is-active" : ""} type="button" onClick={() => setView("evolution")}>進化</button>
      <button className={active === "codex" ? "is-active" : ""} type="button" onClick={() => setView("codex")}>キャラ図鑑</button>
      <button className={active === "equipment" ? "is-active" : ""} type="button" onClick={() => setView("equipment")}>装備図鑑</button>
      <button className={active === "tags" ? "is-active" : ""} type="button" onClick={() => setView("tags")}>タグ図鑑</button>
    </nav>
  );
}

function CodexView({ profile, setView, appearanceRunId }: { profile: Profile; setView: (view: View) => void; appearanceRunId?: string }) {
  const imagePreview = useCharacterImagePreview();
  const [filter, setFilter] = useSessionState<"all" | "owned" | "gacha" | "dungeon">("relic-rush-codex-filter", "all");
  const [visibleLimit, setVisibleLimit] = useState(24);
  const visible = ROSTER.filter((character) =>
    filter === "owned"
      ? profile.owned.includes(character.id)
      : filter === "gacha"
        ? character.source === "gacha"
        : filter === "dungeon"
          ? character.source === "dungeon"
          : true,
  );
  const displayed = visible.slice(0, visibleLimit);
  return (
    <section className="menu-view codex-view" onScrollCapture={imagePreview.cancel}>
      {imagePreview.viewer}
      <div className="menu-heading">
        <span>キャラクター図鑑</span>
        <h2>キャラ図鑑</h2>
        <p>
          キャラを長押しすると画像を拡大できます。未入手キャラの名前・能力・入手先は仲間になってから解放。
        </p>
      </div>
      <CharacterSectionNav active="codex" setView={setView} />
      <div className="codex-progress">
        <BookOpen size={18} />
        <span>収集率</span>
        <strong>
          {profile.owned.length} / {ROSTER.length}
        </strong>
      </div>
      <MaterialCharacterCatalog profile={profile} />
      <div className="codex-filters">
        {[
          ["all", "すべて"],
          ["owned", "所持"],
          ["gacha", "ガチャ"],
          ["dungeon", "ダンジョン"],
        ].map(([value, label]) => (
          <button
            className={filter === value ? "is-active" : ""}
            type="button"
            key={value}
            onClick={() => {
              setFilter(value as typeof filter);
              setVisibleLimit(24);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="codex-grid">
        {displayed.map((baseCharacter) => {
          const owned = profile.owned.includes(baseCharacter.id);
          const character = owned
            ? resolveProfileCharacterVisual(baseCharacter, profile, appearanceRunId)
            : baseCharacter;
          return (
            <article
              className={`${owned ? "is-owned" : "is-unknown"} rarity-${character.rarity.toLowerCase()}`}
              key={character.id}
              {...imagePreview.bind({ image: character.image, title: owned ? character.name : "未入手キャラクター" }, true)}
              role="button"
              tabIndex={0}
              aria-label={`${owned ? character.name : "未入手キャラクター"}の画像を表示`}
              style={{ "--unit-color": character.color } as React.CSSProperties}
            >
              <div className="codex-art">
                <img loading="lazy" decoding="async"
                  src={character.image}
                  alt={owned ? character.name : "未入手キャラクター"}
                />
                {!owned && <LockKeyhole size={20} />}
              </div>
              {owned ? (
                <div className="codex-copy">
                  <b>{character.rarity}</b>
                  <strong>{character.name}</strong>
                  <span>
                    {character.element}・{character.types?.join("・") ?? "不明"}
                  </span>
                  <small>固有技　{character.skill}</small>
                  <p>
                {(character.source === "dungeon" || character.id === LUCKY_BURNS_ID)
                  ? character.lore ?? "ダンジョンで契約した仲間。"
                      : `${character.element}属性の${character.types?.join("・") ?? "不明"}タイプ。仲間とともに数々の戦いへ挑む。`}
                  </p>
                </div>
              ) : (
                <div className="codex-locked">
                  <strong>？？？？</strong>
                  <span>未入手</span>
                </div>
              )}
            </article>
          );
        })}
      </div>
      {visibleLimit < visible.length && <button className="codex-load-more" type="button" onClick={() => setVisibleLimit((value) => value + 24)}>もっと見る</button>}
    </section>
  );
}

function SettingsView({
  profile,
  changeVolume,
  redeemPromo,
  promoMessage,
  cloudStatus,
  updateIdentity,
  resetAccount,
  returnTitle,
}: {
  profile: Profile;
  changeVolume: (value: number) => void;
  redeemPromo: (code: string) => void;
  promoMessage: string;
  cloudStatus: SaveStatus;
  updateIdentity: (username: string) => void;
  resetAccount: () => Promise<string | null>;
  returnTitle: () => void;
}) {
  const [code, setCode] = useState("");
  const [username, setUsername] = useState(profile.username);
  const [idCopied, setIdCopied] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState("");
  return (
    <section className="menu-view settings-view">
      <div className="menu-heading">
        <span>ゲーム設定</span>
        <h2>設定</h2>
        <p>プロフィールやサウンド、セーブデータを確認・変更できます。</p>
      </div>
      <div className="settings-card profile-settings-card">
        <h3>
          <UserRound size={18} />
          プロフィール
        </h3>
        <label className="profile-name-field">
          <span>プレイヤー名</span>
          <div>
            <input
              value={username}
              maxLength={12}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="冒険者"
              aria-label="プレイヤー名"
            />
            <button type="button" onClick={() => updateIdentity(username)}>
              保存
            </button>
          </div>
        </label>
        <div className="profile-id-row">
          <span>ユーザーID</span>
          <strong>{profile.userId || "発行中…"}</strong>
          <button
            type="button"
            disabled={!profile.userId}
            onClick={() => {
              void navigator.clipboard.writeText(profile.userId);
              setIdCopied(true);
              window.setTimeout(() => setIdCopied(false), 1600);
            }}
          >
            {idCopied ? "コピー済み" : "コピー"}
          </button>
        </div>
        <small>プレイヤー名は12文字まで。ユーザーIDは変更できません。</small>
      </div>
      <div className="settings-card">
        <h3>
          <Volume2 size={18} />
          サウンド
        </h3>
        <label>
          <span>
            <Volume2 size={15} />
            効果音<strong>{profile.seVolume}%</strong>
          </span>
          <input
            type="range"
            min="0"
            max="100"
            value={profile.seVolume}
            onChange={(event) => changeVolume(Number(event.target.value))}
          />
        </label>
      </div>
      <div className="settings-card">
        <h3>
          <Sparkles size={18} />
          セーブデータ
        </h3>
        <p>
          {cloudStatus === "guest"
            ? "この端末に保存しました。ログインすると、アカウントに冒険を引き継げます。"
            : cloudStatus === "conflict"
              ? "別の端末のセーブを確認しています。"
              : cloudStatus === "synced"
            ? "セーブしました。別の端末でも続きから遊べます。"
            : cloudStatus === "syncing"
              ? "セーブ中…"
              : cloudStatus === "loading"
                ? "セーブデータを確認しています…"
                : "保存を完了できませんでした。通信や端末の保存設定を確認してください。"}
        </p>
        {cloudStatus === "guest" && <a href="/signin-with-chatgpt?return_to=%2F" target="_top">ログインして冒険を引き継ぐ</a>}
      </div>
      <div className="settings-card promo-card">
        <h3>
          <Gift size={18} />
          特典コード
        </h3>
        <div>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="コードを入力"
            autoCapitalize="characters"
          />
          <button type="button" onClick={() => redeemPromo(code)}>
            受け取る
          </button>
        </div>
        {promoMessage && <p aria-live="polite">{promoMessage}</p>}
        <small>コードごとに1回だけ使用できます。</small>
      </div>
      <button
        className="return-title-button"
        type="button"
        onClick={returnTitle}
      >
        <RotateCcw size={18} />
        タイトル画面に戻る
      </button>
      <div className="settings-card danger-settings-card">
        <h3>
          <RotateCcw size={18} />
          アカウントのリセット
        </h3>
        <p>ゲームデータを削除して、最初から遊び直します。</p>
        <AlertDialog
          onOpenChange={(open) => {
            if (!open && !resetting) setResetError("");
          }}
        >
          <AlertDialogTrigger asChild>
            <button className="account-reset-button" type="button">
              <RotateCcw size={17} />
              アカウントをリセット
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent size="sm" className="account-reset-dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>アカウントをリセットしますか？</AlertDialogTitle>
              <AlertDialogDescription>
                冒険の進行状況、所持キャラクター、通貨、プレイヤー名、ユーザーIDなどを削除します。削除したデータは元に戻せません。
              </AlertDialogDescription>
            </AlertDialogHeader>
            {resetError && (
              <p className="account-reset-error" role="alert">
                {resetError}
              </p>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={resetting}>やめる</AlertDialogCancel>
              <button
                className="account-reset-confirm"
                type="button"
                disabled={resetting}
                onClick={() => {
                  setResetting(true);
                  setResetError("");
                  void resetAccount().then((error) => {
                    if (!error) return;
                    setResetError(error);
                    setResetting(false);
                  });
                }}
              >
                {resetting ? "リセット中…" : "リセットする"}
              </button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}

function SummonView({
  profile,
  summoning,
  results,
  summon,
  banner,
  setBanner,
  series,
  setSeries,
  closeResults,
}: {
  profile: Profile;
  summoning: boolean;
  results: Character[];
  summon: (count: 1 | 10) => void;
  banner: SummonBanner;
  setBanner: (banner: SummonBanner) => void;
  series: number;
  setSeries: (series: number) => void;
  closeResults: () => void;
}) {
  const [showRates, setShowRates] = useSessionState("relic-rush-rate-sheet", false);
  const [rotationNow] = useState(Date.now);
  const rotation = getLimitedRotation(rotationNow);
  const special = getSpecialRotation();
  const pity =
    banner === "limited"
      ? (profile.limitedPity[rotation.key] ?? 0)
      : profile.pity;
  const focusedPool = getBannerPool(banner, series);
  const standardPool = getBannerPool("standard", series);
  const rarityPool = (rarity: Rarity) => {
    const focused = focusedPool.filter((unit) => unit.rarity === rarity);
    return focused.length
      ? focused
      : standardPool.filter((unit) => unit.rarity === rarity);
  };
  const pool =
    banner === "limited"
      ? [
          rotation.featured,
          ...rarityPool("SSR"),
          ...rarityPool("SR"),
          ...rarityPool("R"),
        ]
      : [...rarityPool("SSR"), ...rarityPool("SR"), ...rarityPool("R")];
  const bannerParty =
    banner === "limited" ? [rotation.featured] : pool.slice(0, 2);
  const endDate = banner === "limited" ? rotation.endsAt : special.endsAt;
  const endLabel = endDate.toLocaleDateString("ja-JP", {
    month: "numeric",
    day: "numeric",
  });
  const bannerTitle =
    banner === "limited"
      ? rotation.featured.name
      : banner === "element"
        ? `${special.element}属性ピックアップ`
        : banner === "role"
          ? `${special.role === "damage" ? "攻撃" : special.role === "guard" ? "守護" : "回復"}タイプ召喚`
          : `常設召喚 第${series + 1}弾`;
  const bannerCopy =
    banner === "limited"
      ? `通常SSRより高い基礎性能・${rotation.featured.skill}`
      : banner === "element"
        ? `${special.element}属性の仲間だけが登場`
        : banner === "role"
          ? "同じ戦闘タイプのキャラを狙いやすい召喚"
          : "いつでも引ける定番の召喚";
  const unitRate = (unit: Character) => {
    if (banner === "limited" && unit.id === rotation.featured.id) return 1;
    if (unit.rarity === "SSR")
      return (banner === "limited" ? 1 : 2) / rarityPool("SSR").length;
    if (unit.rarity === "SR") return 17 / rarityPool("SR").length;
    return 81 / rarityPool("R").length;
  };
  return (
    <section className={`menu-view summon-view banner-${banner}`}>
      <div className="summon-tabs four-tabs">
        {[
          ["limited", "限定"],
          ["element", "属性"],
          ["role", "タイプ"],
          ["standard", "通常"],
        ].map(([value, label]) => (
          <button
            className={banner === value ? "is-active" : ""}
            type="button"
            key={value}
            onClick={() => setBanner(value as SummonBanner)}
          >
            {label}
          </button>
        ))}
      </div>
      {banner === "standard" && (
        <div className="series-tabs" aria-label="常設召喚の弾を選択">
          {GACHA_SERIES.map((_, index) => (
            <button
              type="button"
              className={series === index ? "is-active" : ""}
              key={index}
              onClick={() => setSeries(index)}
            >
              第{index + 1}弾
            </button>
          ))}
        </div>
      )}
      <div className="summon-banner">
        <div className="banner-copy">
          <span>
            {banner === "standard" ? "常設召喚" : `期間限定・${endLabel}まで`}
          </span>
          <h2>{bannerTitle}</h2>
          <p>{bannerCopy}</p>
        </div>
        <div className={`banner-party count-${bannerParty.length}`}>
          {bannerParty.map((character) => (
            <img
              key={character.id}
              src={character.image}
              alt={character.name}
            />
          ))}
        </div>
        <div className={`summon-gate ${summoning ? "is-opening" : ""}`}>
          <Gem />
        </div>
      </div>
      <div className="rotation-note">
        {banner === "limited"
          ? `次回登場：${rotation.next.name}（14日ごとに更新）`
          : banner === "standard"
            ? `${standardPool.length}体の常設キャラクター`
            : `対象は7日ごとに入れ替わります`}
      </div>
      <div className="pity-line">
        <span>SSR確定まで</span>
        <strong>{80 - pity}回</strong>
        <i>
          <b style={{ width: `${(pity / 80) * 100}%` }} />
        </i>
      </div>
      <div className="summon-actions">
        <button
          type="button"
          onClick={() => summon(1)}
          disabled={profile.gems < 300 || summoning}
        >
          <span>1回召喚</span>
          <strong>
            <Gem size={16} />
            300
          </strong>
        </button>
        <button
          className="ten-pull"
          type="button"
          onClick={() => summon(10)}
          disabled={profile.gems < 3000 || summoning}
        >
          <small>SR以上1体確定</small>
          <span>10回召喚</span>
          <strong>
            <Gem size={16} />
            3,000
          </strong>
        </button>
      </div>
      <p className="rates">SSR 2%　SR 17%　R 81%　　重複：R 1 / SR 5 / SSR 15 魂片</p>
      <button
        className="rate-detail-button"
        type="button"
        onClick={() => setShowRates(true)}
      >
        キャラ一覧・個別排出率を見る <ChevronRight size={15} />
      </button>
      {showRates && (
        <div
          className="rate-sheet"
          role="dialog"
          aria-modal="true"
          aria-label="召喚キャラ一覧と排出率"
        >
          <div className="rate-sheet-head">
            <div>
              <small>{bannerTitle}</small>
              <strong>キャラ一覧・排出率</strong>
            </div>
            <button type="button" onClick={() => setShowRates(false)}>
              閉じる
            </button>
          </div>
          <div className="rate-summary">
            <b>SSR 2.000%</b>
            <b>SR 17.000%</b>
            <b>R 81.000%</b>
          </div>
          <div className="rate-list">
            {pool.map((unit) => {
              const owned = profile.owned.includes(unit.id);
              return (
                <article key={unit.id}>
                  <img
                    loading="lazy"
                    decoding="async"
                    src={unit.image}
                    alt={owned ? unit.name : "未入手キャラクター"}
                  />
                  <span>
                    <strong>{owned ? unit.name : "？？？？"}</strong>
                    <small>
                      {owned
                        ? `${unit.rarity}・${unit.element}・${unit.types?.join("・") ?? "不明"}`
                        : `${unit.rarity}・未入手`}
                    </small>
                  </span>
                  <b>{unitRate(unit).toFixed(3)}%</b>
                </article>
              );
            })}
          </div>
          <p>
            ※未入手キャラは見た目・レアリティ・排出率のみ表示。10連の10枠目はSR以上確定。限定SSRはSSR抽選時50%（全体1%）でピックアップされ、通常SSRより基礎性能が高くなります。重複はRなら魂片1個、SRなら5個、SSRなら15個へ変換。EX・ダンジョンドロップキャラは排出されません。
          </p>
        </div>
      )}
      {summoning && (
        <div className="summon-overlay">
          <Gem />
          <strong>レリックゲート解放中…</strong>
        </div>
      )}
      {results.length > 0 && (
        <div className="summon-results">
          <div className="results-heading">
            <span>召喚結果</span>
            <button type="button" onClick={closeResults}>
              閉じる
            </button>
          </div>
          <div>
            {results.map((character, index) => (
              <article
                key={`${character.id}-${index}`}
                className={`rarity-${character.rarity.toLowerCase()}`}
              >
                {character.image ? (
                  <img src={character.image} alt="" />
                ) : (
                  <span
                    style={
                      { "--unit-color": character.color } as React.CSSProperties
                    }
                  >
                    {character.name.slice(0, 1)}
                  </span>
                )}
                <b>{character.rarity}</b>
                <strong>{character.name}</strong>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
