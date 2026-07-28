import { signAsync } from "@noble/ed25519";

type DeviceIdentity = {
  deviceId: string;
  publicKey: string;
  privateKey: string;
};

type DeviceTokenStore = {
  version: 1;
  deviceId: string;
  tokens: Record<string, { token: string; scopes?: string[] }>;
};

type GatewayResponse = {
  type: "res";
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: { code?: string; message?: string; details?: unknown };
};

type GatewayEvent = {
  type: "event";
  event?: string;
  payload?: unknown;
};

type PendingRequest = {
  resolve: (payload: unknown) => void;
  reject: (error: Error) => void;
};

const IDENTITY_KEY = "openclaw-device-identity-v1";
const DEVICE_AUTH_KEY = "openclaw.device.auth.v1";
const DEFAULT_SCOPES = [
  "operator.admin",
  "operator.read",
  "operator.write",
  "operator.approvals",
  "operator.pairing",
];

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(
    value.length + ((4 - (value.length % 4)) % 4),
    "=",
  );
  const decoded = atob(padded);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let text = "";
  for (const byte of bytes) {
    text += String.fromCharCode(byte);
  }
  return btoa(text).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function readJson(key: string): unknown {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function gatewayScope(url: string): string {
  try {
    const gateway = new URL(url, window.location.href);
    const pathname = gateway.pathname === "/" ? "" : gateway.pathname.replace(/\/+$/, "");
    return `${gateway.protocol}//${gateway.host}${pathname}`;
  } catch {
    return url;
  }
}

function readIdentity(): DeviceIdentity | null {
  const value = readJson(IDENTITY_KEY);
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidate = value as Partial<DeviceIdentity> & { version?: unknown };
  if (
    candidate.version !== 1 ||
    typeof candidate.deviceId !== "string" ||
    typeof candidate.publicKey !== "string" ||
    typeof candidate.privateKey !== "string"
  ) {
    return null;
  }
  return {
    deviceId: candidate.deviceId,
    publicKey: candidate.publicKey,
    privateKey: candidate.privateKey,
  };
}

function normalizeScopes(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const scopes = [...new Set(value.filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean))];
  if (scopes.includes("operator.admin")) {
    for (const scope of ["operator.read", "operator.write"]) {
      if (!scopes.includes(scope)) {
        scopes.push(scope);
      }
    }
  } else if (scopes.includes("operator.write") && !scopes.includes("operator.read")) {
    scopes.push("operator.read");
  }
  return scopes.sort();
}

function readDeviceToken(gatewayUrl: string, deviceId: string): { token?: string; scopes: string[] } {
  const scoped = readJson(`${DEVICE_AUTH_KEY}:${gatewayScope(gatewayUrl)}`);
  const legacy = scoped ?? readJson(DEVICE_AUTH_KEY);
  if (!legacy || typeof legacy !== "object") {
    return { scopes: DEFAULT_SCOPES };
  }
  const store = legacy as Partial<DeviceTokenStore>;
  const entry = store.deviceId === deviceId ? store.tokens?.operator : undefined;
  if (!entry || typeof entry.token !== "string" || !entry.token.trim()) {
    return { scopes: DEFAULT_SCOPES };
  }
  const scopes = normalizeScopes(entry.scopes);
  return { token: entry.token, scopes: scopes.length ? scopes : DEFAULT_SCOPES };
}

