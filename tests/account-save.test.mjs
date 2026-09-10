import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { after } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { createServer } from "vite";
const root = new URL("..", import.meta.url).pathname;
const vite = await createServer({ appType: "custom", configFile: false, root, server: { middlewareMode: true, hmr: false } });
const { AccountSaveSession, accountStoragePrefix, chooseSave } = await vite.ssrLoadModule("/app/account-save.ts");
after(() => vite.close());
const storage = () => {
  const data = new Map();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
};
const profile = (gold) => ({ userId: "adventure", gold });

test("atomic revisions reject concurrent first saves, stale updates and stale resets", async () => {
  const source = await readFile(root + "/db/game-save-store.ts", "utf8");
  const create = source.match(/CREATE_SAVE_SQL = "([^"]+)"/)[1];
  const update = source.match(/UPDATE_SAVE_SQL = "([^"]+)"/)[1];
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE game_saves (user_id TEXT PRIMARY KEY, profile_json TEXT NOT NULL, updated_at INTEGER NOT NULL)");
  assert.equal(db.prepare(create).get("alice", "first", 10).updated_at, 10);
  assert.equal(db.prepare(create).get("alice", "stale", 11), undefined);
  assert.equal(db.prepare(update).get("second", 10, "alice", 10).updated_at, 11);
  assert.equal(db.prepare(update).get("stale", 100, "alice", 10), undefined);
  assert.equal(db.prepare(update).get("wrong account", 100, "bob", 11), undefined);
  assert.equal(db.prepare(update).get("fresh reset", 11, "alice", 11).updated_at, 12);
  assert.equal(db.prepare(update).get("old progress", 100, "alice", 11), undefined);
  assert.equal(db.prepare("SELECT profile_json FROM game_saves").get().profile_json, "fresh reset");
  db.close();
});

test("account namespaces cannot overlap and newer cloud data is never merged with spent currency", () => {
  assert.equal(new Set([null, "guest", "alice", "bob"].map(accountStoragePrefix)).size, 4);
  const cloud = { accountId: "alice", profile: profile(20), updatedAt: 2 };
  const selection = chooseSave(cloud, { profile: profile(100), baseRevision: 1, dirty: true });
  assert.equal(selection.profile.gold, 20);
  assert.equal(selection.conflict.gold, 100);
  assert.equal(chooseSave(cloud, { profile: profile(100), baseRevision: 2, dirty: true }).profile.gold, 100);
});

test("overlapping saves serialize writes and acknowledge only the snapshot actually sent", async () => {
  let finishFirst;
  const requests = [];
  const local = storage();
  const statuses = [];
  const send = async (_, options) => {
    requests.push(JSON.parse(options.body));
    if (requests.length === 1) await new Promise((resolve) => { finishFirst = resolve; });
    return Response.json({ updatedAt: requests.length + 1 });
  };
  const session = new AccountSaveSession("alice", { profile: profile(0), updatedAt: 1 }, profile(0), local, (s) => statuses.push(s), () => assert.fail("unexpected conflict"), send);
  session.stage(profile(10));
  const writing = session.flush();
  session.stage(profile(20));
  assert.equal(requests.length, 1);
  finishFirst();
  await writing;
  assert.deepEqual(requests.map((r) => [r.profile.gold, r.baseRevision]), [[10, 1], [20, 2]]);
  const saved = JSON.parse(local.getItem(accountStoragePrefix("alice") + "profile"));
  assert.equal(saved.baseRevision, 3);
  assert.equal(saved.dirty, false);
  assert.equal(statuses.at(-1), "synced");
  session.stop();
});

test("conflict preserves a backup and stops all further writes", async () => {
  let calls = 0;
  let conflicts = 0;
  const local = storage();
  const session = new AccountSaveSession("alice", { profile: profile(0), updatedAt: 1 }, profile(0), local, () => {}, () => conflicts++, async () => {
    calls++;
    return Response.json({ error: "save_conflict" }, { status: 409 });
  });
  session.stage(profile(50));
  await session.flush();
  session.stage(profile(100));
  await session.flush();
  assert.equal(calls, 1);
  assert.equal(conflicts, 1);
  assert.equal(JSON.parse(local.getItem(accountStoragePrefix("alice") + "conflict-backup")).gold, 50);
  session.stop();
});
