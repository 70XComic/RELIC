import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const gameSaves = sqliteTable("game_saves", {
  userId: text("user_id").primaryKey(),
  profileJson: text("profile_json").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
