export type Phase4Rarity = "R" | "SR" | "SSR" | "EX";
export type Phase4Element = "火" | "水" | "木" | "光" | "闇" | "確認不可";
export type Phase4UnitType =
  | "人間"
  | "獣"
  | "龍"
  | "機械"
  | "魔族"
  | "天使"
  | "精霊"
  | "不明";

export type Phase4Character = {
  id: string;
  name: string;
  role: string;
  element: Phase4Element;
  rarity: Phase4Rarity;
  image: string;
  actionImage: string;
  color: string;
  skill: string;
  skillKind: "damage" | "heal" | "guard";
  attackScope?: "single" | "all";
  skillScope?: "single" | "all";
  source: "gacha" | "dungeon" | "reward";
  lore: string;
  types: Phase4UnitType[];
  baseStats: { hp: number; atk: number; def: number; spd: number; crit: number };
};

const portrait = (id: string) => `/assets/phase4/characters/${id}.webp`;
const action = (id: string, elite = false) =>
  elite ? `/assets/motion-frames/${id}/frame-1.webp` : portrait(id);

export const PHASE4_CHARACTERS: Phase4Character[] = [
  {
    id: "p4-tio", name: "歯車剣士ティオ", role: "時計街の巡回剣士", element: "光", rarity: "R",
    image: portrait("p4-tio"), actionImage: action("p4-tio"), color: "#d6ae58", skill: "ギア・スラッシュ",
    skillKind: "damage", source: "dungeon", lore: "壊れた大時計を直すため、歯車剣を携えて雨の時計街を巡る剣士。", types: ["人間", "機械"],
    baseStats: { hp: 124, atk: 27, def: 20, spd: 28, crit: 8 },
  },
  {
    id: "p4-lapin", name: "秒針兎ラパン", role: "時跳ねの斥候", element: "木", rarity: "R",
    image: portrait("p4-lapin"), actionImage: action("p4-lapin"), color: "#6cc987", skill: "セコンド・ステップ",
    skillKind: "damage", source: "dungeon", lore: "秒針のような細剣で刻を測り、一瞬の隙を逃さない時計兎。", types: ["獣"],
    baseStats: { hp: 112, atk: 24, def: 17, spd: 38, crit: 13 },
  },
  {
    id: "p4-bolt", name: "蒸気衛兵ボルト", role: "鋼圧の門番", element: "火", rarity: "R",
    image: portrait("p4-bolt"), actionImage: action("p4-bolt"), color: "#d97945", skill: "スチーム・バルク",
    skillKind: "guard", source: "dungeon", lore: "旧市街の門を守り続ける、蒸気炉心と大盾を備えた機械衛兵。", types: ["機械"],
    baseStats: { hp: 158, atk: 21, def: 31, spd: 15, crit: 5 },
  },
  {
    id: "p4-nejika", name: "巻鍵術師ネジカ", role: "記憶を巻き戻す魔術師", element: "闇", rarity: "R",
    image: portrait("p4-nejika"), actionImage: action("p4-nejika"), color: "#9c72d6", skill: "リワインド・ルーン",
    skillKind: "heal", source: "dungeon", lore: "背負った巻鍵で傷ついた時間を少しだけ巻き戻す若き術師。", types: ["人間"],
    baseStats: { hp: 117, atk: 22, def: 18, spd: 30, crit: 7 },
  },
  {
    id: "p4-clockle", name: "夜鐘梟クロックル", role: "真夜中の鐘守", element: "水", rarity: "R",
    image: portrait("p4-clockle"), actionImage: action("p4-clockle"), color: "#5ba5c8", skill: "ミッドナイト・ベル",
    skillKind: "damage", skillScope: "all", source: "dungeon", lore: "鐘楼の最上部から時計街を見守り、翼の鐘で侵入者を退ける梟。", types: ["獣"],
    baseStats: { hp: 128, atk: 25, def: 21, spd: 31, crit: 10 },
  },
  {
    id: "p4-arlequin", name: "仮面剣士アルルカン", role: "舞台裏の決闘者", element: "火", rarity: "SR",
    image: portrait("p4-arlequin"), actionImage: action("p4-arlequin"), color: "#d74a57", skill: "マスカレード・リポスト",
    skillKind: "damage", source: "dungeon", lore: "笑いの仮面と細剣で、喝采の瞬間にだけ本気を見せる孤高の決闘者。", types: ["人間"],
    baseStats: { hp: 151, atk: 34, def: 23, spd: 35, crit: 17 },
  },
  {
    id: "p4-lyra", name: "星幕歌姫リラ", role: "星明かりの歌姫", element: "光", rarity: "SR",
    image: portrait("p4-lyra"), actionImage: action("p4-lyra"), color: "#e7c96b", skill: "ステラ・カンタータ",
    skillKind: "heal", skillScope: "all", source: "dungeon", lore: "星を織り込んだ幕の下、傷も恐れもほどく歌を響かせる歌姫。", types: ["人間"],
    baseStats: { hp: 163, atk: 27, def: 25, spd: 30, crit: 9 },
  },
  {
    id: "p4-ariane", name: "幕裏蜘蛛アリアネ", role: "糸劇の演出家", element: "闇", rarity: "SR",
    image: portrait("p4-ariane"), actionImage: action("p4-ariane"), color: "#9d57bd", skill: "カーテン・ウェブ",
    skillKind: "damage", attackScope: "all", skillScope: "all", source: "dungeon", lore: "光の届かない幕裏で、銀糸の人形劇を操る妖艶な蜘蛛魔族。", types: ["魔族", "獣"],
    baseStats: { hp: 158, atk: 32, def: 26, spd: 27, crit: 12 },
  },
  {
    id: "p4-neun", name: "双子道化ノイン", role: "一身二声の道化", element: "水", rarity: "SR",
    image: portrait("p4-neun"), actionImage: action("p4-neun"), color: "#56a8d0", skill: "デュアル・アンコール",
    skillKind: "damage", source: "dungeon", lore: "二つの人格と二振りの曲刀で、同じ演目を決して繰り返さない道化師。", types: ["人間", "魔族"],
    baseStats: { hp: 149, atk: 35, def: 21, spd: 37, crit: 16 },
  },
  {
    id: "p4-somnia", name: "夢灯奏者ソムニア", role: "眠りを照らす奏者", element: "木", rarity: "SR",
    image: portrait("p4-somnia"), actionImage: action("p4-somnia"), color: "#65c293", skill: "ルーセント・ノクターン",
    skillKind: "guard", skillScope: "all", source: "dungeon", lore: "夢灯を吊るした竪琴で悪夢を鎮め、観客を朝へ導く旅の奏者。", types: ["人間", "精霊"],
    baseStats: { hp: 177, atk: 26, def: 32, spd: 25, crit: 8 },
  },
  {
    id: "p4-regulus", name: "断刻騎士レグルス", role: "時を断つ銀騎士", element: "光", rarity: "SSR",
    image: portrait("p4-regulus"), actionImage: action("p4-regulus", true), color: "#e8c86d", skill: "クロノ・セヴァランス",
    skillKind: "damage", source: "gacha", lore: "金の文字盤眼と分針の大剣で、定められた未来そのものを断ち切る騎士。", types: ["人間"],
    baseStats: { hp: 214, atk: 47, def: 35, spd: 39, crit: 23 },
  },
  {
    id: "p4-revelle", name: "夢断ちの剣姫リヴェル", role: "醒夢の剣姫", element: "闇", rarity: "SSR",
    image: portrait("p4-revelle"), actionImage: action("p4-revelle", true), color: "#d75473", skill: "ルナ・ディスイリュージョン",
    skillKind: "damage", attackScope: "all", skillScope: "all", source: "gacha", lore: "砕けた仮面を腰に結び、三日月の大剣で終わらない夢を断つ剣姫。", types: ["人間", "魔族"],
    baseStats: { hp: 198, atk: 50, def: 30, spd: 43, crit: 27 },
  },
  {
    id: "p4-aion", name: "終刻機神：A.I.O.N.", role: "零時を宣告する機神", element: "光", rarity: "EX",
    image: portrait("p4-aion"), actionImage: action("p4-aion", true), color: "#6ee9f4", skill: "ワールド・ゼロクロック",
    skillKind: "damage", attackScope: "all", skillScope: "all", source: "reward", lore: "顔を持たず、歯車翼と長短二振りの時計針で世界の終刻を裁定する機神。", types: ["機械", "不明"],
    baseStats: { hp: 286, atk: 60, def: 49, spd: 50, crit: 28 },
  },
  {
    id: "p4-masquerade", name: "無貌劇神：M.A.S.Q.U.E.R.A.D.E.", role: "終幕を演じる劇神", element: "闇", rarity: "EX",
    image: portrait("p4-masquerade"), actionImage: action("p4-masquerade", true), color: "#b95ccf", skill: "ラスト・カーテンコール",
    skillKind: "damage", attackScope: "all", skillScope: "all", source: "reward", lore: "黒い虚空の貌と四つの割れた仮面を従え、存在そのものを終幕へ導く劇神。", types: ["魔族", "不明"],
    baseStats: { hp: 268, atk: 64, def: 42, spd: 55, crit: 31 },
  },
];

