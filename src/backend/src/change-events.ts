import type { OpenClawPluginService } from "../api.js";
import type { FlowboardStore } from "./store.js";

const FLOWBOARD_EXTERNAL_CHANGE_CHECK_MS = 1000;

export function createFlowboardChangeEventService(store: FlowboardStore): OpenClawPluginService {
  let timer: ReturnType<typeof setInterval> | undefined;

  return {
    id: "flowboard-change-events",
    start(ctx) {
      if (timer) {
        return;
      }
      store.announceChangeEpoch();
      // Picks up writes committed by another process on the same database, which
      // an in-process listener cannot observe. Waiting clients are notified
      // through the change cursor they already long-wait on.
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
      if (timer) {
        clearInterval(timer);
        timer = undefined;
      }
    },
  };
}
