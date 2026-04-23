# Despia PowerSync

### Local SQLite in hybrid mobile apps with Despia

Instant local reads and writes inside your existing web codebase, backed by a native SQLite database available to your app when it runs in Despia. Your UI stays fast, offline-first, and durable without rewriting your app in Swift/Kotlin.

[![npm](https://img.shields.io/npm/v/@despia/powersync)](https://www.npmjs.com/package/@despia/powersync)
[![license](https://img.shields.io/npm/l/@despia/powersync)](LICENSE)
[![source](https://img.shields.io/badge/source-GitHub-181717?logo=github)](https://github.com/despia-native/despia-powersync)

**[Learn about Despia Native](https://setup.despia.com/introduction)** · **[Source on GitHub](https://github.com/despia-native/despia-powersync)**

### Why this exists

Web apps are productive, but "fast + offline + durable" on mobile is hard in a browser sandbox. You can use IndexedDB and hope for the best, or you can run a real native database and bridge to it.

**Despia Native fixes this.** `@despia/powersync` is the typed JavaScript bridge from your web code to a native SQLite database and sync primitives.

### What you get

| | |
| --- | --- |
| **Local-first SQLite** | Query and write instantly. Works offline by default. |
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

Runtime checks:

- **Recommended (authoritative)**: feature-detect the native bridge (works even if the UA is changed).
- **Optional (best-effort)**: UA string contains `despia` (not authoritative).

```js
const ok =
  !!(window.webkit?.messageHandlers?.powersync || window.PowerSync?.exec) ||
  navigator.userAgent.toLowerCase().includes("despia"); // best-effort hint only
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
export function isDespiaPowerSyncAvailable(): boolean {
  return !!(window.webkit?.messageHandlers?.powersync || window.PowerSync?.exec);
}
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

### Events

- `sync:status` → `SyncStatus`
- `sync:token_needed` → `unknown` (handled by `connect()` if you provide `fetchToken`)
- `watch:` + id → rows payload (typed by `watch<T>()`)

---

## License

MIT

