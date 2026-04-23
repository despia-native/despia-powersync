# Despia PowerSync

### Local SQLite in hybrid mobile apps with Despia

Instant local reads and writes inside your existing web codebase, backed by a native SQLite database, with optional real time sync via PowerSync. Your UI stays fast, offline-first, and durable without rewriting your app in Swift/Kotlin.

[![npm](https://img.shields.io/npm/v/@despia/powersync)](https://www.npmjs.com/package/@despia/powersync)
[![license](https://img.shields.io/npm/l/@despia/powersync)](LICENSE)
[![source](https://img.shields.io/badge/source-GitHub-181717?logo=github)](https://github.com/despia-native/despia-powersync)

**[Learn about Despia Native](https://setup.despia.com/introduction)** · **[Source on GitHub](https://github.com/despia-native/despia-powersync)**

### Why this exists

Web apps are productive, but "fast + offline + durable" on mobile is hard in a browser sandbox. You can use IndexedDB and hope for the best, or you can run a real native database and bridge to it.

**Despia Native fixes this.** `@despia/powersync` is the typed JavaScript bridge from your web code to a native SQLite database plus PowerSync sync primitives.

### What you get

| | |
| --- | --- |
| **Local-first SQLite** | Query and write instantly. Works offline by default. |
| **Sync with PowerSync** | Wire up cloud sync using PowerSync. Local reads and writes stay instant. |
| **Live queries** | Subscribe to result sets via `watch()` and update UI in real time. |
| **TypeScript-first** | Strict types, no `any`, clean `.d.ts` output. |
| **Framework-agnostic** | Works with React / Vue / Angular / Svelte / vanilla JS. |
| **CDN-friendly** | ESM + UMD builds for jsDelivr / `<script>` usage. |

---

## Table of Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Quick start](#quick-start)
- [Runtime detection](#runtime-detection)
- [Usage](#usage)
- [Common patterns](#common-patterns)
- [API reference](#api-reference)
- [License](#license)

---

## Requirements

- The app must run inside a **Despia app** (where the native bridge is present).
- Outside Despia (desktop browser, SSR, etc), DB calls reject because the native bridge is not present.

Runtime check:

```js
import { isDespiaPowerSyncAvailable } from "@despia/powersync";

const ok = isDespiaPowerSyncAvailable();
```

---

## Installation

```bash
npm install @despia/powersync
# pnpm add @despia/powersync
# yarn add @despia/powersync
```

```ts
import { db } from "@despia/powersync";
```

> CDN alternative: `https://cdn.jsdelivr.net/npm/@despia/powersync/+esm` (ESM) or `https://cdn.jsdelivr.net/npm/@despia/powersync/dist/umd/despia-powersync.min.js` (UMD, global `DespiaPowerSync`)

---

## Quick start

```ts
import { db } from "@despia/powersync";

type User = { id: number; email: string };

const users = await db.query<User>("SELECT id, email FROM users");
await db.execute("INSERT INTO users(email) VALUES(?)", ["a@b.com"]);
```

**No init call required** when the host Despia app auto-initialises the database on `attach()`.

`connect()` is optional and only exists to provide a `fetchToken()` callback if/when native emits `sync:token_needed` (future sync wiring):

```ts
await db.connect({
  fetchToken: async () => "YOUR_JWT",
});
```

---

## Runtime detection

```ts
import { isDespiaPowerSyncAvailable } from "@despia/powersync";
```

---

## Usage

### ESM (recommended)

```ts
import { db } from "@despia/powersync";
```

### ESM via CDN (jsDelivr)

```js
import { db } from "https://cdn.jsdelivr.net/npm/@despia/powersync/+esm";
const rows = await db.query("SELECT 1");
console.log(rows);
```

### CommonJS

```js
const { db } = require("@despia/powersync");
```

### UMD via CDN (global)

```js
const { db } = window.DespiaPowerSync;
```

---

## Common patterns

### Batch + transaction

```ts
import { db } from "@despia/powersync";

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

unwatch();
```

---

## API reference

### Exports

- `db`: singleton `Database`
- `Database`: class
- `onEvent(event, callback)`: subscribe to native events
- `isDespiaPowerSyncAvailable()`: returns `true` when the native bridge is present (best effort)

### Database methods

```ts
// Read
db.query<T>(sql: string, params?: unknown[]): Promise<T[]>;
db.get<T>(sql: string, params?: unknown[]): Promise<T | null>;

// Write
db.execute(sql: string, params?: unknown[]): Promise<ExecuteResult>;
db.batch(statements: BatchStatement[]): Promise<BatchResult>;
db.transaction<T>(fn: (tx: Database) => Promise<T>): Promise<T>;

// Live queries
db.watch<T>(sql: string, callback: (rows: T[]) => void): () => void;
db.watch<T>(sql: string, params: unknown[], callback: (rows: T[]) => void): () => void;

// Migrations
db.migrate(version: number, statements: BatchStatement[]): Promise<Record<string, unknown>>;

// Sync (native dependent)
db.sync(): Promise<Record<string, unknown>>;
db.syncStatus(): Promise<SyncStatus>;
db.onSyncChange(callback: (status: SyncStatus) => void): () => void;

// Optional auth hook (future sync wiring)
db.connect(options?: { fetchToken: () => Promise<string> }): Promise<void>;
db.disconnect(): Promise<Record<string, unknown>>;

// Low-level sync config hook (native dependent)
db.configurePowerSync(config: PowerSyncConfig): Promise<Record<string, unknown>>;
```

### `onEvent()`

```ts
onEvent<T = unknown>(event: string, callback: (payload: T) => void): () => void;
```

### Events

- `sync:status` → `SyncStatus`
- `sync:token_needed` → `unknown` (handled by `connect()` if you provide `fetchToken`)
- `watch:` + id → rows payload (typed by `watch<T>()`)

---

## License

MIT

