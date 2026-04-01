# @despia/powersync

> **Despia V4 only (beta).** Most Despia apps are still running on **Despia V3**.  
> To join the V4 beta, email `beta@despia.com`.

## Despia PowerSync SDK

Native **local SQLite database + sync** for [Despia](https://despia.com) apps.

`@despia/powersync` gives your Despia app a fast, offline-first local database and a simple API to keep it in sync with your backend through PowerSync.

Your web app (React/Vue/Angular/Svelte/vanilla JS) runs inside Despia’s native Swift (iOS) and Kotlin (Android) runtime, and this SDK bridges to the native database + sync engine via JSON messaging.

- **Learn about the Despia runtime**: `https://setup.despia.com/introduction` ([Despia docs](https://setup.despia.com/introduction))
- **Other native features (Despia JavaScript SDK)**: `https://www.npmjs.com/package/despia-native`

## Deployment models

- **Remote Hydration (default)**: the native container loads your web app from your hosting URL on launch.
- **Local Server (optional)**: Despia downloads your web build to the device and serves it from an on-device HTTP server at `http://localhost` for instant boot and full offline operation (via `@despia/local`).

`@despia/powersync` works in **both** models (including apps running on the Local Server).

---

## Quick start

**Install:**

```bash
npm i @despia/powersync
```

**Use it (local DB):**

```ts
import { db } from "@despia/powersync";

type UserRow = { id: number; email: string };
const users = await db.query<UserRow>("SELECT id, email FROM users");
```

**Connect sync (PowerSync):**

```ts
import { db } from "@despia/powersync";

await db.connect({
  fetchToken: async () => {
    // fetch a JWT from your backend
    return "YOUR_JWT";
  },
  url: "https://YOUR_POWERSYNC_INSTANCE",
  appId: "YOUR_APP_ID",
});

// optional: trigger sync + observe status
await db.sync();
const status = await db.syncStatus();
console.log(status);
```

**Note:** This SDK only works inside the Despia runtime (native bridge required). In a normal browser, calls will fail.

---

## Web apps vs React Native

**This SDK is for:**

- React web apps (Next.js, Vite, CRA, etc.)
- Vue / Angular / Svelte web apps
- Vanilla JavaScript web apps

**This SDK is NOT for:**

- React Native / Expo apps
- Native iOS/Android development

---

## Environment detection

Gate calls on runtime detection:

```ts
export const isDespia = () => navigator.userAgent.includes("despia");
```

---

## Exports

- `db` (singleton)
- `Database` (class)
- `onEvent(event, handler)` (subscribe to native events)

---

## Usage

### ESM

```ts
import { db } from "@despia/powersync";

const rows = await db.query<{ id: number; name: string }>(
  "SELECT id, name FROM users WHERE id = ?",
  [1]
);
```

### CommonJS

```js
const { db } = require("@despia/powersync");
```

### setup.despia.com / local ESM path

If you serve the file as `/despia/powersync.js` (built at `dist/esm/powersync.js`), you can import it as a module:

```html
<script type="module">
  import { db } from "/despia/powersync.js";
  const rows = await db.query("SELECT 1");
  console.log(rows);
</script>
```

### Script tag / CDN

```html
<script src="https://cdn.jsdelivr.net/npm/@despia/powersync/dist/umd/despia-powersync.min.js"></script>
<script>
  // window.DespiaPowerSync.{ db, Database, onEvent }
  const { db } = window.DespiaPowerSync;
</script>
```

---

## API quickstart

### Query / get (typed)

```ts
import { db } from "@despia/powersync";

type UserRow = { id: number; email: string };

const users = await db.query<UserRow>("SELECT id, email FROM users");
const first = await db.get<UserRow>("SELECT id, email FROM users LIMIT 1");
```

### Execute / batch / transaction

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

### watch() (live updates from native)

```ts
import { db } from "@despia/powersync";

type Todo = { id: number; title: string; done: 0 | 1 };

const unwatch = db.watch<Todo>("SELECT id, title, done FROM todos", (rows) => {
  console.log("todos changed:", rows);
});

// later:
unwatch();
```

### PowerSync connect / status

```ts
import { db } from "@despia/powersync";

await db.connect({
  fetchToken: async () => {
    // fetch a JWT from your backend
    return "YOUR_JWT";
  },
  url: "https://YOUR_POWERSYNC_INSTANCE",
  appId: "YOUR_APP_ID",
});

const status = await db.syncStatus();
console.log(status.connected, status.lastSynced);
```

---

## Full API specification

### Package exports

```ts
import { db, Database, onEvent } from "@despia/powersync";
import type {
  ExecuteResult,
  BatchStatement,
  BatchResult,
  SyncStatus,
  PowerSyncConfig,
  ConnectOptions,
} from "@despia/powersync";
```

- `**db: Database**`: singleton instance
- `**Database**`: class (create your own instance if you want)
- `**onEvent<T>(event: string, callback: (payload: T) => void): () => void**`: subscribe to native events

### `Database` class

#### `query<T>()`

```ts
query<T extends Record<string, unknown> = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]>;
```

- **Behavior**: runs a SQL query and returns `rows` (defaults to `[]` if missing).

#### `get<T>()`

```ts
get<T extends Record<string, unknown> = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T | null>;
```

- **Behavior**: returns the first row or `null`.

#### `execute()`

```ts
execute(sql: string, params?: unknown[]): Promise<ExecuteResult>;
```

`ExecuteResult`:

```ts
type ExecuteResult = {
  rowsAffected: number;
  insertId?: number;
};
```

#### `batch()`

```ts
batch(statements: BatchStatement[]): Promise<BatchResult>;
```

`BatchStatement` / `BatchResult`:

```ts
type BatchStatement = { sql: string; params?: unknown[] };
type BatchResult = { results: ExecuteResult[] };
```

#### `transaction()`

```ts
transaction<T>(fn: (db: Database) => Promise<T>): Promise<T>;
```

- **Behavior**: begins a transaction, runs `fn(this)`, commits on success, rolls back on error, and re-throws.

#### `watch<T>()`

```ts
watch<T extends Record<string, unknown> = Record<string, unknown>>(
  sql: string,
  callback: (rows: T[]) => void
): () => void;

watch<T extends Record<string, unknown> = Record<string, unknown>>(
  sql: string,
  params: unknown[],
  callback: (rows: T[]) => void
): () => void;
```

- **Behavior**:
  - registers a native watch and calls `callback(rows)` whenever the native layer emits `watch:<watchId>`
  - returns an unsubscribe function that also sends `unwatch`
- **Events used**: `watch:<watchId>` (payload is `rows`)

#### `migrate()`

```ts
migrate(version: number, statements: BatchStatement[]): Promise<Record<string, unknown>>;
```

#### `syncStatus()`

```ts
syncStatus(): Promise<SyncStatus>;
```

`SyncStatus`:

```ts
type SyncStatus = {
  connected: boolean;
  lastSynced: string | null;
  uploading: boolean;
  downloading: boolean;
};
```

#### `sync()`

```ts
sync(): Promise<Record<string, unknown>>;
```

- **Behavior**: triggers a sync cycle in the native layer.

#### `onSyncChange()`

```ts
onSyncChange(callback: (status: SyncStatus) => void): () => void;
```

- **Event used**: `sync:status` (payload is `SyncStatus`)

#### `configurePowerSync()`

```ts
configurePowerSync(config: PowerSyncConfig): Promise<Record<string, unknown>>;
```

`PowerSyncConfig`:

```ts
type PowerSyncConfig = {
  url?: string;
  token: string;
  appId?: string;
  uploadDebounce?: number;
};
```

#### `connect()`

```ts
connect(options?: Partial<ConnectOptions>): Promise<void>;
```

`ConnectOptions`:

```ts
type ConnectOptions = {
  fetchToken: () => Promise<string>;
  url?: string;
  appId?: string;
};
```

- **Behavior**:
  - requires `fetchToken`
  - fetches a token and calls `configurePowerSync({ url, appId, token })`
  - subscribes to `sync:token_needed` and refreshes the token when requested by native

#### `disconnect()`

```ts
disconnect(): Promise<Record<string, unknown>>;
```

- **Behavior**: unsubscribes from token refresh and tells native to disconnect.

### Events

Subscribe with `onEvent(event, callback)`:

- `**sync:status`** → payload: `SyncStatus`
- `**sync:token_needed**` → payload: `unknown` (token refresh is handled internally by `connect()`)
- `**watch:<watchId>**` → payload: `unknown` (rows array; typed via `watch<T>()`)

