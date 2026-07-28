export function listSelectableAgents<T extends { kind?: string }>(agents: readonly T[]): T[] {
  return agents.filter((agent) => agent.kind !== "system");
}
