import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const tiers = [
  ["normal-early", 1, 1, 3], ["event-beginner", 12, 1.35, 4],
  ["normal-mid", 45, 3.2, 5], ["event-advanced", 72, 4.8, 7],
  ["strong-white", 95, 5.2, 8], ["normal-late", 110, 6.5, 9],
  ["strong-black", 125, 7.4, 10], ["abyss-100", 135, 8.2, 11],
];
let previous = 0;
for (const [name, level, scale, turns] of tiers) {
  if (level < previous || scale <= 0 || turns < 3 || turns > 12) throw new Error(`Balance check failed: ${name}`);
  previous = level;
}

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  server: { middlewareMode: true, hmr: false },
});
try {
  const { PHASE4_VOID_DUNGEONS } = await vite.ssrLoadModule(
    "/app/phase4-content.ts",
  );
  for (const stage of PHASE4_VOID_DUNGEONS) {
    const boss = stage.enemies.at(-1);
    if (
      stage.recommended > 225 ||
      stage.enemies.length < 3 ||
      stage.enemies.length > 20 ||
      stage.scale < 2.5 ||
      stage.scale > 4 ||
      stage.enemySpeedMultiplier < 3.5 ||
      !boss ||
      boss.maxHp > 24_000 ||
      (stage.gimmick?.doomTurn &&
        boss.maxHp > stage.gimmick.doomTurn * 2_000)
    ) {
      throw new Error(`Phase 4 void balance check failed: ${stage.id}`);
    }
  }
  console.log(
    `Balance check passed: ${tiers.length} progression tiers and ${PHASE4_VOID_DUNGEONS.length} Phase 4 void dungeons.`,
  );
} finally {
  await vite.close();
}
