import type { FlowboardChange } from "../../contract/index.js";
import type { OpenClawPluginService } from "../api.js";
import type { FlowboardStore } from "./store.js";

const FLOWBOARD_EXTERNAL_CHANGE_CHECK_MS = 1000;

export function createFlowboardChangeEventService(store: FlowboardStore): OpenClawPluginService {
  let unsubscribe: (() => void) | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;

  return {
    id: "flowboard-change-events",
    start(ctx) {
      if (unsubscribe) {
        return;
      }
      // OpenClaw 2026.7.1-2 exposes no plugin gateway event bus. Keep the
      // store reconciliation service active; newer hosts can layer events on
      // top without changing the persistence contract.
      unsubscribe = store.subscribeChanges((_change: FlowboardChange) => undefined);
      store.announceChangeEpoch();
      timer = setInterval(() => {
        try {
          store.reconcileExternalChanges();
        } catch (error) {
          ctx.logger.warn(`flowboard external change check failed: ${String(error)}`);
        }
      }, FLOWBOARD_EXTERNAL_CHANGE_CHECK_MS);
      timer.unref?.();
    },
    stop() {
      unsubscribe?.();
      unsubscribe = undefined;
      if (timer) {
        clearInterval(timer);
        timer = undefined;
      }
    },
  };
}
