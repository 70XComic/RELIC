export type MaterialCharacterProfileKey =
  | "evolutionMaterialCharacters"
  | "skillMaterialCharacters";

export type MaterialCharacter = {
  id: string;
  name: string;
  title: string;
  image: string;
  color: string;
  profileKey: MaterialCharacterProfileKey;
  description: string;
  acquisition: string;
  usage: string;
};

export const MATERIAL_CHARACTERS: readonly MaterialCharacter[] = [
  {
    id: "metamorphosis-fairy",
    name: "変化の幼精",
    title: "進化素材キャラ",
    image: "/assets/material-characters/metamorphosis-fairy.webp",
    color: "#83e0b5",
    profileKey: "evolutionMaterialCharacters",
    description: "仲間の可能性を次の姿へ導く、結晶羽の小さな精霊。",
    acquisition: "変化の聖域で、倒した魔物から獲得",
    usage: "12進化で5体使用",
  },
  {
    id: "skill-mentor",
    name: "技継ぎの導師",
    title: "スキル素材キャラ",
    image: "/assets/material-characters/skill-mentor.webp",
    color: "#67dcea",
    profileKey: "skillMaterialCharacters",
    description: "古い術式を読み解き、仲間へ技の極意を継ぐ導師。",
    acquisition: "継技の書庫で、倒した魔物から獲得",
    usage: "スキルLv強化で1・2・4・8・16体使用",
  },
] as const;

export const MATERIAL_CHARACTER_BY_PROFILE_KEY = new Map(
  MATERIAL_CHARACTERS.map((character) => [character.profileKey, character]),
);
