import type {
  BridgeEvent,
  BridgePayload,
  BridgeResponse,
  PendingHandler,
} from "./types";

const SDK_NAME = "powersync";

const pending = new Map<string, PendingHandler>();
let counter = 0;

function id(): string {
  return `dq_${++counter}_${Date.now()}`;
}

type SendPayload = { action: string } & Record<string, unknown>;

function send(payload: SendPayload): Promise<Record<string, unknown>> {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const rid = id();
    const message = { ...payload, sdk: SDK_NAME, rid } as BridgePayload;

    pending.set(rid, { resolve, reject });

    if (window.webkit?.messageHandlers?.powersync) {
      window.webkit.messageHandlers.powersync.postMessage(
        JSON.stringify(message)
      );
      return;
    }

    if (window.PowerSync?.exec) {
      window.PowerSync.exec(JSON.stringify(message));
      return;
    }

    pending.delete(rid);
    reject(
      new Error(
        "PowerSync native bridge not available. Are you running inside a Despia app?"
      )
    );
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isBridgeResponse(value: unknown): value is BridgeResponse {
  if (!isRecord(value)) return false;
  return typeof value.sdk === "string" && typeof value.rid === "string";
}

function receive(raw: string | BridgeResponse | BridgeEvent): void {
  let response: unknown;
  try {
    response = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    console.error("[powersync] Failed to parse bridge response:", raw);
    return;
  }

  if (!isBridgeResponse(response)) return;
  if (response.sdk !== SDK_NAME) return;

  const { rid, sdk: _sdk, error, ...data } = response;
  void _sdk;
  const handler = pending.get(rid);
  if (!handler) return;

  pending.delete(rid);

  if (typeof error === "string" && error.length > 0) {
    handler.reject(new Error(error));
  } else {
    handler.resolve(data);
  }
}

type EventCallback<T> = (payload: T) => void;

const listeners = new Map<string, Set<(payload: unknown) => void>>();

function onEvent<T = unknown>(event: string, callback: EventCallback<T>): () => void {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event)?.add(callback as (payload: unknown) => void);
  return () => listeners.get(event)?.delete(callback as (payload: unknown) => void);
}

function isBridgeEvent(value: unknown): value is BridgeEvent {
  if (!isRecord(value)) return false;
  return (
    typeof value.sdk === "string" &&
    typeof value.event === "string" &&
    "payload" in value
  );
}

function handleEvent(raw: string | BridgeResponse | BridgeEvent): void {
  let data: unknown;
  try {
    data = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return;
  }

  if (!isBridgeEvent(data)) return;
  if (data.sdk !== SDK_NAME) return;

  const handlers = listeners.get(data.event);
  if (handlers) handlers.forEach((fn) => fn(data.payload));
}

if (!window.nativeBridgeResponse) {
  const responseHandlers: Array<
    (raw: string | BridgeResponse | BridgeEvent) => void
  > = [];
  const bridgeFn = ((raw: string | BridgeResponse | BridgeEvent) => {
    responseHandlers.forEach((fn) => fn(raw));
  }) as Window["nativeBridgeResponse"];
  (bridgeFn as unknown as { _handlers: typeof responseHandlers })._handlers =
    responseHandlers;
  window.nativeBridgeResponse = bridgeFn;
}
window.nativeBridgeResponse!._handlers.push(receive);

if (!window.nativeBridgeEvent) {
  const eventHandlers: Array<
    (raw: string | BridgeResponse | BridgeEvent) => void
  > = [];
  const bridgeFn = ((raw: string | BridgeResponse | BridgeEvent) => {
    eventHandlers.forEach((fn) => fn(raw));
  }) as Window["nativeBridgeEvent"];
  (bridgeFn as unknown as { _handlers: typeof eventHandlers })._handlers =
    eventHandlers;
  window.nativeBridgeEvent = bridgeFn;
}
window.nativeBridgeEvent!._handlers.push(handleEvent);

export { send, onEvent };

