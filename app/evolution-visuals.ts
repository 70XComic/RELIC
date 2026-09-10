export const EVOLUTION_12_VISUAL_STAGE = 12;
export const EVOLUTION_12_MOTION_FRAME_COUNT = 6;

export type EvolutionVisualRarity = "R" | "SR" | "SSR" | "EX";

export type Evolution12MotionFrames = readonly [
  string,
  string,
  string,
  string,
  string,
  string,
];

export type Evolution12VisualAssets = {
  portrait: string;
  motionFrames: Evolution12MotionFrames;
};

export type Evolution12VisualOverride = Partial<Evolution12VisualAssets>;
export type Evolution12VisualOverrideMap = Readonly<
  Record<string, Evolution12VisualOverride>
>;

export type EvolutionVisualCharacter = {
  id: string;
  rarity: EvolutionVisualRarity;
  image: string;
  actionImage: string;
  motionSheet?: string;
  motionFrames?: string[];
};

/**
 * Registry for exceptional/legacy evolution artwork paths.
 *
 * Generated assets use the default path convention. Exceptional legacy paths
 * can be mapped here without changing the resolver or character definitions.
 */
export const EVOLUTION_12_VISUAL_OVERRIDES: Evolution12VisualOverrideMap =
  Object.freeze({});

function getSafeCharacterId(characterId: string): string {
  const id = characterId.trim();
  if (!/^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/i.test(id)) {
    throw new Error(`Invalid evolution visual character ID: ${characterId}`);
  }
  return id;
}

function isSixFrameMotion(
  frames: readonly string[],
): frames is Evolution12MotionFrames {
  return (
    frames.length === EVOLUTION_12_MOTION_FRAME_COUNT &&
    frames.every((frame) => typeof frame === "string" && frame.length > 0)
  );
}

/** Returns stable, filesystem-independent paths for future evolution assets. */
export function getDefaultEvolution12VisualAssets(
  characterId: string,
): Evolution12VisualAssets {
  const id = getSafeCharacterId(characterId);
  const root = `/assets/evolution-12/${id}`;
  return {
    portrait: `${root}/portrait.webp`,
    motionFrames: Array.from(
      { length: EVOLUTION_12_MOTION_FRAME_COUNT },
      (_, index) => `${root}/frame-${index + 1}.webp`,
    ) as unknown as Evolution12MotionFrames,
  };
}

/**
 * Resolves generated paths, optionally replacing them with known legacy paths.
 * This function does not inspect the filesystem and is safe to use in tests.
 */
export function getEvolution12VisualAssets(
  characterId: string,
  overrides: Evolution12VisualOverrideMap = EVOLUTION_12_VISUAL_OVERRIDES,
): Evolution12VisualAssets {
  const id = getSafeCharacterId(characterId);
  const fallback = getDefaultEvolution12VisualAssets(id);
  const override = overrides[id];
  const motionFrames = override?.motionFrames ?? fallback.motionFrames;

  if (!isSixFrameMotion(motionFrames)) {
    throw new Error(`Evolution visual for ${id} must contain exactly six frames`);
  }

  return {
    portrait: override?.portrait || fallback.portrait,
    motionFrames: [...motionFrames] as unknown as Evolution12MotionFrames,
  };
}

export function shouldUseEvolution12Visual(
  rarity: EvolutionVisualRarity,
  evolution: number,
): boolean {
  return (
    (rarity === "SSR" || rarity === "EX") &&
    Number.isFinite(evolution) &&
    evolution >= EVOLUTION_12_VISUAL_STAGE
  );
}

/**
 * Switches an eligible character to its evolution-12 portrait and six-frame
 * attack motion. Ineligible characters are returned by reference unchanged.
 */
export function resolveEvolutionVisual<T extends EvolutionVisualCharacter>(
  character: T,
  evolution: number,
  overrides: Evolution12VisualOverrideMap = EVOLUTION_12_VISUAL_OVERRIDES,
): T {
  if (!shouldUseEvolution12Visual(character.rarity, evolution)) {
    return character;
  }

  const assets = getEvolution12VisualAssets(character.id, overrides);
  return {
    ...character,
    image: assets.portrait,
    actionImage: assets.motionFrames[0],
    motionSheet: undefined,
    motionFrames: [...assets.motionFrames],
  };
}

export const EVOLUTION_12_CHARACTER_IDS = [
  "ex-swamp",
  "ex-leopard",
  "ex-fox",
  "white-dragon-saint",
  "void",
  "deatharc",
  "umbrella-flare",
  "suzunone",
  "captain-nemo",
  "inferno-dragonia",
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
] as const;

export const PHASE4_EVOLUTION_VISUALS = Object.freeze(
  Object.fromEntries(
    EVOLUTION_12_CHARACTER_IDS.map((characterId) => {
      const visual = getEvolution12VisualAssets(characterId);
      return [
        characterId,
        Object.freeze({
          image: visual.portrait,
          portrait: visual.portrait,
          motionFrames: Object.freeze([...visual.motionFrames]),
        }),
      ];
    }),
  ),
) as Readonly<
  Record<
    (typeof EVOLUTION_12_CHARACTER_IDS)[number],
    Evolution12VisualAssets & { image: string }
  >
>;
