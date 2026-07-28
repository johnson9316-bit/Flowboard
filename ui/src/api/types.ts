export type GatewaySessionRow = {
  key: string;
  label?: string;
  displayName?: string;
  status?: string;
  kind?: string;
  updatedAt?: number;
  archived?: boolean;
  hasActiveRun?: boolean;
  abortedLastRun?: boolean;
};

export type AgentsListResult = {
  defaultId?: string;
  agents: Array<{
    id: string;
    name?: string;
    kind?: string;
    identity?: { name?: string };
    agentRuntime?: { id?: string };
  }>;
};
