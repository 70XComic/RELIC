import { getChatGPTUser } from "../../chatgpt-auth";
import { CREATE_SAVE_SQL, getSaveStore, UPDATE_SAVE_SQL } from "../../../db/game-save-store";

export async function GET() {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ accountId: null, profile: null, updatedAt: null }, { headers: { "cache-control": "no-store" } });
    const row = await getSaveStore().prepare("SELECT profile_json, updated_at FROM game_saves WHERE user_id = ?").bind(user.id).first<{ profile_json: string; updated_at: number }>();
    return Response.json({ accountId: user.id, profile: row ? JSON.parse(row.profile_json) : null, updatedAt: row?.updated_at ?? null }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("Could not load game save", error);
    return Response.json({ error: "save_unavailable" }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
    const body = await request.json() as { profile?: Record<string, unknown>; accountId?: string; baseRevision?: number | null };
    if (body.accountId !== user.id) return Response.json({ error: "account_changed" }, { status: 409 });
    if (body.baseRevision !== null && (!Number.isSafeInteger(body.baseRevision) || (body.baseRevision ?? -1) < 0))
      return Response.json({ error: "revision_required" }, { status: 428 });
    if (!body.profile || typeof body.profile !== "object" || !Array.isArray(body.profile.owned) || !Array.isArray(body.profile.team) || typeof body.profile.userId !== "string")
      return Response.json({ error: "invalid_profile" }, { status: 400 });
    const profileJson = JSON.stringify(body.profile);
    if (new TextEncoder().encode(profileJson).length > 250_000) return Response.json({ error: "save_too_large" }, { status: 413 });
    const db = getSaveStore();
    const row = body.baseRevision === null
      ? await db.prepare(CREATE_SAVE_SQL).bind(user.id, profileJson, Date.now()).first<{ updated_at: number }>()
      : await db.prepare(UPDATE_SAVE_SQL).bind(profileJson, Date.now(), user.id, body.baseRevision).first<{ updated_at: number }>();
    if (!row) return Response.json({ error: "save_conflict" }, { status: 409 });
    return Response.json({ ok: true, updatedAt: row.updated_at });
  } catch (error) {
    console.error("Could not save game", error);
    return Response.json({ error: "save_unavailable" }, { status: 503 });
  }
}

// Reset uses a conditional PUT. Keep the revision so stale devices cannot
// resurrect a deleted save with a delayed first-save request.
export async function DELETE() {
  return Response.json({ error: "reload_to_reset" }, { status: 405 });
}
