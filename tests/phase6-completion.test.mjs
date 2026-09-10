import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

const page = await vite.ssrLoadModule("/app/page.tsx");
const materialCharacters = await vite.ssrLoadModule(
  "/app/material-characters.ts",
);

after(async () => {
  await vite.close();
});

test("BEYOND upgrades the primary skill and unlocks a second skill", () => {
  const character = {
    id: "phase6-test-unit",
    skill: "星断ち",
    skillKind: "damage",
    skillScope: "single",
  };
  const before = page.getCharacterSkills(character, 17);
  const beyond = page.getCharacterSkills(character, 18);

  assert.equal(before.length, 1);
  assert.equal(beyond.length, 2);
  assert.equal(before[0].id, beyond[0].id);
  assert.match(before[0].name, /・極$/);
  assert.match(beyond[0].name, /・超越$/);
  assert.ok(beyond[0].power > before[0].power);
  assert.ok(beyond[0].effects[0].duration > before[0].effects[0].duration);
});

test("material dungeon uses the requested final difficulty name", () => {
  assert.equal(page.MATERIAL_DIFFICULTIES.length, 4);
  assert.equal(page.MATERIAL_DIFFICULTIES[3].label, "実りの大地");
});

test("both material resources are image-backed catalog characters", async () => {
  const definitions = materialCharacters.MATERIAL_CHARACTERS;
  assert.equal(definitions.length, 2);
  assert.deepEqual(
    new Set(definitions.map((character) => character.profileKey)),
    new Set(["evolutionMaterialCharacters", "skillMaterialCharacters"]),
  );

  for (const character of definitions) {
    assert.ok(character.name);
    assert.ok(character.description);
    assert.ok(character.acquisition);
    assert.ok(character.usage);
    assert.match(character.image, /^\/assets\/material-characters\/.+\.webp$/);
    const bytes = await readFile(`${root}/public${character.image}`);
    assert.ok(bytes.length > 10_000);
    assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF");
  }
});

test("evolution has an independent route and enemy intent stays long-press only", async () => {
  const source = await readFile(`${root}/app/page.tsx`, "utf8");
  assert.match(source, /view === "evolution"/);
  assert.match(source, /setView\("evolution"\)\}>進化/);
  assert.match(source, /className="enemy-scan-hint"/);
  assert.doesNotMatch(source, /className="enemy-intent"/);
  assert.match(source, /const rules = \[`次の行動：\$\{enemy\.intent\}`\]/);
});