function gatewayWebSocketUrl(): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}`;
}

function deviceMessage(params: {
  deviceId: string;
  clientId: string;
  clientMode: string;
  role: string;
  scopes: string[];
  signedAtMs: number;
  token?: string;
  nonce: string;
}): string {
  return [
    "v2",
    params.deviceId,
    params.clientId,
    params.clientMode,
    params.role,
    params.scopes.join(","),
    String(params.signedAtMs),
    params.token ?? "",
    params.nonce,
  ].join("|");
}

export type FlowboardGatewayState = {
  connected: boolean;
  error?: string;
};

export class FlowboardGatewayClient {
  private socket: WebSocket | null = null;
  private pending = new Map<string, PendingRequest>();
  private stopped = false;
  private reconnectTimer: number | null = null;
  private connectTimer: number | null = null;
  private connectSent = false;
  private connectNonce = "";

  constructor(
    private readonly options: {
      onState: (state: FlowboardGatewayState) => void;
      onEvent?: (event: GatewayEvent) => void;
      url?: string;
    },
  ) {}

  get connected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN && this.connectSent;
  }

  start(): void {
    this.stopped = false;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.connectTimer !== null) {
      window.clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
    this.rejectPending(new Error("Gateway client stopped."));
  }

  request<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    if (!this.connected || !this.socket) {
      return Promise.reject(new Error("Gateway is not connected."));
    }
    const id = crypto.randomUUID();
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (payload: unknown) => void, reject });
      this.socket?.send(JSON.stringify({ type: "req", id, method, params }));
    });
  }

  private connect(): void {
    if (this.stopped) {
      return;
    }
    const url = this.options.url ?? gatewayWebSocketUrl();
    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch (error) {
      this.handleDisconnect(error instanceof Error ? error.message : String(error));
      return;
    }
    this.socket = socket;
    this.connectSent = false;
    this.connectNonce = "";
    socket.addEventListener("open", () => {
      this.connectTimer = window.setTimeout(() => {
        this.connectTimer = null;
        void this.sendConnect(socket);
      }, 750);
    });
    socket.addEventListener("message", (message) => this.handleMessage(socket, String(message.data)));
    socket.addEventListener("close", () => {
      if (this.socket === socket) {
        this.socket = null;
        this.connectSent = false;
        this.handleDisconnect("Gateway connection closed.");
      }
    });
    socket.addEventListener("error", () => {
      // The close event carries the useful lifecycle signal.
    });
  }

  private async sendConnect(socket: WebSocket): Promise<void> {
    if (socket !== this.socket || socket.readyState !== WebSocket.OPEN || this.connectSent) {
      return;
    }
    const identity = readIdentity();
    if (!identity) {
      this.handleDisconnect(
        "Control UI device identity is unavailable. Open flowboard from the paired Gateway Control UI with embedSandbox set to trusted.",
        false,
      );
      socket.close();
      return;
    }
    const url = this.options.url ?? gatewayWebSocketUrl();
    const auth = readDeviceToken(url, identity.deviceId);
    const scopes = auth.scopes;
    const signedAt = Date.now();
    const client = {
      id: "openclaw-control-ui",
      version: "control-ui",
      platform: navigator.platform,
      mode: "webchat",
    };
    try {
      const signature = await signAsync(
        new TextEncoder().encode(
          deviceMessage({
            deviceId: identity.deviceId,
            clientId: client.id,
            clientMode: client.mode,
            role: "operator",
            scopes,
            signedAtMs: signedAt,
            token: auth.token,
            nonce: this.connectNonce,
          }),
        ),
        base64UrlToBytes(identity.privateKey),
      );
      if (socket !== this.socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }
      this.connectSent = true;
      socket.send(
        JSON.stringify({
          type: "req",
          id: crypto.randomUUID(),
          method: "connect",
          params: {
            minProtocol: 4,
            maxProtocol: 4,
            client,
            role: "operator",
            scopes,
            caps: ["tool-events"],
            auth: auth.token ? { token: auth.token } : undefined,
            device: {
              id: identity.deviceId,
              publicKey: identity.publicKey,
              signature: bytesToBase64Url(signature),
              signedAt,
              nonce: this.connectNonce,
            },
            userAgent: navigator.userAgent,
            locale: navigator.language,
          },
        }),
      );
    } catch (error) {
      this.handleDisconnect(error instanceof Error ? error.message : String(error), false);
      socket.close();
    }
  }

  private handleMessage(socket: WebSocket, raw: string): void {
    if (socket !== this.socket) {
      return;
    }
    let frame: GatewayResponse | GatewayEvent;
    try {
      frame = JSON.parse(raw) as GatewayResponse | GatewayEvent;
    } catch {
      return;
    }
    if (frame.type === "event") {
      if (frame.event === "connect.challenge") {
        const nonce =
          frame.payload && typeof frame.payload === "object" && "nonce" in frame.payload
            ? (frame.payload as { nonce?: unknown }).nonce
            : undefined;
        if (typeof nonce === "string") {
          this.connectNonce = nonce;
          if (this.connectTimer !== null) {
            window.clearTimeout(this.connectTimer);
            this.connectTimer = null;
          }
          void this.sendConnect(socket);
        }
        return;
      }
      this.options.onEvent?.(frame);
      return;
    }
    if (frame.type !== "res") {
      return;
    }
    const pending = this.pending.get(frame.id);
    if (!pending) {
      if (frame.ok) {
        this.options.onState({ connected: true });
      } else {
        const message = frame.error?.message ?? "Gateway connection failed.";
        this.connectSent = false;
        this.options.onState({ connected: false, error: message });
      }
      return;
    }
    this.pending.delete(frame.id);
    if (frame.ok) {
      pending.resolve(frame.payload);
    } else {
      pending.reject(new Error(frame.error?.message ?? "Gateway request failed."));
    }
  }

  private handleDisconnect(error: string, retry = true): void {
    this.options.onState({ connected: false, error });
    this.rejectPending(new Error(error));
    if (!this.stopped && retry && this.reconnectTimer === null) {
      this.reconnectTimer = window.setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, 1500);
    }
  }

  private rejectPending(error: Error): void {
    for (const request of this.pending.values()) {
      request.reject(error);
    }
    this.pending.clear();
  }
}
