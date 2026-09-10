export type SaveStatus = "loading" | "syncing" | "synced" | "offline" | "guest" | "conflict";
export type SaveEnvelope<T> = { profile: T; baseRevision: number | null; dirty: boolean };
export type CloudSave<T> = { accountId: string | null; profile: T | null; updatedAt: number | null };

export function accountStoragePrefix(accountId: string | null) {
  return `relic-rush-account:${accountId === null ? "guest" : `user:${encodeURIComponent(accountId)}`}:`;
}

export function readSaveEnvelope<T>(storage: Storage, key: string): SaveEnvelope<T> | null {
  try {
    const saved = JSON.parse(storage.getItem(key) ?? "null");
    return saved?.profile && (saved.baseRevision === null || Number.isSafeInteger(saved.baseRevision))
      ? saved : null;
  } catch { return null; }
}

export function chooseSave<T>(cloud: CloudSave<T>, local: SaveEnvelope<T> | null) {
  if (!local) return { profile: cloud.profile, conflict: null };
  if (cloud.accountId === null || (local.dirty && local.baseRevision === cloud.updatedAt))
    return { profile: local.profile, conflict: null };
  if (local.dirty && JSON.stringify(local.profile) !== JSON.stringify(cloud.profile))
    return { profile: cloud.profile, conflict: local.profile };
  return { profile: cloud.profile, conflict: null };
}

/** One writer per page. Never abort an issued write: the server may commit it. */
export class AccountSaveSession<T> {
  readonly prefix: string;
  private latest: T;
  private acknowledged: string;
  private revision: number | null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private inFlight: Promise<void> | null = null;
  private stopped = false;
  private conflict = false;

  constructor(
    readonly accountId: string | null,
    cloud: CloudSave<T>,
    initial: T,
    private storage: Storage,
    private status: (status: SaveStatus) => void,
    private onConflict: () => void,
    private send: typeof fetch = fetch,
  ) {
    this.prefix = accountStoragePrefix(accountId);
    this.latest = initial;
    this.revision = cloud.updatedAt;
    this.acknowledged = JSON.stringify(cloud.profile);
  }

  private persist() {
    this.storage.setItem(this.prefix + "profile", JSON.stringify({
      profile: this.latest, baseRevision: this.revision,
      dirty: this.accountId !== null && JSON.stringify(this.latest) !== this.acknowledged,
    } satisfies SaveEnvelope<T>));
  }

  stage(profile: T) {
    if (this.stopped || this.conflict) return;
    this.latest = profile;
    let locallySaved = true;
    try { this.persist(); } catch { locallySaved = false; this.status("offline"); }
    if (this.accountId === null) { if (locallySaved) this.status("guest"); return; }
    if (JSON.stringify(profile) === this.acknowledged) { this.status("synced"); return; }
    this.status("syncing");
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { void this.flush(); }, 700);
  }

  async flush(): Promise<void> {
    if (this.inFlight) return this.inFlight;
    if (this.stopped || this.conflict || this.accountId === null) return;
    this.inFlight = (async () => {
      while (!this.stopped && !this.conflict && JSON.stringify(this.latest) !== this.acknowledged) {
        const snapshot = this.latest;
        try {
          const response = await this.send("/api/save", {
            method: "PUT", headers: { "content-type": "application/json" },
            body: JSON.stringify({ accountId: this.accountId, baseRevision: this.revision, profile: snapshot }),
          });
          if (response.status === 409 || response.status === 401) {
            this.conflict = true;
            this.storage.setItem(this.prefix + "conflict-backup", JSON.stringify(this.latest));
            this.status("conflict");
            if (!this.stopped) this.onConflict();
            return;
          }
          if (!response.ok) throw new Error("Save unavailable");
          const data = await response.json() as { updatedAt: number };
          if (!Number.isSafeInteger(data.updatedAt)) throw new Error("Invalid save revision");
          this.revision = data.updatedAt;
          this.acknowledged = JSON.stringify(snapshot);
          this.persist();
          if (!this.stopped) this.status(JSON.stringify(this.latest) === this.acknowledged ? "synced" : "syncing");
        } catch {
          if (!this.stopped) this.status("offline");
          return;
        }
      }
    })();
    try { await this.inFlight; } finally { this.inFlight = null; }
  }

  async replace(profile: T) {
    clearTimeout(this.timer);
    await this.flush();
    if (this.conflict || this.stopped) throw new Error("Save conflict");
    if (this.accountId !== null) {
      const response = await this.send("/api/save", {
        method: "PUT", headers: { "content-type": "application/json" },
        body: JSON.stringify({ accountId: this.accountId, baseRevision: this.revision, profile }),
      });
      if (!response.ok) throw new Error("Reset unavailable");
      this.revision = (await response.json() as { updatedAt: number }).updatedAt;
    }
    this.latest = profile;
    this.acknowledged = JSON.stringify(profile);
    this.persist();
  }

  stop() { this.stopped = true; clearTimeout(this.timer); }
}
