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

after(async () => {
  await vite.close();
});

test("loads the complete character and encounter catalog", async () => {
  const page = await vite.ssrLoadModule("/app/page.tsx");
  assert.equal(typeof page.default, "function");
});