export type Phase4Enemy = {
  id?: string;
  characterId?: string;
  name: string;
  maxHp: number;
  image: string;
  intent: string;
  atk?: number;
  def?: number;
  spd?: number;
  element?: Phase4Element;
  isBoss?: boolean;
};

export type Phase4Dungeon = {
  id: string;
  chapter: number;
  number: number;
  area: string;
  title: string;
  background: string;
  atmosphere: string;
  recommended: number;
  scale: number;
  rule: string;
  gems: number;
  gold: number;
  enemies: Phase4Enemy[];
  kind: "event";
  difficultyLabel: "中級" | "上級" | "無級";
  playerXpReward: number;
  unlockLevel?: number;
  trainingCrystalReward: number;
  evoStoneReward: number;
  dropCharacterId?: string;
  dropRate?: number;
  dropCharacterPoolIds?: string[];
  firstClearRewardCharacterId?: string;
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

const enemyImage = (id: string) => `/assets/phase4/enemies/${id}.webp`;
const playableEnemy = (id: string, name: string, maxHp: number, intent: string, element: Phase4Element, isBoss = false, spd?: number): Phase4Enemy => ({
  characterId: id,
  name,
  maxHp,
  image: portrait(id),
  intent,
  element,
  isBoss,
  spd,
});
const newEnemy = (id: string, name: string, maxHp: number, intent: string, element: Phase4Element): Phase4Enemy => ({
  id,
  name,
  maxHp,
  image: enemyImage(id),
  intent,
  element,
});

const CHRONO_VOID_ENEMIES: Phase4Enemy[] = [
  newEnemy("p4-e-tick", "欠秒兵ティック", 8000, "欠けた秒針で連撃", "光"),
  newEnemy("p4-e-tock", "逆鐘兵トック", 9500, "逆回転の鐘撃", "闇"),
  newEnemy("p4-e-spring", "暴発ぜんまい", 11000, "圧縮ばねを解放", "火"),
  newEnemy("p4-e-lagless", "無遅延の猟犬", 12500, "最速の噛砕", "木"),
  newEnemy("p4-e-retro", "回帰する人形", 14000, "受けた傷を反転", "水"),
  newEnemy("p4-e-midnight", "零時鐘の巨像", 16000, "十二鐘の衝撃", "闇"),
  newEnemy("p4-e-cage", "時牢監視機", 18000, "行動を時牢へ封鎖", "光"),
  playableEnemy("p4-aion", "終刻機神：A.I.O.N.", 24000, "世界停止を演算", "光", true, 31),
];

const THEATER_VOID_ENEMIES: Phase4Enemy[] = [
  newEnemy("p4-e-sleepling", "微睡む観客", 9000, "眠気を伝播", "水"),
  newEnemy("p4-e-grin", "嗤笑の仮面", 10500, "笑声で防御を砕く", "闇"),
  newEnemy("p4-e-sob", "慟哭の仮面", 12000, "涙刃を降らせる", "水"),
  newEnemy("p4-e-arachnem", "舞台蜘蛛アラクネム", 13500, "幕糸で拘束", "木"),
  newEnemy("p4-e-headless", "首無し主演騎士", 15000, "台本通りの斬撃", "火"),
  newEnemy("p4-e-applause", "喝采する百手", 16500, "百の拍手で圧殺", "光"),
  newEnemy("p4-e-serenade", "忘却セレナーデ", 18000, "記憶を歌い消す", "闇"),
  newEnemy("p4-e-bakurem", "奈落獣バクレム", 20000, "舞台床ごと捕食", "闇"),
  newEnemy("p4-e-proscenia", "虚月舞台プロセニア", 22000, "舞台空間を反転", "光"),
  playableEnemy("p4-masquerade", "無貌劇神：M.A.S.Q.U.E.R.A.D.E.", 24000, "最後の幕を下ろす", "闇", true, 31),
];

export const PHASE4_VOID_DUNGEONS: Phase4Dungeon[] = [
  {
    id: "P4-V-CHRONO", chapter: 91, number: 1, area: "終刻機関クロノポリス", title: "停止世界・零時審判",
    background: "/assets/phase4/backgrounds/chronopolis-void.webp", atmosphere: "#04151fcc", recommended: 220, scale: 2.7,
    rule: "全8階。速度順へ敵が割り込み、15ターン目に防御不能の終刻攻撃。", gems: 480, gold: 18000,
    enemies: CHRONO_VOID_ENEMIES, kind: "event", difficultyLabel: "無級", playerXpReward: 5200,
    trainingCrystalReward: 180, evoStoneReward: 55, unlockLevel: 80, dropCharacterId: "p4-aion", dropRate: 0.8, singleEnemyWaves: true,
    reusesExistingBosses: false, enemyAttackMultiplier: 1.32, enemyDefenseMultiplier: 1.22, enemySpeedMultiplier: 4.2,
    gimmick: { name: "終刻圧", appliesToAllEnemies: true, doomTurn: 15, description: "15ターン目に防御できない終刻攻撃が発動する。" },
  },
  {
    id: "P4-V-THEATER", chapter: 92, number: 1, area: "無貌劇場パンデモニウム", title: "幕なき最終夜",
    background: "/assets/phase4/backgrounds/dream-theater-void.webp", atmosphere: "#1b061dcc", recommended: 225, scale: 2.85,
    rule: "全10階。HP30%以下の敵は演目を反転し、攻撃力が2倍。", gems: 520, gold: 22000,
    enemies: THEATER_VOID_ENEMIES, kind: "event", difficultyLabel: "無級", playerXpReward: 6000,
    trainingCrystalReward: 220, evoStoneReward: 70, unlockLevel: 90, dropCharacterId: "p4-masquerade", dropRate: 0.8, singleEnemyWaves: true,
    reusesExistingBosses: false, enemyAttackMultiplier: 1.36, enemyDefenseMultiplier: 1.25, enemySpeedMultiplier: 4,
    gimmick: { name: "反転演目", appliesToAllEnemies: true, hpThreshold: 0.3, damageMultiplier: 2, description: "敵HPが30%以下になると攻撃ダメージが2倍になる。" },
  },
];

export const PHASE4_EVENT_DUNGEONS: Phase4Dungeon[] = [
  {
    id: "P4-E-GEAR", chapter: 93, number: 1, area: "歯車都市クロノポリス", title: "雨鐘のギアストリート",
    background: "/assets/phase4/backgrounds/chronopolis-event.webp", atmosphere: "#0b2637aa", recommended: 46, scale: 1.08,
    rule: "全5階。時計街の住人が速度順に一体ずつ登場。", gems: 90, gold: 2400,
    enemies: [
      playableEnemy("p4-tio", "歯車剣士ティオ", 1850, "歯車剣で攻撃", "光"),
      playableEnemy("p4-lapin", "秒針兎ラパン", 2050, "素早く斬り込む", "木"),
      playableEnemy("p4-bolt", "蒸気衛兵ボルト", 2450, "大盾で防御", "火"),
      playableEnemy("p4-nejika", "巻鍵術師ネジカ", 2680, "時間を巻き戻す", "闇"),
      playableEnemy("p4-clockle", "夜鐘梟クロックル", 3300, "夜鐘を鳴らす", "水", true),
    ],
    kind: "event", difficultyLabel: "中級", playerXpReward: 720, trainingCrystalReward: 18, evoStoneReward: 6,
    dropRate: 0.01, dropCharacterPoolIds: ["p4-tio", "p4-lapin", "p4-bolt", "p4-nejika", "p4-clockle"],
    singleEnemyWaves: true, reusesExistingBosses: false,
  },
  {
    id: "P4-E-DREAM", chapter: 94, number: 1, area: "夢蝕劇場ソムニア", title: "星幕の仮面祭",
    background: "/assets/phase4/backgrounds/dream-theater-event.webp", atmosphere: "#1a163faa", recommended: 92, scale: 1.36,
    rule: "全5階。敵の攻撃と速度が8%上昇。", gems: 140, gold: 4600,
    enemies: [
      playableEnemy("p4-arlequin", "仮面剣士アルルカン", 4800, "仮面の細剣で反撃", "火"),
      playableEnemy("p4-lyra", "星幕歌姫リラ", 5200, "星歌で立て直す", "光"),
      playableEnemy("p4-ariane", "幕裏蜘蛛アリアネ", 5700, "銀糸で拘束", "闇"),
      playableEnemy("p4-neun", "双子道化ノイン", 6250, "二連曲刀で攻撃", "水"),
      playableEnemy("p4-somnia", "夢灯奏者ソムニア", 7600, "夢灯をかき鳴らす", "木", true),
    ],
    kind: "event", difficultyLabel: "上級", playerXpReward: 1320, trainingCrystalReward: 34, evoStoneReward: 11,
    dropRate: 0.03, dropCharacterPoolIds: ["p4-arlequin", "p4-lyra", "p4-ariane", "p4-neun", "p4-somnia"],
    singleEnemyWaves: true, reusesExistingBosses: false, enemyAttackMultiplier: 1.08, enemySpeedMultiplier: 1.08,
  },
];

export const PHASE4_NEW_ENEMY_IDS = [
  "p4-e-tick", "p4-e-tock", "p4-e-spring", "p4-e-lagless", "p4-e-retro", "p4-e-midnight", "p4-e-cage", "p4-aion",
  "p4-e-sleepling", "p4-e-grin", "p4-e-sob", "p4-e-arachnem", "p4-e-headless", "p4-e-applause", "p4-e-serenade", "p4-e-bakurem", "p4-e-proscenia", "p4-masquerade",
] as const;
