import type { TaskfoldCard } from "../../contract/index.js";

export function redactClaimToken(card: TaskfoldCard): TaskfoldCard {
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
