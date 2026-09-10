import assert from "node:assert/strict";
import test, { after } from "node:test";
import { createServer } from "vite";

const root = new URL("..", import.meta.url).pathname;
const vite = await createServer({
  appType: "custom", configFile: false, root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false },
});
const { createLongPressGesture } = await vite.ssrLoadModule("/app/long-press.ts");
after(() => vite.close());

test("a quick tap keeps the original formation action and never opens the portrait", t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let opened = 0;
  const press = createLongPressGesture(() => opened++);
  press.start(1, 10, 10);
  t.mock.timers.tick(449);
  press.end(1);
  t.mock.timers.tick(1000);
  assert.equal(opened, 0);
  assert.equal(press.consumeClick(), false);
});

test("a held portrait opens once and suppresses the following formation click, including pointer leave", t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let opened = 0;
  const press = createLongPressGesture(() => opened++);
  press.start(1, 10, 10);
  t.mock.timers.tick(450);
  press.cancel(); // Opening the dialog can make the pointer leave the card.
  press.end(1);
  t.mock.timers.tick(1000);
  assert.equal(opened, 1);
  assert.equal(press.consumeClick(), true);
  press.start(2, 10, 10);
  press.end(2);
  assert.equal(press.consumeClick(), false);
});

test("scroll movement cancels preview and a stray release cannot change the party", t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let opened = 0;
  const press = createLongPressGesture(() => opened++);
  press.start(1, 10, 10);
  t.mock.timers.tick(200);
  press.move(1, 10, 24);
  t.mock.timers.tick(500);
  press.end(1);
  assert.equal(opened, 0);
  assert.equal(press.consumeClick(), true);
});

test("small finger movement is tolerated while cancellation and unmount clear timers", t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let opened = 0;
  const press = createLongPressGesture(() => opened++);
  press.start(1, 10, 10);
  press.move(1, 14, 14);
  t.mock.timers.tick(450);
  assert.equal(opened, 1);
  press.start(2, 10, 10);
  press.cancel();
  t.mock.timers.tick(1000);
  assert.equal(opened, 1);
});
