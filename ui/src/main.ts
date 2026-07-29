import { LitElement, html } from "lit";
import type {
  FlowboardBoardSummary,
  FlowboardProjectDocument,
  FlowboardProjectDocumentRead,
  FlowboardProjectView,
  FlowboardStatus,
} from "../../src/contract/index.ts";
import { FlowboardGatewayClient, type FlowboardGatewayState } from "./gateway-client.ts";
import {
  readInitialFlowboardHostLocale,
  startFlowboardThemeSync,
  type FlowboardLocale,
} from "./host-context.ts";
import { i18n } from "./i18n/index.ts";
import { flowboardEditorHtmlToMarkdown } from "./lib/markdown.ts";
import {
  createFlowboardProjectUiState,
  renderFlowboardProjects,
  type FlowboardCardExecutionInspection,
  type FlowboardCardExecutionPreparation,
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

type ProjectDocumentReadResponse = {
  preview: FlowboardProjectDocumentRead;
};

type ProjectDocumentWriteResponse = {
  preview: FlowboardProjectDocumentRead;
};

type CardExecutionPreparationResponse = FlowboardCardExecutionPreparation;

type CardExecutionInspectionResponse = FlowboardCardExecutionInspection;

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

function normalizeProjectDocument(document: FlowboardProjectDocument): FlowboardProjectDocument {
  return {
    ...document,
    source: document.source ?? "project",
  };
}

function normalizeProjectDocumentRead(
  preview: FlowboardProjectDocumentRead,
): FlowboardProjectDocumentRead {
  return {
    ...preview,
    document: normalizeProjectDocument(preview.document),
  };
}

class FlowboardProjectHost extends LitElement {
  private connectedToGateway = false;
  private stopped = false;
  private changeLoopGeneration = 0;
  private changeCursor: ChangeCursor | undefined;
  private refreshGeneration = 0;
  private executionRefreshTimer: number | null = null;
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
    this.unsubscribeI18n = i18n.subscribe((locale) => {
      document.documentElement.lang = locale;
      this.requestUpdate();
    });
    this.stopHostSync = startFlowboardThemeSync();
    document.documentElement.lang = i18n.getLocale();
    this.state.languageSwitching = true;
    void i18n
      .initialize(readInitialFlowboardHostLocale())
      .then((applied) => {
        if (!applied && !this.stopped) {
          this.state.languageError = i18n.t("flowboardProject.languageChangeFailed");
        }
      })
      .finally(() => {
        if (!this.stopped) {
          this.state.languageSwitching = false;
          this.requestUpdate();
        }
      });
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    this.gateway.start();
  }

  disconnectedCallback() {
    this.stopped = true;
    this.changeLoopGeneration += 1;
    this.refreshGeneration += 1;
    this.clearExecutionRefreshTimer();
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

  private setLocale(locale: FlowboardLocale) {
    if (this.state.languageSwitching) {
      return;
    }
    this.state.languageSwitching = true;
    this.state.languageError = null;
    this.requestUpdate();
    void i18n
      .setLocale(locale)
      .then((applied) => {
        if (!applied && !this.stopped) {
          this.state.languageError = i18n.t("flowboardProject.languageChangeFailed");
        }
      })
      .finally(() => {
        if (!this.stopped) {
          this.state.languageSwitching = false;
          this.requestUpdate();
        }
      });
  }

  private handleGatewayState(state: FlowboardGatewayState) {
    const wasConnected = this.connectedToGateway;
    this.connectedToGateway = state.connected;
    if (state.connected && !wasConnected) {
      void this.refresh();
      this.startChangeWait();
    } else if (!state.connected && wasConnected) {
      this.changeLoopGeneration += 1;
    }
    if (!state.connected && state.error) {
      this.state.error = state.error;
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
        this.state.selectedDocumentId = null;
        this.state.documentPreview = null;
        this.state.documentPreviewError = null;
        this.state.documentEditing = false;
        this.state.documentDraft = null;
        this.clearExecutionState();
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
              includeHidden: true,
            },
          );
          if (generation !== this.refreshGeneration) {
            return;
          }
          this.state.documents = documents.documents.map(normalizeProjectDocument);
          if (
            this.state.selectedDocumentId &&
            !documents.documents.some((document) => document.id === this.state.selectedDocumentId)
          ) {
            this.state.selectedDocumentId = null;
            this.state.documentPreview = null;
            this.state.documentPreviewError = null;
            this.state.documentEditing = false;
            this.state.documentDraft = null;
          }
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
    this.state.selectedDocumentId = null;
    this.state.documentPreview = null;
    this.state.documentPreviewError = null;
    this.state.documentEditing = false;
    this.state.documentDraft = null;
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
    this.clearExecutionRefreshTimer();
    this.state.modal = modal;
    this.requestUpdate();
    if (modal.kind === "card-detail") {
      void this.refreshCardExecution(modal.cardId);
    }
  }

  private closeModal() {
    this.clearExecutionRefreshTimer();
    this.state.modal = null;
    this.requestUpdate();
  }

  private clearExecutionRefreshTimer() {
    if (this.executionRefreshTimer !== null) {
      window.clearTimeout(this.executionRefreshTimer);
      this.executionRefreshTimer = null;
    }
  }

  private clearExecutionState() {
    this.clearExecutionRefreshTimer();
    this.state.executionPreparationCardId = null;
    this.state.executionPreparation = null;
    this.state.executionPreparationLoading = false;
    this.state.executionPreparationError = null;
    this.state.executionInspectionCardId = null;
    this.state.executionInspection = null;
    this.state.executionInspectionLoading = false;
    this.state.executionInspectionError = null;
  }

  private scheduleExecutionRefresh(cardId: string) {
    this.clearExecutionRefreshTimer();
    if (
      this.stopped ||
      !this.connectedToGateway ||
      this.state.modal?.kind !== "card-detail" ||
      this.state.modal.cardId !== cardId
    ) {
      return;
    }
    this.executionRefreshTimer = window.setTimeout(() => {
      this.executionRefreshTimer = null;
      void this.refreshCardExecution(cardId);
    }, 3_000);
  }

  private async mutate(action: () => Promise<void>, options: { closeModal?: boolean } = {}) {
    if (this.state.busy) {
      return;
    }
    if (!this.connectedToGateway) {
      this.state.error = i18n.t("flowboardProject.connectionRequired");
      this.requestUpdate();
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

  private moveCardProject(id: string, boardId: string, milestoneId: string) {
    const target = this.state.projects.find((project) => project.id === boardId);
    if (!target || !milestoneId) {
      return;
    }
    void this.mutate(async () => {
      await this.gateway.request("flowboard.cards.moveProject", { id, boardId, milestoneId });
    });
  }

  private selectMoveCardProjectTarget(cardId: string, boardId: string) {
    if (!boardId) {
      this.state.modal = { kind: "move-project", cardId };
      this.requestUpdate();
      return;
    }
    this.state.modal = { kind: "move-project", cardId, boardId };
    this.state.busy = true;
    this.state.error = null;
    this.requestUpdate();
    void this.gateway
      .request<ProjectResponse>("flowboard.projects.get", { id: boardId })
      .then((response) => {
        const modal = this.state.modal;
        if (
          modal?.kind === "move-project" &&
          modal.cardId === cardId &&
          modal.boardId === boardId
        ) {
          this.state.modal = { ...modal, targetProject: response.project };
        }
      })
      .catch((error) => {
        this.state.error = errorMessage(error);
      })
      .finally(() => {
        this.state.busy = false;
        this.requestUpdate();
      });
  }

  private reorderProjects(ids: string[]) {
    void this.mutate(async () => {
      await this.gateway.request("flowboard.projects.reorder", { ids });
    }, { closeModal: false });
  }

  private reorderMilestones(milestoneIds: string[]) {
    const project = this.state.project;
    if (!project || project.board.archivedAt) {
      return;
    }
    void this.mutate(async () => {
      await this.gateway.request("flowboard.projects.milestones.reorder", {
        boardId: project.board.id,
        milestoneIds,
      });
    }, { closeModal: false });
  }

  private reorderDocuments(documentIds: string[]) {
    const project = this.state.project;
    if (!project) {
      return;
    }
    void this.mutate(async () => {
      await this.gateway.request("flowboard.projects.documents.reorder", {
        boardId: project.board.id,
        documentIds,
      });
    }, { closeModal: false });
  }

  private openDocument(id: string) {
    void this.readDocument(id);
  }

  private refreshDocument() {
    if (this.state.selectedDocumentId) {
      void this.readDocument(this.state.selectedDocumentId);
    }
  }

  private startDocumentEdit() {
    const document = this.state.documents.find(
      (candidate) => candidate.id === this.state.selectedDocumentId,
    );
    const preview = this.state.documentPreview;
    if (
      !document ||
      !preview ||
      preview.document.id !== document.id ||
      (document.type !== "markdown" && !(document.type === "path" && preview.source === "path"))
    ) {
      return;
    }
    this.state.documentDraft ??= preview.content;
    this.state.documentEditing = true;
    this.state.documentPreviewError = null;
    this.requestUpdate();
  }

  private previewDocumentDraft() {
    if (this.state.documentDraft === null) {
      return;
    }
    this.state.documentEditing = false;
    this.requestUpdate();
  }

  private formatDocument(
    command: "bold" | "italic" | "formatBlock" | "insertUnorderedList",
  ) {
    const editor = this.querySelector<HTMLElement>(".flowboard-project__rich-editor");
    if (!editor) {
      return;
    }
    editor.focus();
    document.execCommand(command, false, command === "formatBlock" ? "h2" : undefined);
    this.state.documentDraft = flowboardEditorHtmlToMarkdown(editor.innerHTML);
  }

  private cancelDocumentEdit() {
    this.state.documentEditing = false;
    this.state.documentDraft = null;
    this.state.documentPreviewError = null;
    this.requestUpdate();
  }

  private saveDocumentContent() {
    const document = this.state.documents.find(
      (candidate) => candidate.id === this.state.selectedDocumentId,
    );
    const preview = this.state.documentPreview;
    const content = this.state.documentDraft;
    if (
      this.state.busy ||
      !document ||
      !preview ||
      preview.document.id !== document.id ||
      content === null
    ) {
      return;
    }
    if (!this.connectedToGateway) {
      this.state.documentPreviewError = i18n.t("flowboardProject.connectionRequired");
      this.requestUpdate();
      return;
    }
    this.state.busy = true;
    this.state.documentPreviewError = null;
    this.requestUpdate();
    void this.gateway
      .request<ProjectDocumentWriteResponse>("flowboard.projects.documents.write", {
        id: document.id,
        content,
        expectedRevision: preview.revision,
      })
      .then((response) => {
        if (this.state.selectedDocumentId !== document.id) {
          return;
        }
        this.state.documents = this.state.documents.map((candidate) =>
          candidate.id === document.id
            ? normalizeProjectDocument(response.preview.document)
            : candidate,
        );
        this.state.documentPreview = normalizeProjectDocumentRead(response.preview);
        this.state.documentEditing = false;
        this.state.documentDraft = null;
      })
      .catch((error) => {
        if (this.state.selectedDocumentId === document.id) {
          this.state.documentPreviewError = errorMessage(error);
        }
      })
      .finally(() => {
        this.state.busy = false;
        this.requestUpdate();
      });
  }

  private async readDocument(id: string) {
    if (this.state.documentPreviewLoading) {
      return;
    }
    const selectionChanged = this.state.selectedDocumentId !== id;
    this.state.selectedDocumentId = id;
    this.state.documentPreview = null;
    this.state.documentPreviewError = null;
    if (selectionChanged) {
      this.state.documentEditing = false;
      this.state.documentDraft = null;
    }
    this.state.documentPreviewLoading = true;
    this.requestUpdate();
    try {
      const response = await this.gateway.request<ProjectDocumentReadResponse>(
        "flowboard.projects.documents.read",
        { id },
      );
      if (this.state.selectedDocumentId === id) {
        this.state.documentPreview = normalizeProjectDocumentRead(response.preview);
      }
    } catch (error) {
      if (this.state.selectedDocumentId === id) {
        this.state.documentPreviewError = errorMessage(error);
      }
    } finally {
      if (this.state.selectedDocumentId === id) {
        this.state.documentPreviewLoading = false;
        this.requestUpdate();
      }
    }
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

  private updateCardDelivery(id: string, data: Record<string, string>) {
    void this.mutate(async () => {
      await this.gateway.request("flowboard.cards.update", {
        id,
        delivery: {
          objective: data.objective,
          deliverySummary: data.deliverySummary,
          openItems: data.openItems,
          implementationState: data.implementationState,
          verificationState: data.verificationState,
          releaseState: data.releaseState,
        },
      });
    }, { closeModal: false });
  }

  private prepareCardExecution(id: string) {
    if (!this.connectedToGateway) {
      this.state.error = i18n.t("flowboardProject.connectionRequired");
      this.requestUpdate();
      return;
    }
    this.clearExecutionRefreshTimer();
    this.state.modal = { kind: "execution-start", cardId: id };
    this.state.executionPreparationCardId = id;
    this.state.executionPreparation = null;
    this.state.executionPreparationLoading = true;
    this.state.executionPreparationError = null;
    this.requestUpdate();
    void this.gateway
      .request<CardExecutionPreparationResponse>("flowboard.cards.execution.prepare", { id })
      .then((preparation) => {
        if (
          this.state.executionPreparationCardId !== id ||
          this.state.modal?.kind !== "execution-start" ||
          this.state.modal.cardId !== id
        ) {
          return;
        }
        this.state.executionPreparation = preparation;
        if (preparation.active) {
          this.state.modal = { kind: "card-detail", cardId: id };
          void this.refreshCardExecution(id);
        }
      })
      .catch((error) => {
        if (this.state.executionPreparationCardId === id) {
          this.state.executionPreparationError = errorMessage(error);
        }
      })
      .finally(() => {
        if (this.state.executionPreparationCardId === id) {
          this.state.executionPreparationLoading = false;
          this.requestUpdate();
        }
      });
  }

  private startCardExecution(id: string) {
    const preparation =
      this.state.executionPreparationCardId === id ? this.state.executionPreparation : null;
    if (!preparation) {
      return;
    }
    void this.mutate(
      async () => {
        await this.gateway.request("flowboard.cards.execution.start", {
          id,
          expectedRevision: preparation.expectedRevision,
        });
        this.state.modal = { kind: "card-detail", cardId: id };
        this.state.executionPreparation = null;
        this.state.executionPreparationError = null;
        this.state.executionInspectionCardId = id;
        this.state.executionInspection = null;
        this.refreshCardExecution(id);
      },
      { closeModal: false },
    );
  }

  private refreshCardExecution(id: string) {
    if (!this.connectedToGateway || this.state.executionInspectionLoading) {
      return;
    }
    this.state.executionInspectionCardId = id;
    this.state.executionInspectionLoading = true;
    this.state.executionInspectionError = null;
    this.requestUpdate();
    // Read-only. Card state is converged by the Gateway-side reconciler service,
    // so the UI never writes lifecycle state — it would only be correct while a
    // browser happened to be open on the right card.
    void this.gateway
      .request<CardExecutionInspectionResponse>("flowboard.cards.execution.inspect", { id })
      .then((inspection) => {
        if (this.state.executionInspectionCardId !== id) {
          return;
        }
        this.state.executionInspection = inspection;
        if (inspection.active) {
          this.scheduleExecutionRefresh(id);
        } else {
          this.clearExecutionRefreshTimer();
        }
      })
      .catch((error) => {
        if (this.state.executionInspectionCardId === id) {
          this.state.executionInspectionError = errorMessage(error);
          const card = this.state.project?.cards.find((candidate) => candidate.id === id);
          const stillActive =
            this.state.executionInspection?.active ||
            card?.execution?.status === "running" ||
            Boolean(card?.metadata?.attempts?.some((attempt) => attempt.status === "running"));
          if (stillActive) {
            this.scheduleExecutionRefresh(id);
          }
        }
      })
      .finally(() => {
        if (this.state.executionInspectionCardId === id) {
          this.state.executionInspectionLoading = false;
          this.requestUpdate();
        }
      });
  }

  private steerCardExecution(id: string, message: string) {
    if (!message.trim()) {
      return;
    }
    void this.mutate(
      async () => {
        const card = this.state.project?.cards.find((candidate) => candidate.id === id);
        const sessionKey = card?.execution?.sessionKey ?? card?.sessionKey;
        if (!sessionKey) {
          throw new Error("active execution has no session.");
        }
        const response = await this.gateway.request<{ runId?: unknown }>("sessions.steer", {
          key: sessionKey,
          message,
        });
        await this.gateway.request("flowboard.cards.execution.steer", {
          id,
          ...(typeof response.runId === "string" && response.runId.trim()
            ? { nextRunId: response.runId }
            : {}),
        });
        this.refreshCardExecution(id);
      },
      { closeModal: false },
    );
  }

  private abortCardExecution(id: string) {
    if (!window.confirm(i18n.t("flowboardProject.stopExecutionConfirm"))) {
      return;
    }
    void this.mutate(
      async () => {
        const card = this.state.project?.cards.find((candidate) => candidate.id === id);
        const sessionKey = card?.execution?.sessionKey ?? card?.sessionKey;
        const runId = card?.execution?.runId ?? card?.runId;
        if (!sessionKey) {
          throw new Error("active execution has no session.");
        }
        const aborted = await this.gateway.request<{ aborted?: unknown; runIds?: unknown }>(
          "chat.abort",
          {
            sessionKey,
            ...(runId ? { runId } : {}),
          },
        );
        const confirmed =
          aborted.aborted === true ||
          (Array.isArray(aborted.runIds) && aborted.runIds.some((candidate) => candidate === runId));
        if (!confirmed) {
          throw new Error("OpenClaw did not confirm that the active run was stopped.");
        }
        await this.gateway.request("flowboard.cards.execution.abort", {
          id,
          ...(runId ? { expectedRunId: runId } : {}),
        });
        this.refreshCardExecution(id);
      },
      { closeModal: false },
    );
  }

  private createSourceReference(id: string, data: Record<string, string>) {
    void this.mutate(async () => {
      await this.gateway.request("flowboard.cards.sources.create", { id, ...data });
    }, { closeModal: false });
  }

  private updateSourceReference(id: string, data: Record<string, string>) {
    void this.mutate(async () => {
      await this.gateway.request("flowboard.cards.sources.update", { id, ...data });
    }, { closeModal: false });
  }

  private deleteSourceReference(id: string, sourceReferenceId: string) {
    void this.mutate(async () => {
      await this.gateway.request("flowboard.cards.sources.delete", { id, sourceReferenceId });
    }, { closeModal: false });
  }

  private reorderSourceReferences(id: string, sourceReferenceIds: string[]) {
    void this.mutate(async () => {
      await this.gateway.request("flowboard.cards.sources.reorder", { id, sourceReferenceIds });
    }, { closeModal: false });
  }

  private addProof(id: string, data: Record<string, string>) {
    void this.mutate(async () => {
      await this.gateway.request("flowboard.cards.proof", { id, ...data });
    }, { closeModal: false });
  }

  private deleteProof(id: string, proofId: string) {
    void this.mutate(async () => {
      await this.gateway.request("flowboard.cards.proof.delete", { id, proofId });
    }, { closeModal: false });
  }

  private addArtifact(id: string, data: Record<string, string>) {
    void this.mutate(async () => {
      await this.gateway.request("flowboard.cards.artifact", { id, ...data });
    }, { closeModal: false });
  }

  private deleteArtifact(id: string, artifactId: string) {
    void this.mutate(async () => {
      await this.gateway.request("flowboard.cards.artifact.delete", { id, artifactId });
    }, { closeModal: false });
  }

  render() {
    return html`${renderFlowboardProjects({
      state: this.state,
      connected: this.connectedToGateway,
      requestUpdate: () => this.requestUpdate(),
      refresh: () => void this.refresh(),
      locale: i18n.getLocale(),
      setLocale: (locale) => this.setLocale(locale),
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
      moveCardProject: (id, boardId, milestoneId) =>
        this.moveCardProject(id, boardId, milestoneId),
      selectMoveCardProjectTarget: (cardId, boardId) =>
        this.selectMoveCardProjectTarget(cardId, boardId),
      reorderProjects: (ids) => this.reorderProjects(ids),
      reorderMilestones: (ids) => this.reorderMilestones(ids),
      reorderDocuments: (ids) => this.reorderDocuments(ids),
      openDocument: (id) => this.openDocument(id),
      refreshDocument: () => this.refreshDocument(),
      startDocumentEdit: () => this.startDocumentEdit(),
      previewDocumentDraft: () => this.previewDocumentDraft(),
      cancelDocumentEdit: () => this.cancelDocumentEdit(),
      saveDocumentContent: () => this.saveDocumentContent(),
      formatDocument: (command) => this.formatDocument(command),
      saveMilestone: (data) => this.saveMilestone(data),
      completeMilestone: (id) => this.completeMilestone(id),
      archiveMilestone: (id, archived) => this.archiveMilestone(id, archived),
      saveDocument: (data) => this.saveDocument(data),
      hideDocument: (id, hidden) => this.hideDocument(id, hidden),
      deleteDocument: (id) => this.deleteDocument(id),
      updateCardDelivery: (id, data) => this.updateCardDelivery(id, data),
      prepareCardExecution: (id) => this.prepareCardExecution(id),
      startCardExecution: (id) => this.startCardExecution(id),
      refreshCardExecution: (id) => this.refreshCardExecution(id),
      steerCardExecution: (id, message) => this.steerCardExecution(id, message),
      abortCardExecution: (id) => this.abortCardExecution(id),
      createSourceReference: (id, data) => this.createSourceReference(id, data),
      updateSourceReference: (id, data) => this.updateSourceReference(id, data),
      deleteSourceReference: (id, sourceReferenceId) =>
        this.deleteSourceReference(id, sourceReferenceId),
      reorderSourceReferences: (id, sourceReferenceIds) =>
        this.reorderSourceReferences(id, sourceReferenceIds),
      addProof: (id, data) => this.addProof(id, data),
      deleteProof: (id, proofId) => this.deleteProof(id, proofId),
      addArtifact: (id, data) => this.addArtifact(id, data),
      deleteArtifact: (id, artifactId) => this.deleteArtifact(id, artifactId),
    })}`;
  }
}

// Matches the mount point in index.html. The element previously registered under
// a different name and then replaced the whole body to compensate, which left the
// declared mount point dead and the page dependent on that side effect.
if (!customElements.get("flowboard-app")) {
  customElements.define("flowboard-app", FlowboardProjectHost);
}
