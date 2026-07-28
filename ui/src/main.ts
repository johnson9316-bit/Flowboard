import { LitElement, html } from "lit";
import type { GatewayBrowserClient } from "./api/gateway.ts";
import type { WorkboardChange } from "./workboard-contract.ts";
import { FlowboardGatewayClient, type FlowboardGatewayState } from "./gateway-client.ts";
import { i18n } from "./i18n/index.ts";
import {
  configureWorkboardLiveRefresh,
  handleWorkboardChanged,
  loadWorkboard,
  resumeWorkboardLiveRefresh,
  stopWorkboardLifecycleRefresh,
  stopWorkboardLiveRefresh,
} from "./lib/workboard/index.ts";
import { renderWorkboard } from "./pages/workboard/view.ts";
import "./host.css";

type ChangeWaitResult = {
  change?: WorkboardChange;
  timedOut?: boolean;
};

function mapFlowboardMethod(method: string): string {
  return method.startsWith("workboard.") ? `flowboard.${method.slice("workboard.".length)}` : method;
}

function validChange(value: unknown): value is WorkboardChange {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as WorkboardChange).epoch === "string" &&
      Number.isSafeInteger((value as WorkboardChange).revision),
  );
}

class FlowboardWorkboardHost extends LitElement {
  private connectedToGateway = false;
  private stopped = false;
  private changeLoopGeneration = 0;
  private changeCursor: WorkboardChange | undefined;
  private unsubscribeI18n?: () => void;
  private readonly client: GatewayBrowserClient = {
    request: async <T>(method: string, params: Record<string, unknown> = {}) =>
      await this.gateway.request<T>(mapFlowboardMethod(method), params),
  };
  private readonly gateway = new FlowboardGatewayClient({
    onState: (state) => this.handleGatewayState(state),
    onEvent: (event) => {
      if (event.event === "plugin.flowboard.changed") {
        handleWorkboardChanged(this, event.payload);
      }
    },
  });

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this.stopped = false;
    this.unsubscribeI18n = i18n.subscribe(() => this.requestUpdate());
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    this.gateway.start();
  }

  disconnectedCallback() {
    this.stopped = true;
    this.changeLoopGeneration += 1;
    this.unsubscribeI18n?.();
    this.unsubscribeI18n = undefined;
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    stopWorkboardLiveRefresh(this);
    stopWorkboardLifecycleRefresh(this);
    this.gateway.stop();
    super.disconnectedCallback();
  }

  private readonly handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      resumeWorkboardLiveRefresh(this);
    }
  };

  private handleGatewayState(state: FlowboardGatewayState) {
    const wasConnected = this.connectedToGateway;
    this.connectedToGateway = state.connected;
    if (state.connected && !wasConnected) {
      configureWorkboardLiveRefresh({
        host: this,
        client: this.client,
        requestUpdate: () => this.requestUpdate(),
      });
      void this.loadInitialState();
      this.startChangeWait();
    } else if (!state.connected && wasConnected) {
      this.changeLoopGeneration += 1;
      stopWorkboardLiveRefresh(this);
      stopWorkboardLifecycleRefresh(this);
    }
    this.requestUpdate();
  }

  private async loadInitialState() {
    await loadWorkboard({
      host: this,
      client: this.client,
      requestUpdate: () => this.requestUpdate(),
      refreshDiagnostics: true,
      taskRefresh: "all",
    });
  }

  private startChangeWait() {
    const generation = ++this.changeLoopGeneration;
    void this.waitForChanges(generation);
  }

  private async waitForChanges(generation: number) {
    while (
      !this.stopped &&
      generation === this.changeLoopGeneration &&
      this.connectedToGateway
    ) {
      try {
        const result = await this.gateway.request<ChangeWaitResult>("flowboard.changes.wait", {
          ...(this.changeCursor ? { after: this.changeCursor } : {}),
          timeoutMs: 25_000,
        });
        if (generation !== this.changeLoopGeneration || !this.connectedToGateway) {
          return;
        }
        if (validChange(result.change)) {
          const wasUninitialized = this.changeCursor === undefined;
          this.changeCursor = result.change;
          if (!wasUninitialized && !result.timedOut) {
            handleWorkboardChanged(this, result.change);
          }
        }
      } catch {
        if (generation !== this.changeLoopGeneration || !this.connectedToGateway) {
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 1_000));
      }
    }
  }

  render() {
    return html`
      <header class="flowboard-host-header">
        <strong>flowboard</strong>
        <span class=${this.connectedToGateway ? "is-connected" : ""}>
          ${this.connectedToGateway ? "Connected" : "Connecting"}
        </span>
      </header>
      ${renderWorkboard({
        host: this,
        client: this.connectedToGateway ? this.client : null,
        connected: this.connectedToGateway,
        canWrite: true,
        canGrant: true,
        canModelOverride: true,
        pluginEnabled: true,
        agentsList: null,
        sessions: [],
        onOpenSession: () => undefined,
        onRequestUpdate: () => this.requestUpdate(),
      })}
    `;
  }
}

if (!customElements.get("flowboard-workboard")) {
  customElements.define("flowboard-workboard", FlowboardWorkboardHost);
}

document.body.replaceChildren(document.createElement("flowboard-workboard"));
