import { env } from "cloudflare:workers";

export function getSaveStore() {
  if (!env.DB) throw new Error("Game save storage is unavailable");
  return env.DB;
}

// Comparison and write are atomic, including two devices creating their first save.
export const CREATE_SAVE_SQL = "INSERT INTO game_saves (user_id, profile_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO NOTHING RETURNING updated_at";
export const UPDATE_SAVE_SQL = "UPDATE game_saves SET profile_json = ?, updated_at = MAX(updated_at + 1, ?) WHERE user_id = ? AND updated_at = ? RETURNING updated_at";
