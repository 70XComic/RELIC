export const LUCKY_BURNS_ID = "lucky-burns";

export const LUCKY_BURNS_IMAGES = Object.freeze(
  Array.from({ length: 11 }, (_, index) =>
    `/assets/lucky-burns/skin-${String(index + 1).padStart(2, "0")}.webp`,
  ),
);

export const LUCKY_BURNS_VISUALS = Object.freeze(
  LUCKY_BURNS_IMAGES.map((portrait, index) => Object.freeze({
    portrait,
    motionFrames: Object.freeze(Array.from({ length: 6 }, (_, frameIndex) =>
      `/assets/lucky-burns/motion/skin-${String(index + 1).padStart(2, "0")}/frame-${frameIndex + 1}.webp`,
    )),
  })),
);

type AppearanceCharacter = {
  id: string;
  image: string;
  actionImage: string;
  motionFrames?: string[];
  motionSheet?: string;
};

/** The saved run ID fixes the appearance across turns, floors and reloads. */
export function getLuckyBurnsVisual(runId?: string) {
  if (!runId) return LUCKY_BURNS_VISUALS[0];
  let hash = 2166136261;
  for (const character of `${LUCKY_BURNS_ID}:${runId}`) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  }
  return LUCKY_BURNS_VISUALS[(hash >>> 0) % LUCKY_BURNS_VISUALS.length];
}

export function getLuckyBurnsImage(runId?: string): string {
  return getLuckyBurnsVisual(runId).portrait;
}

export function resolveRunAppearance<T extends AppearanceCharacter>(
  character: T,
  runId?: string,
): T {
  if (character.id !== LUCKY_BURNS_ID) return character;
  const visual = getLuckyBurnsVisual(runId);
  return {
    ...character,
    image: visual.portrait,
    actionImage: visual.motionFrames[0],
    motionFrames: [...visual.motionFrames],
    motionSheet: undefined,
  };
}
