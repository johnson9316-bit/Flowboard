// Flowboard API module exposes the plugin public contract.
export { registerFlowboardGatewayMethods } from "./src/gateway.js";
export type {
  FlowboardCard,
  FlowboardClaim,
  FlowboardDiagnostic,
  FlowboardListResult,
  FlowboardPriority,
  FlowboardStatus,
} from "../contract/index.js";
