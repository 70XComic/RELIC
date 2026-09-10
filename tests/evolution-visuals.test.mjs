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

const visuals = await vite.ssrLoadModule("/app/evolution-visuals.ts");

after(async () => {
  await vite.close();
});

const character = (rarity, id = "test-hero") => ({
  id,
  rarity,
  image: `/assets/${id}.webp`,
  actionImage: `/assets/${id}-action.webp`,
  motionSheet: `/assets/motion/${id}.webp`,
  motionFrames: [`/assets/motion-frames/${id}/frame-1.webp`],
  name: "テストキャラ",
});

test("generates stable portrait and six-frame evolution paths from an ID", () => {
  const assets = visuals.getDefaultEvolution12VisualAssets("ex-swamp");
  assert.equal(
    assets.portrait,
    "/assets/evolution-12/ex-swamp/portrait.webp",
  );
  assert.deepEqual(
    assets.motionFrames,
    Array.from(
      { length: 6 },
      (_, index) => `/assets/evolution-12/ex-swamp/frame-${index + 1}.webp`,
    ),
  );
});

test("rejects unsafe IDs instead of producing traversal paths", () => {
  assert.throws(
    () => visuals.getDefaultEvolution12VisualAssets("../ex-swamp"),
    /Invalid evolution visual character ID/,
  );
  assert.throws(
    () => visuals.getDefaultEvolution12VisualAssets(""),
    /Invalid evolution visual character ID/,
  );
});

test("SSR and EX unlock the transformed visual at evolution 12", () => {
  for (const rarity of ["SSR", "EX"]) {
    assert.equal(visuals.shouldUseEvolution12Visual(rarity, 11), false);
    assert.equal(visuals.shouldUseEvolution12Visual(rarity, 12), true);
    assert.equal(visuals.shouldUseEvolution12Visual(rarity, 20), true);
  }
});

test("R and SR never switch to the evolution-12 visual", () => {
  for (const rarity of ["R", "SR"]) {
    assert.equal(visuals.shouldUseEvolution12Visual(rarity, 11), false);
    assert.equal(visuals.shouldUseEvolution12Visual(rarity, 12), false);
    assert.equal(visuals.shouldUseEvolution12Visual(rarity, 999), false);
  }
});

test("ineligible characters preserve their original object and asset paths", () => {
  const belowStage = character("SSR");
  const lowRarity = character("SR");
  assert.strictEqual(
    visuals.resolveEvolutionVisual(belowStage, 11),
    belowStage,
  );
  assert.strictEqual(visuals.resolveEvolutionVisual(lowRarity, 20), lowRarity);
});

test("eligible characters switch portrait, action image, and all six frames", () => {
  const original = character("EX", "ex-fox");
  const resolved = visuals.resolveEvolutionVisual(original, 12);

  assert.notStrictEqual(resolved, original);
  assert.equal(
    resolved.image,
    "/assets/evolution-12/ex-fox/portrait.webp",
  );
  assert.equal(
    resolved.actionImage,
    "/assets/evolution-12/ex-fox/frame-1.webp",
  );
  assert.equal(resolved.motionSheet, undefined);
  assert.equal(resolved.motionFrames.length, 6);
  assert.equal(
    resolved.motionFrames[5],
    "/assets/evolution-12/ex-fox/frame-6.webp",
  );
  assert.equal(original.image, "/assets/ex-fox.webp");
  assert.deepEqual(original.motionFrames, [
    "/assets/motion-frames/ex-fox/frame-1.webp",
  ]);
});

test("exception mappings can reuse existing portraits and motion frames", () => {
  const legacyFrames = Array.from(
    { length: 6 },
    (_, index) => `/assets/legacy-hero-motion-${index + 1}.webp`,
  );
  const overrides = {
    "legacy-hero": {
      portrait: "/assets/legacy-hero-evolved.webp",
      motionFrames: legacyFrames,
    },
  };
  const resolved = visuals.resolveEvolutionVisual(
    character("SSR", "legacy-hero"),
    12,
    overrides,
  );

  assert.equal(resolved.image, "/assets/legacy-hero-evolved.webp");
  assert.equal(resolved.actionImage, legacyFrames[0]);
  assert.deepEqual(resolved.motionFrames, legacyFrames);
  assert.notStrictEqual(resolved.motionFrames, legacyFrames);
});

test("invalid exception mappings cannot create partial motion sequences", () => {
  assert.throws(
    () =>
      visuals.getEvolution12VisualAssets("broken-hero", {
        "broken-hero": {
          motionFrames: ["one.webp", "two.webp"],
        },
      }),
    /exactly six frames/,
  );
});
