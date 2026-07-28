import type { FlowboardCard } from "../../contract/index.js";

export function redactClaimToken(card: FlowboardCard): FlowboardCard {
  const claim = card.metadata?.claim;
  if (!claim) {
    return card;
  }
  return {
    ...card,
    metadata: {
      ...card.metadata,
      claim: {
        ...claim,
        token: "[redacted]",
      },
    },
  };
}
