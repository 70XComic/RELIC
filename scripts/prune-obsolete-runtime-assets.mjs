// Exclude reviewed, superseded artwork from deployment; keep source originals.
// Validate actual character, encounter and animation paths before removing files.
import assert from "node:assert/strict";
import { access, readFile, readdir, stat, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
const exclusions = JSON.parse(await readFile(new URL("./obsolete-runtime-assets.json", import.meta.url), "utf8"));
assert.ok(exclusions.every((name) => /^[a-z0-9-]+\.(webp|jpg)$/.test(name)));
const excludedPaths = new Set(exclusions.map((name) => `/assets/${name}`));
const required = new Set();
const seen = new WeakSet();
function collect(value) {
  if (typeof value === "string" && value.startsWith("/assets/")) required.add(value.split("?")[0]);
  else if (value && typeof value === "object" && !seen.has(value)) {
    seen.add(value);
    for (const item of Object.values(value)) collect(item);
  }
}

const vite = await createServer({
  appType: "custom", configFile: false, root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false },
  plugins: [{ name: "deployment-asset-catalog", transform(source, id) {
    if (id.endsWith("/app/page.tsx")) return source + "\nexport const __deploymentAssets = { ROSTER, ALL_STAGES, OPENING_VIDEO, OPENING_POSTER, OPENING_TITLE_IMAGE };";
  } }],
});
try {
  const game = await vite.ssrLoadModule("/app/page.tsx");
  const { ROSTER, ALL_STAGES } = game.__deploymentAssets;
  collect(game.__deploymentAssets);
  for (const stage of ALL_STAGES)
    for (let floor = 1; floor <= stage.enemies.length; floor++) collect(game.getWaveEnemies(stage, floor));
  for (const unit of ROSTER.filter((unit) => unit.rarity === "EX")) collect(game.getExCutinImage(unit.id));
  const evolution = await vite.ssrLoadModule("/app/evolution-visuals.ts");
  for (const id of evolution.EVOLUTION_12_CHARACTER_IDS) collect(evolution.getEvolution12VisualAssets(id));
  collect(await vite.ssrLoadModule("/app/random-appearance.ts"));
  collect(await vite.ssrLoadModule("/app/material-characters.ts"));
} finally {
  await vite.close();
}

// Explicit source references are also protected if a future menu reuses an old
// asset outside the battle catalogs. Dynamic catalog paths are checked above.
async function inspectSource(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await inspectSource(path);
    else if (/\.(tsx?|css|js|json)$/.test(entry.name)) {
      const source = await readFile(path, "utf8");
      for (const name of exclusions)
        assert.ok(!source.includes(name), `An excluded asset is referenced by ${path}: ${name}`);
    }
  }
}
for (const directory of ["app", "components", "lib"]) await inspectSource(`${root}${directory}`);
for (const path of required) {
  assert.ok(!excludedPaths.has(path), `An excluded asset is used by the live catalog: ${path}`);
  await access(`${root}dist/client${path}`);
}

let bytes = 0;
let removed = 0;
for (const path of excludedPaths) {
  const target = `${root}dist/client${path}`;
  try {
    bytes += (await stat(target)).size;
    await unlink(target);
    removed++;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
console.log(`Deployment assets: ${required.size} required paths verified; ${removed} obsolete files excluded (${bytes} bytes).`);
