import { LitElement, html } from "lit";
import type {
  FlowboardBoardSummary,
  FlowboardProjectDocument,
  FlowboardProjectView,
  FlowboardStatus,
} from "../../src/contract/index.ts";
import { FlowboardGatewayClient, type FlowboardGatewayState } from "./gateway-client.ts";
import { startFlowboardHostSync } from "./host-context.ts";
import { i18n } from "./i18n/index.ts";
import {
  createFlowboardProjectUiState,
  renderFlowboardProjects,
  type FlowboardProjectModal,
  type FlowboardProjectUiState,
} from "./pages/projects/project-view.ts";
import "./host.css";

type ChangeCursor = {
  epoch: string;
  revision: number;
};

type ChangeWaitResult = {
  change?: ChangeCursor;
  timedOut?: boolean;
};

type ProjectListResponse = {
  projects: FlowboardBoardSummary[];
};

type ProjectResponse = {
  project: FlowboardProjectView;
};

type ProjectDocumentsResponse = {
  documents: FlowboardProjectDocument[];
};

function validChange(value: unknown): value is ChangeCursor {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as ChangeCursor).epoch === "string" &&
      Number.isSafeInteger((value as ChangeCursor).revision),
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

class FlowboardProjectHost extends LitElement {
  private connectedToGateway = false;
  private stopped = false;
  private changeLoopGeneration = 0;
  private changeCursor: ChangeCursor | undefined;
  private refreshGeneration = 0;
  private unsubscribeI18n?: () => void;
  private stopHostSync?: () => void;
  private readonly state: FlowboardProjectUiState = createFlowboardProjectUiState();
  private readonly gateway = new FlowboardGatewayClient({
    onState: (state) => this.handleGatewayState(state),
    onEvent: (event) => {
      if (event.event === "plugin.flowboard.changed") {
        void this.refresh();
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
    this.stopHostSync = startFlowboardHostSync({
      onLocale: (locale) => {
        document.documentElement.lang = locale;
        void i18n.setLocale(locale, { persist: false });
      },
    });
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    this.gateway.start();
  }

  disconnectedCallback() {
    this.stopped = true;
    this.changeLoopGeneration += 1;
    this.refreshGeneration += 1;
    this.unsubscribeI18n?.();
    this.unsubscribeI18n = undefined;
    this.stopHostSync?.();
    this.stopHostSync = undefined;
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.gateway.stop();
    super.disconnectedCallback();
  }

  private readonly handleVisibilityChange = () => {
    if (document.visibilityState === "visible" && this.connectedToGateway) {
      void this.refresh();
    }
  };

  private handleGatewayState(state: FlowboardGatewayState) {
    const wasConnected = this.connectedToGateway;
    this.connectedToGateway = state.connected;
    if (state.connected && !wasConnected) {
      void this.refresh();
      this.startChangeWait();
    } else if (!state.connected && wasConnected) {
      this.changeLoopGeneration += 1;
    }
    this.requestUpdate();
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
            void this.refresh();
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

  private async refresh() {
    if (!this.connectedToGateway) {
      return;
    }
    const generation = ++this.refreshGeneration;
    this.state.loading = true;
    this.state.error = null;
    this.requestUpdate();
    try {
      const list = await this.gateway.request<ProjectListResponse>("flowboard.projects.list", {
        includeArchived: true,
      });
      if (generation !== this.refreshGeneration) {
        return;
      }
      this.state.projects = list.projects;
      const selectedId = this.state.selectedProjectId;
      if (selectedId && !list.projects.some((project) => project.id === selectedId)) {
        this.state.selectedProjectId = null;
        this.state.project = null;
        this.state.documents = [];
        this.state.screen = "overview";
      } else if (selectedId) {
        const project = await this.gateway.request<ProjectResponse>("flowboard.projects.get", {
          id: selectedId,
        });
        if (generation !== this.refreshGeneration) {
          return;
        }
        this.state.project = project.project;
        if (this.state.screen === "documents") {
          const documents = await this.gateway.request<ProjectDocumentsResponse>(
            "flowboard.projects.documents.list",
            {
              boardId: selectedId,
              includeHidden: this.state.showHiddenDocuments,
            },
          );
          if (generation !== this.refreshGeneration) {
            return;
          }
          this.state.documents = documents.documents;
        }
      }
      this.state.loaded = true;
    } catch (error) {
      if (generation === this.refreshGeneration) {
        this.state.error = errorMessage(error);
      }
    } finally {
      if (generation === this.refreshGeneration) {
        this.state.loading = false;
        this.requestUpdate();
      }
    }
  }

  private selectProject(id: string) {
    this.state.selectedProjectId = id;
    this.state.screen = "board";
    this.state.documents = [];
    void this.refresh();
  }

  private setScreen(screen: FlowboardProjectUiState["screen"]) {
    if (screen !== "overview" && !this.state.selectedProjectId) {
      this.state.screen = "overview";
      this.requestUpdate();
      return;
    }
    this.state.screen = screen;
    if (screen === "documents") {
      void this.refresh();
    } else {
      this.requestUpdate();
    }
  }

  private openModal(modal: FlowboardProjectModal) {
    this.state.modal = modal;
    this.requestUpdate();
  }

  private closeModal() {
    this.state.modal = null;
    this.requestUpdate();
  }

  private async mutate(action: () => Promise<void>, options: { closeModal?: boolean } = {}) {
    if (this.state.busy) {
      return;
    }
    this.state.busy = true;
    this.state.error = null;
    this.requestUpdate();
    try {
      await action();
      if (options.closeModal !== false) {
        this.state.modal = null;
      }
      await this.refresh();
    } catch (error) {
      this.state.error = errorMessage(error);
      this.requestUpdate();
    } finally {
      this.state.busy = false;
      this.requestUpdate();
    }
  }

  private createProject(data: Record<string, string>) {
    void this.mutate(async () => {
      const response = await this.gateway.request<ProjectResponse>("flowboard.projects.create", {
        id: data.id,
        name: data.name,
        initialMilestoneTitle: data.initialMilestoneTitle,
      });
      this.state.selectedProjectId = response.project.board.id;
      this.state.screen = "board";
    });
  }

  private updateProject(data: Record<string, string>) {
    const project = this.state.project;
    if (!project) {
      return;
    }
    void this.mutate(async () => {
      const workspacePath = data.workspacePath?.trim();
      await this.gateway.request("flowboard.projects.update", {
        id: project.board.id,
        name: data.name,
        version: data.version,
        currentObjective: data.currentObjective,
        coreValue: data.coreValue,
        sourceOfTruth: data.sourceOfTruth,
        repositoryUrl: data.repositoryUrl,
        planningPath: data.planningPath,
        homepageUrl: data.homepageUrl,
        ...(workspacePath
          ? { defaultWorkspace: { kind: "dir", path: workspacePath } }
          : {}),
      });
    }, { closeModal: false });
  }

  private archiveProject(archived: boolean) {
    const project = this.state.project;
    if (!project) {
      return;
    }
    if (
      archived &&
      !window.confirm(
        i18n.t("flowboardProject.archiveProjectConfirm"),
      )
    ) {
      return;
    }
    void this.mutate(async () => {
      await this.gateway.request(
        archived ? "flowboard.projects.archive" : "flowboard.projects.restore",
        { id: project.board.id },
      );
    }, { closeModal: false });
  }

  private createCard(data: Record<string, string>) {
    const project = this.state.project;
    if (!project) {
      return;
    }
    void this.mutate(async () => {
      await this.gateway.request("flowboard.cards.create", {
        boardId: project.board.id,
        title: data.title,
        notes: data.notes,
        status: data.status,
        priority: data.priority,
        agentId: data.agentId,
        ...(data.milestoneId ? { milestoneId: data.milestoneId } : {}),
      });
    });
  }

  private updateCardStatus(id: string, status: FlowboardStatus) {
    void this.mutate(async () => {
      await this.gateway.request("flowboard.cards.move", { id, status });
    }, { closeModal: false });
  }

  private archiveCard(id: string, archived: boolean) {
    void this.mutate(async () => {
      await this.gateway.request("flowboard.cards.archive", { id, archived });
    }, { closeModal: false });
  }

  private moveCardMilestone(id: string, milestoneId?: string, position?: number) {
    const project = this.state.project;
    if (project?.board.archivedAt) {
      return;
    }
    void this.mutate(async () => {
      await this.gateway.request("flowboard.cards.moveMilestone", {
        id,
        ...(milestoneId ? { milestoneId } : {}),
        ...(position !== undefined ? { position } : {}),
      });
    }, { closeModal: false });
  }

  private moveCardProject(id: string, boardId: string) {
    const target = this.state.projects.find((project) => project.id === boardId);
    if (
      !target ||
      !window.confirm(
        i18n.t("flowboardProject.moveProjectConfirm", { project: target.name || target.id }),
      )
    ) {
      return;
    }
    void this.mutate(async () => {
      await this.gateway.request("flowboard.cards.moveProject", { id, boardId });
    });
  }

  private saveMilestone(data: Record<string, string>) {
    const project = this.state.project;
    if (!project) {
      return;
    }
    void this.mutate(async () => {
      if (data.id) {
        await this.gateway.request("flowboard.projects.milestones.update", {
          id: data.id,
          title: data.title,
          description: data.description,
          color: data.color,
        });
        return;
      }
      await this.gateway.request("flowboard.projects.milestones.create", {
        boardId: project.board.id,
        title: data.title,
        description: data.description,
        color: data.color,
      });
    });
  }

  private completeMilestone(id: string) {
    void this.mutate(async () => {
      await this.gateway.request("flowboard.projects.milestones.complete", { id });
    }, { closeModal: false });
  }

  private archiveMilestone(id: string, archived: boolean) {
    void this.mutate(async () => {
      await this.gateway.request(
        archived ? "flowboard.projects.milestones.archive" : "flowboard.projects.milestones.restore",
        { id },
      );
    }, { closeModal: false });
  }

  private saveDocument(data: Record<string, string>) {
    const project = this.state.project;
    if (!project) {
      return;
    }
    void this.mutate(async () => {
      const common = {
        title: data.title,
        type: data.type,
        summary: data.summary,
        target: data.target,
        content: data.content,
      };
      if (data.id) {
        await this.gateway.request("flowboard.projects.documents.update", { id: data.id, ...common });
        return;
      }
      await this.gateway.request("flowboard.projects.documents.create", {
        boardId: project.board.id,
        key: data.key,
        section: data.section,
        ...common,
      });
    });
  }

  private hideDocument(id: string, hidden: boolean) {
    void this.mutate(async () => {
      await this.gateway.request(
        hidden ? "flowboard.projects.documents.hide" : "flowboard.projects.documents.restore",
        { id },
      );
    }, { closeModal: false });
  }

  private deleteDocument(id: string) {
    if (!window.confirm(i18n.t("common.delete"))) {
      return;
    }
    void this.mutate(async () => {
      await this.gateway.request("flowboard.projects.documents.delete", { id });
    }, { closeModal: false });
  }

  render() {
    return html`${renderFlowboardProjects({
      state: this.state,
      connected: this.connectedToGateway,
      requestUpdate: () => this.requestUpdate(),
      refresh: () => void this.refresh(),
      selectProject: (id) => this.selectProject(id),
      setScreen: (screen) => this.setScreen(screen),
      openModal: (modal) => this.openModal(modal),
      closeModal: () => this.closeModal(),
      createProject: (data) => this.createProject(data),
      updateProject: (data) => this.updateProject(data),
      archiveProject: (archived) => this.archiveProject(archived),
      createCard: (data) => this.createCard(data),
      updateCardStatus: (id, status) => this.updateCardStatus(id, status),
      archiveCard: (id, archived) => this.archiveCard(id, archived),
      moveCardMilestone: (id, milestoneId, position) =>
        this.moveCardMilestone(id, milestoneId, position),
      moveCardProject: (id, boardId) => this.moveCardProject(id, boardId),
      saveMilestone: (data) => this.saveMilestone(data),
      completeMilestone: (id) => this.completeMilestone(id),
      archiveMilestone: (id, archived) => this.archiveMilestone(id, archived),
      saveDocument: (data) => this.saveDocument(data),
      hideDocument: (id, hidden) => this.hideDocument(id, hidden),
      deleteDocument: (id) => this.deleteDocument(id),
    })}`;
  }
}

if (!customElements.get("flowboard-workboard")) {
  customElements.define("flowboard-workboard", FlowboardProjectHost);
}

document.body.replaceChildren(document.createElement("flowboard-workboard"));
