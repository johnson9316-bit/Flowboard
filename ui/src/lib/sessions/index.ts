import type { GatewayBrowserClient } from "../../api/gateway.ts";

export async function requestSessionCreate(
  client: GatewayBrowserClient,
  params: Record<string, unknown>,
): Promise<unknown> {
  return await client.request("sessions.create", params);
}
