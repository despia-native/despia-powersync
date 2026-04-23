// ── Bridge internals ────────────────────────────────────────

export interface BridgePayload {
  action: string;
  sdk: string;
  rid: string;
  [key: string]: unknown;
}

export interface BridgeResponse {
  rid: string;
  sdk: string;
  error?: string;
  [key: string]: unknown;
}

export interface BridgeEvent {
  sdk: string;
  event: string;
  payload: unknown;
}

export interface PendingHandler {
  resolve: (data: Record<string, unknown>) => void;
  reject: (error: Error) => void;
}

// ── Database types ──────────────────────────────────────────

export interface ExecuteResult {
  rowsAffected: number;
  insertId?: number;
}

export interface BatchStatement {
  sql: string;
  params?: unknown[];
}

export interface BatchResult {
  results: ExecuteResult[];
}

export interface SyncStatus {
  connected: boolean;
  lastSynced: string | null;
  uploading: boolean;
  downloading: boolean;
}

export type PowerSyncColumnType = "text" | "integer" | "real";

export interface PowerSyncTableSchema {
  columns: Record<string, PowerSyncColumnType>;
  /** Optional index name → ordered column names (native builders handle these) */
  indexes?: Record<string, string[]>;
}

/** Table name → table definition (JSON schema format used by native builders). */
export type PowerSyncSchema = Record<string, PowerSyncTableSchema>;

export interface PowerSyncConfig {
  /** Full PowerSync instance URL (optional if set in native Config) */
  url?: string;
  /** JWT token for authentication */
  token: string;
}

export interface ConnectOptions {
  /** Async function that returns a JWT string from your backend */
  fetchToken: () => Promise<string>;
}

// ── Window augmentation ─────────────────────────────────────

type BridgeCallback = (raw: string | BridgeResponse | BridgeEvent) => void;

interface BridgeGlobal extends BridgeCallback {
  _handlers: BridgeCallback[];
}

declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        powersync?: {
          postMessage: (msg: string) => void;
        };
      };
    };
    PowerSync?: {
      exec: (json: string) => void;
    };
    nativeBridgeResponse?: BridgeGlobal;
    nativeBridgeEvent?: BridgeGlobal;
  }
}

