# @despia/powersync

> **Despia V4 only (beta).** Most Despia apps are still running on **Despia V3**.  
> To join the V4 beta, email `beta@despia.com`.

Despia PowerSync SDK.

Add a fast, offline-first **native local database** to your Despia app, then keep it in real time sync with your backend through [PowerSync](https://powersync.com/), using a simple JavaScript API.

- Powered by **PowerSync**: a production-proven sync engine for offline-first apps.

- Despia runtime overview: [Despia docs](https://setup.despia.com/introduction)
- Despia native features SDK: [`despia-native` on npm](https://www.npmjs.com/package/despia-native)

---

## Why this exists

Despia apps run your existing web app inside a native Swift (iOS) and Kotlin (Android) runtime. This package bridges your web code to a native SQLite database plus sync engine, so your app stays instant and usable even when the network is unreliable.

## Features

- **Local-first SQLite**: query and write instantly, even offline.
- **Sync lifecycle API**: configure, connect, trigger sync, read sync status.
- **Live queries**: subscribe to result sets via `watch()`.
- **Framework-agnostic**: works with React / Vue / Angular / Svelte / vanilla JS.
- **Works with Despia Local Server**: compatible with both Remote Hydration and `http://localhost`.

## Store compliant

Despia’s Local Server downloads and caches web content (HTML, CSS, JavaScript) for offline display in a WebView, the same way browsers cache pages. No native code or executables are downloaded. Learn more about the Despia runtime model in the [Despia docs](https://setup.despia.com/introduction).

---

## Quick start

Install:

```bash
npm i @despia/powersync
```

Query your local DB:

```ts
import { db } from "@despia/powersync";

type User = { id: number; email: string };
const users = await db.query<User>("SELECT id, email FROM users");
```

Connect sync:

```ts
import { db } from "@despia/powersync";

await db.connect({
  fetchToken: async () => {
    // return a JWT from your backend
    return "YOUR_JWT";
  },
  url: "https://YOUR_POWERSYNC_INSTANCE",
  appId: "YOUR_APP_ID",
});
```

Trigger sync + read status:

```ts
await db.sync();
const status = await db.syncStatus();
console.log(status);
```

---

## Runtime requirements

This package only works inside the **Despia runtime** (native bridge required). In a regular browser it will throw.

```ts
export const isDespia = () => navigator.userAgent.includes("despia");
```

---

## Usage

### ESM (recommended)

```ts
import { db } from "@despia/powersync";
```

### ESM via CDN (jsDelivr)

```html
<script type="module">
  // Recommended (CDN rewrites dependencies for ESM)
  import { db } from "https://cdn.jsdelivr.net/npm/@despia/powersync/+esm";

  // Or direct file (same package build output)
  // import { db } from "https://cdn.jsdelivr.net/npm/@despia/powersync/dist/esm/index.mjs";

  const rows = await db.query("SELECT 1");
  console.log(rows);
</script>
```

### CommonJS

```js
const { db } = require("@despia/powersync");
```

### Script tag (UMD via CDN)

```html
<script src="https://cdn.jsdelivr.net/npm/@despia/powersync/dist/umd/despia-powersync.min.js"></script>
<script>
  // window.DespiaPowerSync.{ db, Database, onEvent }
  const { db } = window.DespiaPowerSync;
</script>
```

### Script tag (ESM via CDN)

```html
<script type="module">
  import { db } from "https://cdn.jsdelivr.net/npm/@despia/powersync/+esm";
  const rows = await db.query("SELECT 1");
  console.log(rows);
</script>
```

---

## Common patterns

### Write data (execute / batch / transaction)

```ts
import { db } from "@despia/powersync";

await db.execute("INSERT INTO users(email) VALUES(?)", ["a@b.com"]);

await db.batch([
  { sql: "INSERT INTO users(email) VALUES(?)", params: ["a@b.com"] },
  { sql: "INSERT INTO users(email) VALUES(?)", params: ["c@d.com"] },
]);

await db.transaction(async (tx) => {
  await tx.execute("UPDATE users SET email = ? WHERE id = ?", ["x@y.com", 1]);
});
```

### Live query (watch)

```ts
import { db } from "@despia/powersync";

type Todo = { id: number; title: string; done: 0 | 1 };

const unwatch = db.watch<Todo>("SELECT id, title, done FROM todos", (rows) => {
  console.log("todos:", rows);
});

// later:
unwatch();
```

---

## API reference

### Exports

- `db`: singleton `Database`
- `Database`: class
- `onEvent(event, callback)`: subscribe to native events

### Types

```ts
export type ExecuteResult = { rowsAffected: number; insertId?: number };
export type BatchStatement = { sql: string; params?: unknown[] };
export type BatchResult = { results: ExecuteResult[] };

export type SyncStatus = {
  connected: boolean;
  lastSynced: string | null;
  uploading: boolean;
  downloading: boolean;
};

export type PowerSyncConfig = {
  url?: string;
  token: string;
  appId?: string;
  uploadDebounce?: number;
};

export type ConnectOptions = {
  fetchToken: () => Promise<string>;
  url?: string;
  appId?: string;
};
```

### `Database` methods (signatures)

```ts
query<T extends Record<string, unknown> = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]>;

get<T extends Record<string, unknown> = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T | null>;

execute(sql: string, params?: unknown[]): Promise<ExecuteResult>;
batch(statements: BatchStatement[]): Promise<BatchResult>;

transaction<T>(fn: (db: Database) => Promise<T>): Promise<T>;

watch<T extends Record<string, unknown> = Record<string, unknown>>(
  sql: string,
  callback: (rows: T[]) => void
): () => void;
watch<T extends Record<string, unknown> = Record<string, unknown>>(
  sql: string,
  params: unknown[],
  callback: (rows: T[]) => void
): () => void;

migrate(version: number, statements: BatchStatement[]): Promise<Record<string, unknown>>;

configurePowerSync(config: PowerSyncConfig): Promise<Record<string, unknown>>;
connect(options?: Partial<ConnectOptions>): Promise<void>;
disconnect(): Promise<Record<string, unknown>>;

sync(): Promise<Record<string, unknown>>;
syncStatus(): Promise<SyncStatus>;
onSyncChange(callback: (status: SyncStatus) => void): () => void;
```

### Events

Subscribe with `onEvent(event, callback)`:

- `sync:status` → `SyncStatus`
- `sync:token_needed` → `unknown` (handled internally by `connect()`)
- `watch:<watchId>` → rows payload (typed via `watch<T>()`)

