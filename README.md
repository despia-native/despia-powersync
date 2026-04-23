# Despia PowerSync

### Real native SQLite with cloud sync, from your web code

Fast local reads and writes backed by a real native SQLite database, plus optional cloud sync with PowerSync. You keep your web app codebase, and get native database power where it matters.

[![npm](https://img.shields.io/npm/v/@despia/powersync)](https://www.npmjs.com/package/@despia/powersync)
[![license](https://img.shields.io/npm/l/@despia/powersync)](LICENSE)
[![source](https://img.shields.io/badge/source-GitHub-181717?logo=github)](https://github.com/despia-native/despia-powersync)

**[Learn about Despia Native](https://setup.despia.com/introduction)** · **[Source on GitHub](https://github.com/despia-native/despia-powersync)**

### Why this exists

Offline-first apps need a real local database. This package gives your web code a typed API for a native SQLite database, and cloud sync hooks via PowerSync so local data can stay in sync with your backend.

### What you get

| | |
| --- | --- |
| **Local-first SQLite** | Query and write instantly. Works offline by default. |
| **Sync with PowerSync** | Wire up cloud sync using PowerSync. Local reads and writes stay instant. |
| **Live queries** | Subscribe to result sets via `watch()` and update UI in real time. |
| **TypeScript-first** | Strict types, no `any`, clean `.d.ts` output. |
| **Framework-agnostic** | Works with React / Vue / Angular / Svelte / vanilla JS. |
| **CDN-friendly** | ESM + UMD builds for jsDelivr / `<script>` usage. |

### Offline app note

For a complete offline-first app (your web UI cached offline plus a local database), pair this with Despia Local Server: [`@despia/local`](https://www.npmjs.com/package/@despia/local).

### More native features

If you want more native capabilities from the same web codebase (in-app purchases, iCloud key-value storage, Android key-value backups, and more), use [`despia-native`](https://www.npmjs.com/package/despia-native). It is cross-platform and framework-agnostic.

---

## Table of Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Quick start](#quick-start)
- [Usage](#usage)
- [Common patterns](#common-patterns)
- [API reference](#api-reference)
- [License](#license)

---

## Requirements

- The app must run inside a Despia app where the native PowerSync bridge is present.
- In a normal browser, DB calls fail because the native bridge is not available.

Runtime guard:

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

No init call required. If the bridge is present, you can query immediately.

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
- `onEvent(event, callback)`: subscribe to PowerSync events
- `isDespiaPowerSyncAvailable()`: check bridge availability

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

// Low-level sync config hook (native dependent)
db.configurePowerSync(config: PowerSyncConfig): Promise<Record<string, unknown>>;
```

### `onEvent()`

```ts
onEvent<T = unknown>(event: string, callback: (payload: T) => void): () => void;
```

---

## License

MIT

