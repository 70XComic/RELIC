import assert from "node:assert/strict";
import test, { after } from "node:test";
import { readFileSync } from "node:fs";
import { createServer } from "vite";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";

const root = new URL("..", import.meta.url).pathname;
const vite = await createServer({
  appType: "custom", configFile: false, root, resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false },
  plugins: [{ name: "prior-instructions", transform(source, id) {
    if (id.endsWith("/app/page.tsx")) return source + "\nexport { ROSTER, ALL_STAGES, CHARACTER_ELEMENTS, inferCharacterTypes, normalizeElement, getStage, getEnemyElement, normalizeProfileCharacters, INITIAL_PROFILE, EventView };";
  } }],
});
const page = await vite.ssrLoadModule("/app/page.tsx");
const spriteFit = await vite.ssrLoadModule("/app/battle-sprite-fit.ts");
after(() => vite.close());

test("recognition-load is a reserved empty attribute, and deep abyss does not match deep sea", () => {
  assert.deepEqual(page.CHARACTER_ELEMENTS, ["火","水","木","光","闇","認識負荷"]);
  assert.equal(page.normalizeElement("確認不可"), "認識負荷");
  assert.equal(page.normalizeElement("深淵"), "闇");
  assert.equal(page.normalizeElement("深海"), "水");
  assert.equal(page.ROSTER.filter(c => c.element === "認識負荷").length, 0);
  for (const s of page.ALL_STAGES) {
    assert.ok(page.getStage(s.id).enemies.every(e => e.element !== "認識負荷"), s.id);
  }
});

test("type inference matches complete words instead of individual katakana and role characters", () => {
  for (const [name,role,expected] of [
    ["キャプテン・ネモ","深海探検家",["人間"]],
    ["クラッカー","爆殻魔獣",["魔族","獣"]],
    ["アンブレラ・フレア","妖機剣龍",["龍","魔族"]],
    ["初級魔術師","魔術師",["人間"]],
    ["魔法のローブを着た王女","王女",["人間"]],
  ]) assert.deepEqual(page.inferCharacterTypes({name,role}),expected,name);
  const current = id => page.ROSTER.find(c => c.id === id).types;
  assert.deepEqual(current("captain-nemo"),["人間"]);
  assert.deepEqual(current("void"),["龍"]);
  assert.deepEqual(current("umbrella-flare"),["機械","龍"]);
  assert.deepEqual(current("deatharc"),["天使"]);
  assert.deepEqual(current("fritter"),["魔族"]);
});

test("correcting a type releases incompatible equipment without deleting the owned item", () => {
  const profile = structuredClone(page.INITIAL_PROFILE);
  profile.owned.push("captain-nemo");
  profile.equipmentInventory = { "machina-precision-rifle": 1 };
  profile.equippedItems = { "captain-nemo": "machina-precision-rifle" };
  const result = page.normalizeProfileCharacters(profile);
  assert.equal(result.equippedItems["captain-nemo"], undefined);
  assert.equal(result.equipmentInventory["machina-precision-rifle"], 1);
  assert.ok(result.owned.includes("captain-nemo"));
});

test("the event entry begins with four genres before any dungeon or difficulty choices", () => {
  const html = renderToStaticMarkup(React.createElement(page.EventView, { profile: page.INITIAL_PROFILE, startBattle() {} }));
  assert.match(html, /dungeon-genre-grid/);
  for (const label of ["育成ダンジョン","期間限定イベント","特別ダンジョン","強敵ダンジョン"]) assert.ok(html.includes(label),label);
  assert.doesNotMatch(html, /event-stage-card|strong-theme-card|difficulty-list/);
});

test("standing frame padding compensation is bounded and retains the alpha-backed source files", () => {
  for (const [path, scale] of Object.entries(spriteFit.BATTLE_SPRITE_SCALE)) {
    assert.ok(scale > 1 && scale <= 1.6, path);
    assert.ok(readFileSync(root + "public" + path).length > 0, path);
    assert.equal(spriteFit.getBattleSpriteScale(path + "?v=cache"), scale);
  }
  assert.equal(spriteFit.getBattleSpriteScale("/assets/unregistered.webp"), 1);
});
