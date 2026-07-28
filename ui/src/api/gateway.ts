export class GatewayRequestError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly gatewayCode?: string,
  ) {
    super(message);
    this.name = "GatewayRequestError";
  }
}

export type GatewayBrowserClient = {
  request<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T>;
};
