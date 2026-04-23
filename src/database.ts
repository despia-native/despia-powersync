import { isAvailable, send, onEvent } from "./bridge";
import type {
  BatchResult,
  BatchStatement,
  ConnectOptions,
  ExecuteResult,
  PowerSyncConfig,
  SyncStatus,
} from "./types";

type Row = Record<string, unknown>;

function isRowArray(value: unknown): value is Row[] {
  return Array.isArray(value);
}

function isExecuteResult(value: unknown): value is ExecuteResult {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.rowsAffected === "number";
}

function isBatchResult(value: unknown): value is BatchResult {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.results);
}

function isSyncStatus(value: unknown): value is SyncStatus {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.connected === "boolean" &&
    (typeof v.lastSynced === "string" || v.lastSynced === null) &&
    typeof v.uploading === "boolean" &&
    typeof v.downloading === "boolean"
  );
}

class Database {
  private _fetchToken: ConnectOptions["fetchToken"] | null = null;
  private _tokenRefreshUnsub: (() => void) | null = null;

  async query<T extends Row = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
    const result = await send({ action: "query", sql, params });
    const rows = result.rows;
    return (isRowArray(rows) ? rows : []) as T[];
  }

  async get<T extends Row = Row>(sql: string, params: unknown[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows[0] ?? null;
  }

  async execute(sql: string, params: unknown[] = []): Promise<ExecuteResult> {
    const result = await send({ action: "execute", sql, params });
    return (isExecuteResult(result) ? result : (result as unknown as ExecuteResult));
  }

  async batch(statements: BatchStatement[]): Promise<BatchResult> {
    const result = await send({
      action: "batch",
      statements: statements.map((s) => ({
        sql: s.sql,
        params: s.params ?? [],
      })),
    });
    return (isBatchResult(result) ? result : (result as unknown as BatchResult));
  }

  async transaction<T>(fn: (db: Database) => Promise<T>): Promise<T> {
    await send({ action: "transaction", op: "begin" });
    try {
      const result = await fn(this);
      await send({ action: "transaction", op: "commit" });
      return result;
    } catch (err) {
      await send({ action: "transaction", op: "rollback" });
      throw err;
    }
  }

  watch<T extends Row = Row>(sql: string, callback: (rows: T[]) => void): () => void;
  watch<T extends Row = Row>(
    sql: string,
    params: unknown[],
    callback: (rows: T[]) => void
  ): () => void;
  watch<T extends Row = Row>(
    sql: string,
    paramsOrCallback: unknown[] | ((rows: T[]) => void),
    maybeCallback?: (rows: T[]) => void
  ): () => void {
    if (!isAvailable()) {
      console.error(
        "[powersync] watch() called but native bridge is not available."
      );
      return () => {};
    }

    let params: unknown[] = [];
    let callback: (rows: T[]) => void;

    if (typeof paramsOrCallback === "function") {
      callback = paramsOrCallback;
      params = [];
    } else {
      params = paramsOrCallback;
      callback = maybeCallback as unknown as (rows: T[]) => void;
    }

    const watchId = `w_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    send({ action: "watch", watchId, sql, params }).catch((err) =>
      console.error("[powersync] watch registration failed:", err)
    );

    const unsub = onEvent<unknown>(`watch:${watchId}`, (rows) => {
      callback((isRowArray(rows) ? rows : (rows as unknown as Row[])) as T[]);
    });

    return () => {
      unsub();
      send({ action: "unwatch", watchId }).catch(() => {});
    };
  }

  async migrate(version: number, statements: BatchStatement[]): Promise<Record<string, unknown>> {
    return send({
      action: "migrate",
      version,
      statements,
    });
  }

  async syncStatus(): Promise<SyncStatus> {
    const result = await send({ action: "sync", op: "status" });
    const status = result.status;
    return (isSyncStatus(status) ? status : (status as unknown as SyncStatus));
  }

  async sync(): Promise<Record<string, unknown>> {
    return send({ action: "sync", op: "trigger" });
  }

  onSyncChange(callback: (status: SyncStatus) => void): () => void {
    return onEvent<SyncStatus>("sync:status", callback);
  }

  async configurePowerSync(config: PowerSyncConfig): Promise<Record<string, unknown>> {
    return send({ action: "sync", op: "configure", config });
  }

  async connect(options: Partial<ConnectOptions> = {}): Promise<void> {
    const { fetchToken } = options;

    if (typeof fetchToken !== "function") {
      throw new Error("connect() requires a fetchToken function");
    }

    this._fetchToken = fetchToken;

    // Optional: only needed if native sync later requests a token refresh.
    this._tokenRefreshUnsub?.();
    this._tokenRefreshUnsub = onEvent("sync:token_needed", async () => {
      try {
        const fn = this._fetchToken;
        if (!fn) return;
        const newToken = await fn();
        await send({ action: "sync", op: "refresh_token", token: newToken });
      } catch (err) {
        console.error("[powersync] token refresh failed:", err);
      }
    });
  }

  async disconnect(): Promise<Record<string, unknown>> {
    this._tokenRefreshUnsub?.();
    this._tokenRefreshUnsub = null;
    this._fetchToken = null;
    return send({ action: "sync", op: "disconnect" });
  }
}

const db = new Database();

export { db, Database };

