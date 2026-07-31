import { html, nothing, type TemplateResult } from "lit";
import type {
  TaskfoldBoardMetadata,
  TaskfoldBoardGroupBy,
  TaskfoldBoardSortBy,
  TaskfoldBoardSortDirection,
  TaskfoldBoardViewSettings,
  TaskfoldBoardSummary,
  TaskfoldCard,
  TaskfoldCardKind,
  TaskfoldDeliveryImplementationState,
  TaskfoldDeliveryReleaseState,
  TaskfoldDeliveryVerificationState,
  TaskfoldExecution,
  TaskfoldLinkType,
  TaskfoldMilestone,
  TaskfoldPriority,
  TaskfoldProjectDocument,
  TaskfoldProjectDocumentRead,
  TaskfoldProjectDocumentSection,
  TaskfoldProjectDocumentSource,
  TaskfoldProjectDocumentType,
  TaskfoldProjectView,
  TaskfoldStatus,
} from "../../../../src/contract/index.ts";
import "../../components/modal-dialog.ts";
import { t, type TaskfoldLocale } from "../../i18n/index.ts";
import {
  taskfoldEditorHtmlToMarkdown,
  taskfoldMarkdownToEditorHtml,
  renderTaskfoldMarkdown,
} from "../../lib/markdown.ts";
import "../../styles/taskfold-project.css";

const STATUSES: readonly TaskfoldStatus[] = [
  "triage",
  "backlog",
  "todo",
  "scheduled",
  "ready",
  "running",
  "review",
  "blocked",
  "done",
];
const PRIORITIES: readonly TaskfoldPriority[] = ["low", "normal", "high", "urgent"];
const BOARD_GROUPS: readonly TaskfoldBoardGroupBy[] = ["milestone", "requirement", "status"];
const BOARD_SORTS: readonly TaskfoldBoardSortBy[] = ["manual", "priority", "createdAt", "updatedAt"];
const BOARD_SORT_DIRECTIONS: readonly TaskfoldBoardSortDirection[] = ["asc", "desc"];
const DOCUMENT_SECTIONS: readonly TaskfoldProjectDocumentSection[] = [
  "project",
  "codebase",
  "environment",
  "knowledge",
];
const DOCUMENT_TYPES: readonly TaskfoldProjectDocumentType[] = [
  "markdown",
  "json",
  "link",
  "path",
  "secret_ref",
];
const DOCUMENT_SOURCES: readonly TaskfoldProjectDocumentSource[] = ["project", "ai_system"];
const IMPLEMENTATION_STATES: readonly TaskfoldDeliveryImplementationState[] = [
  "not_started",
  "in_progress",
  "code_complete",
  "not_applicable",
  "unknown",
];
const VERIFICATION_STATES: readonly TaskfoldDeliveryVerificationState[] = [
  "not_started",
  "partial",
  "passed",
  "failed",
  "human_required",
  "not_required",
  "unknown",
];
const RELEASE_STATES: readonly TaskfoldDeliveryReleaseState[] = [
  "not_started",
  "pending",
  "released",
  "not_required",
  "unknown",
];

export type TaskfoldProjectModal =
  | { kind: "project" }
  | {
      kind: "card";
      milestoneId?: string;
      requirementId?: string;
      status?: TaskfoldStatus;
      cardKind?: TaskfoldCardKind;
    }
  | { kind: "milestone"; milestone?: TaskfoldMilestone }
  | { kind: "document"; document?: TaskfoldProjectDocument }
  | { kind: "card-detail"; cardId: string }
  | { kind: "execution-start"; cardId: string }
  | {
      kind: "move-project";
      cardId: string;
      boardId?: string;
      milestoneId?: string;
      targetProject?: TaskfoldProjectView;
    };

export type TaskfoldCardExecutionPreparation = {
  cardId: string;
  expectedRevision: number;
  active: boolean;
  agentId: string;
  defaultProvider?: string;
  defaultModel?: string;
  sourceCheckout: string;
  baseBranch?: string;
  worktreeName: string;
  promptPreview: string;
  execution: TaskfoldExecution | null;
};

export type TaskfoldCardExecutionInspection = {
  card: TaskfoldCard;
  active: boolean;
  execution: TaskfoldExecution | null;
  sessionKey?: string;
  runId?: string;
  session?: unknown;
  preview?: unknown;
};

export type TaskfoldProjectUiState = {
  loading: boolean;
  loaded: boolean;
  busy: boolean;
  error: string | null;
  languageSwitching: boolean;
  languageError: string | null;
  projects: TaskfoldBoardSummary[];
  project: TaskfoldProjectView | null;
  documents: TaskfoldProjectDocument[];
  selectedDocumentId: string | null;
  documentPreview: TaskfoldProjectDocumentRead | null;
  documentPreviewLoading: boolean;
  documentPreviewError: string | null;
  documentEditing: boolean;
  documentDraft: string | null;
  documentQuery: string;
  documentSourceFilter: "all" | TaskfoldProjectDocumentSource;
  executionPreparationCardId: string | null;
  executionPreparation: TaskfoldCardExecutionPreparation | null;
  executionPreparationLoading: boolean;
  executionPreparationError: string | null;
  executionInspectionCardId: string | null;
  executionInspection: TaskfoldCardExecutionInspection | null;
  executionInspectionLoading: boolean;
  executionInspectionError: string | null;
  selectedProjectId: string | null;
  screen: "overview" | "board" | "graph" | "settings" | "documents";
  modal: TaskfoldProjectModal | null;
  draggedCardId: string | null;
  graphMode: "mindmap" | "flow";
  graphZoom: number;
  showArchivedProjects: boolean;
  showHiddenDocuments: boolean;
  query: string;
};

export type TaskfoldProjectViewController = {
  state: TaskfoldProjectUiState;
  connected: boolean;
  locale: TaskfoldLocale;
  requestUpdate: () => void;
  refresh: () => void;
  setLocale: (locale: TaskfoldLocale) => void;
  selectProject: (id: string) => void;
  setScreen: (screen: TaskfoldProjectUiState["screen"]) => void;
  openModal: (modal: TaskfoldProjectModal) => void;
  closeModal: () => void;
  createProject: (data: Record<string, string>) => void;
  updateProject: (data: Record<string, string>) => void;
  archiveProject: (archived: boolean) => void;
  createCard: (data: Record<string, string>) => void;
  updateCardStatus: (id: string, status: TaskfoldStatus) => void;
  archiveCard: (id: string, archived: boolean) => void;
  moveCardMilestone: (id: string, milestoneId?: string, position?: number) => void;
  moveCardRequirement: (id: string, requirementId?: string) => void;
  moveCardProject: (id: string, boardId: string, milestoneId: string) => void;
  updateBoardView: (boardView: TaskfoldBoardViewSettings) => void;
  setGraphMode: (mode: TaskfoldProjectUiState["graphMode"]) => void;
  setGraphZoom: (zoom: number) => void;
  selectMoveCardProjectTarget: (cardId: string, boardId: string) => void;
  reorderProjects: (ids: string[]) => void;
  reorderMilestones: (ids: string[]) => void;
  reorderDocuments: (ids: string[]) => void;
  openDocument: (id: string) => void;
  refreshDocument: () => void;
  startDocumentEdit: () => void;
  previewDocumentDraft: () => void;
  cancelDocumentEdit: () => void;
  saveDocumentContent: () => void;
  formatDocument: (command: "bold" | "italic" | "formatBlock" | "insertUnorderedList") => void;
  saveMilestone: (data: Record<string, string>) => void;
  completeMilestone: (id: string) => void;
  archiveMilestone: (id: string, archived: boolean) => void;
  saveDocument: (data: Record<string, string>) => void;
  hideDocument: (id: string, hidden: boolean) => void;
  deleteDocument: (id: string) => void;
  updateCardDelivery: (id: string, data: Record<string, string>) => void;
  prepareCardExecution: (id: string) => void;
  startCardExecution: (id: string) => void;
  refreshCardExecution: (id: string) => void;
  steerCardExecution: (id: string, message: string) => void;
  abortCardExecution: (id: string) => void;
  createSourceReference: (id: string, data: Record<string, string>) => void;
  updateSourceReference: (id: string, data: Record<string, string>) => void;
  deleteSourceReference: (id: string, sourceReferenceId: string) => void;
  reorderSourceReferences: (id: string, sourceReferenceIds: string[]) => void;
  addProof: (id: string, data: Record<string, string>) => void;
  deleteProof: (id: string, proofId: string) => void;
  addArtifact: (id: string, data: Record<string, string>) => void;
  deleteArtifact: (id: string, artifactId: string) => void;
};

export function createTaskfoldProjectUiState(): TaskfoldProjectUiState {
  return {
    loading: false,
    loaded: false,
    busy: false,
    error: null,
    languageSwitching: false,
    languageError: null,
    projects: [],
    project: null,
    documents: [],
    selectedDocumentId: null,
    documentPreview: null,
    documentPreviewLoading: false,
    documentPreviewError: null,
    documentEditing: false,
    documentDraft: null,
    documentQuery: "",
    documentSourceFilter: "all",
    executionPreparationCardId: null,
    executionPreparation: null,
    executionPreparationLoading: false,
    executionPreparationError: null,
    executionInspectionCardId: null,
    executionInspection: null,
    executionInspectionLoading: false,
    executionInspectionError: null,
    selectedProjectId: null,
    screen: "overview",
    modal: null,
    draggedCardId: null,
    graphMode: "mindmap",
    graphZoom: 1,
    showArchivedProjects: false,
    showHiddenDocuments: false,
    query: "",
  };
}

function boardName(board: Pick<TaskfoldBoardSummary | TaskfoldBoardMetadata, "id" | "name">): string {
  return board.name || board.id;
}

function boardView(board: TaskfoldBoardMetadata): TaskfoldBoardViewSettings {
  return board.boardView ?? { groupBy: "milestone", sortBy: "manual", sortDirection: "asc" };
}

function cardRequirementId(card: TaskfoldCard): string | undefined {
  return card.metadata?.links?.find(
    (link) => link.type === "contained_by" && link.targetCardId,
  )?.targetCardId;
}

function isRequirementCard(card: TaskfoldCard): boolean {
  return card.kind === "requirement" || Boolean(
    card.metadata?.links?.some((link) => link.type === "contains" && link.targetCardId),
  );
}

function sortBoardCards(
  cards: readonly TaskfoldCard[],
  view: TaskfoldBoardViewSettings,
): TaskfoldCard[] {
  const multiplier = view.sortDirection === "asc" ? 1 : -1;
  const priorityRank = new Map<TaskfoldPriority, number>([
    ["urgent", 0],
    ["high", 1],
    ["normal", 2],
    ["low", 3],
  ]);
  return [...cards].toSorted((left, right) => {
    if (view.sortBy === "manual") {
      return left.position - right.position || left.createdAt - right.createdAt;
    }
    if (view.sortBy === "priority") {
      return (
        multiplier * ((priorityRank.get(left.priority) ?? 99) - (priorityRank.get(right.priority) ?? 99)) ||
        left.createdAt - right.createdAt
      );
    }
    const leftValue = view.sortBy === "createdAt" ? left.createdAt : left.updatedAt;
    const rightValue = view.sortBy === "createdAt" ? right.createdAt : right.updatedAt;
    return multiplier * (leftValue - rightValue) || left.title.localeCompare(right.title);
  });
}

function boardId(card: TaskfoldCard): string {
  return card.metadata?.automation?.boardId ?? "default";
}

function isArchivedCard(card: TaskfoldCard): boolean {
  return Boolean(card.metadata?.archivedAt);
}

function hasActiveCardExecution(card: TaskfoldCard): boolean {
  return (
    card.execution?.status === "running" ||
    Boolean(card.metadata?.attempts?.some((attempt) => attempt.status === "running"))
  );
}

function inspectionForCard(
  state: TaskfoldProjectUiState,
  cardId: string,
): TaskfoldCardExecutionInspection | null {
  return state.executionInspectionCardId === cardId ? state.executionInspection : null;
}

function executionValue(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function taskfoldNativeChatHref(sessionKey: string, pathname?: string): string {
  let currentPath = "/";
  if (typeof window !== "undefined") {
    currentPath = window.location.pathname;
    try {
      if (window.parent !== window) {
        currentPath = window.parent.location.pathname || currentPath;
      }
    } catch {
      // Cross-origin embeds keep their own route as the safe fallback.
    }
  }
  const path = pathname ?? currentPath;
  const pluginIndex = path.indexOf("/plugin");
  const basePath = pluginIndex >= 0 ? path.slice(0, pluginIndex) : "";
  return `${basePath || ""}/chat?session=${encodeURIComponent(sessionKey)}`;
}

function milestoneLabel(milestone: TaskfoldMilestone): string {
  const key =
    milestone.state === "active"
      ? "taskfoldProject.active"
      : milestone.state === "completed"
        ? "taskfoldProject.completed"
        : "taskfoldProject.archived";
  return t(key);
}

function sectionLabel(section: TaskfoldProjectDocumentSection): string {
  return t(
    `taskfoldProject.section${section[0]?.toUpperCase() ?? ""}${section.slice(1)}`,
  );
}

function documentTypeLabel(type: TaskfoldProjectDocumentType): string {
  const key =
    type === "secret_ref"
      ? "SecretRef"
      : `${type[0]?.toUpperCase() ?? ""}${type.slice(1)}`;
  return t(`taskfoldProject.type${key}`);
}

function documentSourceLabel(source: TaskfoldProjectDocumentSource): string {
  return t(`taskfoldProject.source${source === "ai_system" ? "AiSystem" : "Project"}`);
}

function documentPathLabel(
  target: string | undefined,
  workspacePath: string | undefined,
): string | undefined {
  if (!target || !workspacePath) {
    return target;
  }
  const normalizedWorkspace = workspacePath.replace(/[\\/]+$/, "");
  const normalizedTarget = target.replace(/\\/g, "/");
  const normalizedRoot = normalizedWorkspace.replace(/\\/g, "/");
  if (normalizedTarget === normalizedRoot) {
    return ".";
  }
  if (normalizedTarget.startsWith(`${normalizedRoot}/`)) {
    return normalizedTarget.slice(normalizedRoot.length + 1);
  }
  return normalizedTarget.split("/").at(-1) || target;
}

function projectCardCount(project: TaskfoldBoardSummary): number {
  return project.active;
}

function readForm(event: SubmitEvent): Record<string, string> {
  const form = event.currentTarget as HTMLFormElement;
  return Object.fromEntries(
    [...new FormData(form).entries()].map(([key, value]) => [key, String(value)]),
  );
}

function setProjectCreateMode(event: Event): void {
  const input = event.currentTarget as HTMLInputElement;
  const form = input.form;
  if (!form) {
    return;
  }
  const existing = input.value === "existing";
  const workspaceField = form.elements.namedItem("workspacePath");
  const workspaceInput =
    workspaceField instanceof HTMLInputElement ? workspaceField : undefined;
  workspaceInput?.toggleAttribute("required", existing);
  form.querySelector<HTMLElement>("[data-project-workspace]")?.toggleAttribute("hidden", !existing);
}

export function reorderVisibleItemIds<T extends { id: string }>(
  allItems: readonly T[],
  visibleItems: readonly T[],
  id: string,
  direction: -1 | 1,
): string[] | undefined {
  const visibleIndex = visibleItems.findIndex((item) => item.id === id);
  const target = visibleItems[visibleIndex + direction];
  if (visibleIndex < 0 || !target) {
    return undefined;
  }
  const ids = allItems.map((item) => item.id);
  const sourceIndex = ids.indexOf(id);
  const targetIndex = ids.indexOf(target.id);
  if (sourceIndex < 0 || targetIndex < 0) {
    return undefined;
  }
  [ids[sourceIndex], ids[targetIndex]] = [ids[targetIndex]!, ids[sourceIndex]!];
  return ids;
}

function renderStatusOptions(selected: TaskfoldStatus) {
  return STATUSES.map(
    (status) =>
      html`<option value=${status} ?selected=${status === selected}>${t(`workboard.status.${status}`)}</option>`,
  );
}

function renderPriorityOptions(selected: TaskfoldPriority) {
  return PRIORITIES.map(
    (priority) =>
      html`<option value=${priority} ?selected=${priority === selected}>${priority}</option>`,
  );
}

function deliveryStateKey(
  prefix: "implementation" | "verification" | "release",
  state: string,
): string {
  const suffix = state
    .split("_")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join("");
  return `taskfoldProject.delivery${prefix[0]?.toUpperCase() ?? ""}${prefix.slice(1)}${suffix}`;
}

function renderDeliveryOptions(
  states: readonly string[],
  selected: string | undefined,
  prefix: "implementation" | "verification" | "release",
) {
  return [
    html`<option value="">${t("taskfoldProject.deliveryNotRecorded")}</option>`,
    ...states.map(
      (state) =>
        html`<option value=${state} ?selected=${state === selected}>${t(
          deliveryStateKey(prefix, state),
        )}</option>`,
    ),
  ];
}

function deliveryStateLabel(
  prefix: "implementation" | "verification" | "release",
  state: string | undefined,
): string {
  return state ? t(deliveryStateKey(prefix, state)) : t("taskfoldProject.deliveryNotRecorded");
}

function renderOrderControls(params: {
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return html`
    <div class="taskfold-project__order-actions">
      <button
        class="taskfold-project__icon-button taskfold-project__order-button"
        type="button"
        title=${t("taskfoldProject.moveUp")}
        aria-label=${t("taskfoldProject.moveUp")}
        ?disabled=${!params.canMoveUp}
        @click=${params.onMoveUp}
      >&#8593;</button>
      <button
        class="taskfold-project__icon-button taskfold-project__order-button"
        type="button"
        title=${t("taskfoldProject.moveDown")}
        aria-label=${t("taskfoldProject.moveDown")}
        ?disabled=${!params.canMoveDown}
        @click=${params.onMoveDown}
      >&#8595;</button>
    </div>
  `;
}

function renderProjectToolbar(controller: TaskfoldProjectViewController) {
  const { state } = controller;
  const query = state.query.trim().toLocaleLowerCase();
  const projects = state.projects.filter((project) => {
    if (!state.showArchivedProjects && project.archivedAt) {
      return false;
    }
    return !query || `${project.name ?? ""} ${project.id}`.toLocaleLowerCase().includes(query);
  });
  return html`
    <nav class="taskfold-project__project-toolbar" aria-label=${t("taskfoldProject.allProjects")}>
      <label class="taskfold-project__search">
        <span class="taskfold-project__sr-only">${t("taskfoldProject.searchProjects")}</span>
        <input
          type="search"
          placeholder=${t("taskfoldProject.searchProjects")}
          .value=${state.query}
          @input=${(event: InputEvent) => {
            state.query = (event.currentTarget as HTMLInputElement).value;
            controller.requestUpdate();
          }}
        />
      </label>
      <label class="taskfold-project__checkbox">
        <input
          type="checkbox"
          .checked=${state.showArchivedProjects}
          @change=${(event: Event) => {
            state.showArchivedProjects = (event.currentTarget as HTMLInputElement).checked;
            controller.requestUpdate();
          }}
        />
        ${t("taskfoldProject.includeArchived")}
      </label>
      <div class="taskfold-project__project-list" role="list">
        ${projects.length
          ? projects.map(
              (project) => {
                const moveUp = reorderVisibleItemIds(state.projects, projects, project.id, -1);
                const moveDown = reorderVisibleItemIds(state.projects, projects, project.id, 1);
                return html`
                  <div class="taskfold-project__project-row" role="listitem">
                    <button
                      class="taskfold-project__nav-project ${state.selectedProjectId === project.id
                        ? "is-selected"
                        : ""}"
                      type="button"
                      @click=${() => controller.selectProject(project.id)}
                    >
                      <span class="taskfold-project__project-color" style=${project.color ? `--project-color:${project.color}` : ""}></span>
                      <span class="taskfold-project__nav-project-name">${boardName(project)}</span>
                      ${project.archivedAt
                        ? html`<small>${t("taskfoldProject.archived")}</small>`
                        : html`<small>${projectCardCount(project)}</small>`}
                    </button>
                    ${renderOrderControls({
                      canMoveUp: Boolean(moveUp),
                      canMoveDown: Boolean(moveDown),
                      onMoveUp: () => moveUp && controller.reorderProjects(moveUp),
                      onMoveDown: () => moveDown && controller.reorderProjects(moveDown),
                    })}
                  </div>
                `;
              },
            )
          : html`<p class="taskfold-project__empty-side">${t("taskfoldProject.emptyProject")}</p>`}
      </div>
    </nav>
  `;
}

function renderOverview(controller: TaskfoldProjectViewController) {
  const { state } = controller;
  const projects = state.projects.filter(
    (project) => state.showArchivedProjects || !project.archivedAt,
  );
  return html`
    <section class="taskfold-project__overview" aria-label=${t("taskfoldProject.overview")}>
      <div class="taskfold-project__section-heading">
        <div>
          <h1>${t("taskfoldProject.allProjects")}</h1>
          <p>${t("taskfoldProject.title")}</p>
        </div>
        <button
          class="btn btn--primary"
          type="button"
          ?disabled=${!controller.connected}
          @click=${() => controller.openModal({ kind: "project" })}
        >
          ${t("taskfoldProject.newProject")}
        </button>
      </div>
      ${projects.length
        ? html`
            <div class="taskfold-project__overview-grid">
              ${projects.map(
                (project) => html`
                  <article
                    class="taskfold-project__overview-item ${project.archivedAt ? "is-archived" : ""}"
                    @click=${() => controller.selectProject(project.id)}
                  >
                    <div class="taskfold-project__overview-item-top">
                      <span class="taskfold-project__project-color" style=${project.color ? `--project-color:${project.color}` : ""}></span>
                      <span class="taskfold-project__overview-item-id">${project.id}</span>
                      ${project.archivedAt
                        ? html`<span class="taskfold-project__badge">${t("taskfoldProject.archived")}</span>`
                        : nothing}
                    </div>
                    <h2>${boardName(project)}</h2>
                    <p>${project.currentObjective || project.description || "\u00a0"}</p>
                    <footer>
                      <span>${t("taskfoldProject.cards", { count: String(project.active) })}</span>
                      <span>${project.version || ""}</span>
                    </footer>
                  </article>
                `,
              )}
            </div>
          `
        : html`
            <div class="taskfold-project__blank">
              <p>${t("taskfoldProject.emptyOverview")}</p>
              <button
                class="btn btn--primary"
                type="button"
                ?disabled=${!controller.connected}
                @click=${() => controller.openModal({ kind: "project" })}
              >
                ${t("taskfoldProject.newProject")}
              </button>
            </div>
          `}
    </section>
  `;
}

type TaskfoldBoardColumn = {
  id: string;
  title: string;
  subtitle?: string;
  cards: TaskfoldCard[];
  milestone?: TaskfoldMilestone;
  requirement?: TaskfoldCard;
  manualOrder?: { milestoneId?: string; cards: TaskfoldCard[] };
  onDrop: (cardId: string) => void;
  onCreate: () => void;
};

type TaskfoldGraphEdge = {
  from: string;
  to: string;
  type: TaskfoldLinkType;
};

function renderCard(
  controller: TaskfoldProjectViewController,
  card: TaskfoldCard,
  options: { manualOrder?: { milestoneId?: string; cards: TaskfoldCard[] } } = {},
) {
  const { state } = controller;
  const project = state.project;
  if (!project) {
    return nothing;
  }
  const archived = isArchivedCard(card);
  const isProjectArchived = Boolean(project.board.archivedAt);
  const orderedCards = options.manualOrder?.cards ?? [];
  const cardIndex = orderedCards.findIndex((candidate) => candidate.id === card.id);
  const previousCard = orderedCards[cardIndex - 1];
  const nextCard = orderedCards[cardIndex + 1];
  return html`
    <article
      class="taskfold-project__card ${archived ? "is-archived" : ""} ${isRequirementCard(card) ? "is-requirement" : ""}"
      draggable=${!archived && !isProjectArchived}
      @dragstart=${(event: DragEvent) => {
        state.draggedCardId = card.id;
        event.dataTransfer?.setData("text/plain", card.id);
        event.dataTransfer && (event.dataTransfer.effectAllowed = "move");
        controller.requestUpdate();
      }}
      @dragend=${() => {
        state.draggedCardId = null;
        controller.requestUpdate();
      }}
      @dragover=${(event: DragEvent) => event.preventDefault()}
      @drop=${(event: DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        const id = event.dataTransfer?.getData("text/plain") || state.draggedCardId;
        if (options.manualOrder && id && id !== card.id) {
          controller.moveCardMilestone(
            id,
            options.manualOrder.milestoneId,
            Math.max(0, card.position - 1),
          );
        }
      }}
    >
      <button
        class="taskfold-project__card-main"
        type="button"
        @click=${() => controller.openModal({ kind: "card-detail", cardId: card.id })}
      >
        <span class="taskfold-project__priority priority-${card.priority}"></span>
        <span class="taskfold-project__card-title">${card.title}</span>
        ${card.notes ? html`<span class="taskfold-project__card-notes">${card.notes}</span>` : nothing}
        ${card.delivery
          ? html`
              <span class="taskfold-project__delivery-badges">
                ${card.delivery.implementationState
                  ? html`<small>${deliveryStateLabel(
                      "implementation",
                      card.delivery.implementationState,
                    )}</small>`
                  : nothing}
                ${card.delivery.verificationState
                  ? html`<small>${deliveryStateLabel(
                      "verification",
                      card.delivery.verificationState,
                    )}</small>`
                  : nothing}
                ${card.delivery.releaseState
                  ? html`<small>${deliveryStateLabel("release", card.delivery.releaseState)}</small>`
                  : nothing}
              </span>
            `
          : nothing}
      </button>
      <div class="taskfold-project__card-footer">
        <select
          class="taskfold-project__compact-select"
          aria-label=${t("taskfoldProject.status")}
          .value=${card.status}
          @change=${(event: Event) =>
            controller.updateCardStatus(
              card.id,
              (event.currentTarget as HTMLSelectElement).value as TaskfoldStatus,
            )}
        >
          ${renderStatusOptions(card.status)}
        </select>
        <select
          class="taskfold-project__compact-select taskfold-project__move-card"
          aria-label=${t("taskfoldProject.moveTo")}
          ?disabled=${isProjectArchived}
          .value=${card.milestoneId ?? ""}
          @change=${(event: Event) =>
            controller.moveCardMilestone(
              card.id,
              (event.currentTarget as HTMLSelectElement).value || undefined,
            )}
        >
          <option value="">${t("taskfoldProject.unassigned")}</option>
          ${project.milestones
            .filter((milestone) => milestone.state === "active")
            .map(
              (milestone) => html`
                <option value=${milestone.id}>${milestone.title}</option>
              `,
            )}
        </select>
        ${options.manualOrder
          ? renderOrderControls({
              canMoveUp: !archived && !isProjectArchived && Boolean(previousCard),
              canMoveDown: !archived && !isProjectArchived && Boolean(nextCard),
              onMoveUp: () =>
                previousCard &&
                controller.moveCardMilestone(
                  card.id,
                  options.manualOrder?.milestoneId,
                  Math.max(0, previousCard.position - 1),
                ),
              onMoveDown: () =>
                nextCard &&
                controller.moveCardMilestone(
                  card.id,
                  options.manualOrder?.milestoneId,
                  nextCard.position + 1,
                ),
            })
          : nothing}
      </div>
      ${archived ? html`<span class="taskfold-project__card-archived">${t("taskfoldProject.archived")}</span>` : nothing}
    </article>
  `;
}

function renderColumn(controller: TaskfoldProjectViewController, params: TaskfoldBoardColumn) {
  const { state } = controller;
  const projectArchived = Boolean(state.project?.board.archivedAt);
  const { milestone } = params;
  const milestones = state.project?.milestones ?? [];
  const moveMilestoneUp = milestone
    ? reorderVisibleItemIds(milestones, milestones, milestone.id, -1)
    : undefined;
  const moveMilestoneDown = milestone
    ? reorderVisibleItemIds(milestones, milestones, milestone.id, 1)
    : undefined;
  return html`
    <section
      class="taskfold-project__column ${milestone ? `is-${milestone.state}` : "is-unassigned"}"
      @dragover=${(event: DragEvent) => event.preventDefault()}
      @drop=${(event: DragEvent) => {
        event.preventDefault();
        const id = event.dataTransfer?.getData("text/plain") || state.draggedCardId;
        if (id) {
          params.onDrop(id);
        }
      }}
    >
      <header class="taskfold-project__column-header">
        <div>
          ${params.requirement
            ? html`
                <button
                  class="taskfold-project__column-title-button"
                  type="button"
                  @click=${() =>
                    controller.openModal({ kind: "card-detail", cardId: params.requirement!.id })}
                >${params.title}</button>
              `
            : html`<h2>${params.title}</h2>`}
          <span>${params.subtitle || t("taskfoldProject.cards", { count: String(params.cards.length) })}</span>
        </div>
        <div class="taskfold-project__column-actions">
          ${milestone
            ? html`
                ${renderOrderControls({
                  canMoveUp: !projectArchived && Boolean(moveMilestoneUp),
                  canMoveDown: !projectArchived && Boolean(moveMilestoneDown),
                  onMoveUp: () => moveMilestoneUp && controller.reorderMilestones(moveMilestoneUp),
                  onMoveDown: () =>
                    moveMilestoneDown && controller.reorderMilestones(moveMilestoneDown),
                })}
                <button
                  class="taskfold-project__icon-button"
                  type="button"
                  title=${t("taskfoldProject.editMilestone")}
                  @click=${() => controller.openModal({ kind: "milestone", milestone })}
                >...</button>
                ${milestone.state === "active"
                  ? html`
                      <button
                        class="taskfold-project__icon-button"
                        type="button"
                        title=${t("taskfoldProject.completeMilestone")}
                        @click=${() => controller.completeMilestone(milestone.id)}
                      >&#10003;</button>
                      <button
                        class="taskfold-project__icon-button"
                        type="button"
                        title=${t("taskfoldProject.archiveMilestone")}
                        @click=${() => controller.archiveMilestone(milestone.id, true)}
                      >&#8942;</button>
                    `
                  : html`
                      <button
                        class="taskfold-project__icon-button"
                        type="button"
                        title=${t("taskfoldProject.restoreMilestone")}
                        @click=${() => controller.archiveMilestone(milestone.id, false)}
                      >&#8635;</button>
                    `}
              `
            : nothing}
          <button
            class="taskfold-project__icon-button"
            type="button"
            title=${t("taskfoldProject.newCard")}
            ?disabled=${!controller.connected || projectArchived || (milestone && milestone.state !== "active")}
            @click=${params.onCreate}
          >+</button>
        </div>
      </header>
      <div class="taskfold-project__card-list">
        ${params.cards.length
          ? params.cards.map((card) => renderCard(controller, card, { manualOrder: params.manualOrder }))
          : html`<p class="taskfold-project__empty-column">${t("taskfoldProject.emptyColumn")}</p>`}
      </div>
    </section>
  `;
}

function renderBoard(controller: TaskfoldProjectViewController) {
  const { state } = controller;
  const project = state.project;
  if (!project) {
    return nothing;
  }
  const view = boardView(project.board);
  const cards = project.cards.filter((card) => !isArchivedCard(card));
  const columns: TaskfoldBoardColumn[] = [];
  const sorted = (items: readonly TaskfoldCard[]) => sortBoardCards(items, view);
  if (view.groupBy === "milestone") {
    const byMilestone = new Map<string | undefined, TaskfoldCard[]>();
    for (const card of cards) {
      const current = byMilestone.get(card.milestoneId) ?? [];
      current.push(card);
      byMilestone.set(card.milestoneId, current);
    }
    const manualOrder = view.sortBy === "manual";
    columns.push({
      id: "unassigned",
      title: t("taskfoldProject.unassigned"),
      subtitle: t("taskfoldProject.unassignedHelp"),
      cards: sorted(byMilestone.get(undefined) ?? []),
      ...(manualOrder
        ? { manualOrder: { cards: sorted(byMilestone.get(undefined) ?? []) } }
        : {}),
      onDrop: (id) => controller.moveCardMilestone(id),
      onCreate: () => controller.openModal({ kind: "card" }),
    });
    for (const milestone of project.milestones) {
      const columnCards = sorted(byMilestone.get(milestone.id) ?? []);
      columns.push({
        id: milestone.id,
        title: milestone.title,
        subtitle: milestoneLabel(milestone),
        cards: columnCards,
        milestone,
        ...(manualOrder ? { manualOrder: { milestoneId: milestone.id, cards: columnCards } } : {}),
        onDrop: (id) => controller.moveCardMilestone(id, milestone.id),
        onCreate: () => controller.openModal({ kind: "card", milestoneId: milestone.id }),
      });
    }
  } else if (view.groupBy === "requirement") {
    const requirements = cards.filter(
      (card) => isRequirementCard(card) && !cardRequirementId(card),
    );
    const byRequirement = new Map<string | undefined, TaskfoldCard[]>();
    for (const card of cards) {
      if (isRequirementCard(card)) {
        continue;
      }
      const requirementId = cardRequirementId(card);
      const current = byRequirement.get(requirementId) ?? [];
      current.push(card);
      byRequirement.set(requirementId, current);
    }
    columns.push({
      id: "unassigned",
      title: t("taskfoldProject.unassigned"),
      subtitle: t("taskfoldProject.unassignedRequirementHelp"),
      cards: sorted(byRequirement.get(undefined) ?? []),
      onDrop: (id) => controller.moveCardRequirement(id),
      onCreate: () => controller.openModal({ kind: "card" }),
    });
    for (const requirement of requirements) {
      columns.push({
        id: requirement.id,
        title: requirement.title,
        subtitle: t("taskfoldProject.cards", {
          count: String((byRequirement.get(requirement.id) ?? []).length),
        }),
        cards: sorted(byRequirement.get(requirement.id) ?? []),
        requirement,
        onDrop: (id) => controller.moveCardRequirement(id, requirement.id),
        onCreate: () =>
          controller.openModal({
            kind: "card",
            requirementId: requirement.id,
            milestoneId: requirement.milestoneId,
          }),
      });
    }
  } else {
    const byStatus = new Map<TaskfoldStatus, TaskfoldCard[]>();
    for (const card of cards) {
      const current = byStatus.get(card.status) ?? [];
      current.push(card);
      byStatus.set(card.status, current);
    }
    for (const status of STATUSES) {
      columns.push({
        id: status,
        title: t(`workboard.status.${status}`),
        cards: sorted(byStatus.get(status) ?? []),
        onDrop: (id) => controller.updateCardStatus(id, status),
        onCreate: () => controller.openModal({ kind: "card", status }),
      });
    }
  }
  return html`
    <section class="taskfold-project__board">
      <div class="taskfold-project__section-heading">
        <div>
          <h1>${boardName(project.board)}</h1>
          <p>${project.board.currentObjective || project.board.description || project.board.id}</p>
        </div>
        <div class="taskfold-project__heading-actions">
          ${project.board.archivedAt
            ? html`
                <button class="btn" type="button" @click=${() => controller.archiveProject(false)}>
                  ${t("taskfoldProject.restoreProject")}
                </button>
              `
            : html`
                ${view.groupBy === "milestone"
                  ? html`
                      <button
                        class="btn"
                        type="button"
                        ?disabled=${!controller.connected}
                        @click=${() => controller.openModal({ kind: "milestone" })}
                      >
                        ${t("taskfoldProject.newMilestone")}
                      </button>
                    `
                  : nothing}
                ${view.groupBy === "requirement"
                  ? html`
                      <button
                        class="btn"
                        type="button"
                        ?disabled=${!controller.connected}
                        @click=${() =>
                          controller.openModal({ kind: "card", cardKind: "requirement" })}
                      >
                        ${t("taskfoldProject.newRequirement")}
                      </button>
                    `
                  : nothing}
                <button
                  class="btn btn--primary"
                  type="button"
                  ?disabled=${!controller.connected}
                  @click=${() => controller.openModal({ kind: "card" })}
                >
                  ${t("taskfoldProject.newCard")}
                </button>
              `}
        </div>
      </div>
      ${project.board.archivedAt
        ? html`<div class="callout">${t("taskfoldProject.projectArchived")}</div>`
        : nothing}
      <div class="taskfold-project__board-controls">
        <label>
          ${t("taskfoldProject.groupBy")}
          <select
            .value=${view.groupBy}
            @change=${(event: Event) => {
              const groupBy = (event.currentTarget as HTMLSelectElement).value as TaskfoldBoardGroupBy;
              controller.updateBoardView({
                groupBy,
                sortBy:
                  groupBy === "milestone"
                    ? view.sortBy
                    : view.sortBy === "manual"
                      ? "priority"
                      : view.sortBy,
                sortDirection: view.sortDirection,
              });
            }}
          >
            ${BOARD_GROUPS.map(
              (groupBy) =>
                html`<option value=${groupBy}>${t(`taskfoldProject.groupBy${groupBy[0].toUpperCase()}${groupBy.slice(1)}`)}</option>`,
            )}
          </select>
        </label>
        <label>
          ${t("taskfoldProject.sortBy")}
          <select
            .value=${view.sortBy}
            @change=${(event: Event) =>
              controller.updateBoardView({
                ...view,
                sortBy: (event.currentTarget as HTMLSelectElement).value as TaskfoldBoardSortBy,
              })}
          >
            ${BOARD_SORTS.filter((sortBy) => view.groupBy === "milestone" || sortBy !== "manual").map(
              (sortBy) =>
                html`<option value=${sortBy}>${t(`taskfoldProject.sortBy${sortBy[0].toUpperCase()}${sortBy.slice(1)}`)}</option>`,
            )}
          </select>
        </label>
        <label>
          ${t("taskfoldProject.sortDirection")}
          <select
            .value=${view.sortDirection}
            @change=${(event: Event) =>
              controller.updateBoardView({
                ...view,
                sortDirection: (event.currentTarget as HTMLSelectElement).value as TaskfoldBoardSortDirection,
              })}
          >
            ${BOARD_SORT_DIRECTIONS.map(
              (direction) =>
                html`<option value=${direction}>${t(`taskfoldProject.sortDirection${direction[0].toUpperCase()}${direction.slice(1)}`)}</option>`,
            )}
          </select>
        </label>
      </div>
      <div class="taskfold-project__kanban" aria-label=${t("taskfoldProject.board")}>
        ${columns.map((column) => renderColumn(controller, column))}
      </div>
    </section>
  `;
}

function renderGraphNode(
  controller: TaskfoldProjectViewController,
  card: TaskfoldCard,
  options: { requirementId?: string } = {},
) {
  const { state } = controller;
  const projectArchived = Boolean(state.project?.board.archivedAt);
  return html`
    <article
      class="taskfold-project__graph-node ${isRequirementCard(card) ? "is-requirement" : ""}"
      draggable=${!projectArchived && !isArchivedCard(card) && !isRequirementCard(card)}
      @dragstart=${(event: DragEvent) => {
        state.draggedCardId = card.id;
        event.dataTransfer?.setData("text/plain", card.id);
        event.dataTransfer && (event.dataTransfer.effectAllowed = "move");
      }}
      @dragend=${() => {
        state.draggedCardId = null;
        controller.requestUpdate();
      }}
    >
      <button
        type="button"
        @click=${() => controller.openModal({ kind: "card-detail", cardId: card.id })}
      >
        <span class="taskfold-project__priority priority-${card.priority}"></span>
        <strong>${card.title}</strong>
        <small>${t(`workboard.status.${card.status}`)}</small>
      </button>
      ${options.requirementId
        ? html`
            <button
              class="taskfold-project__graph-add"
              type="button"
              title=${t("taskfoldProject.newCard")}
              ?disabled=${projectArchived || !controller.connected}
              @click=${() =>
                controller.openModal({
                  kind: "card",
                  requirementId: options.requirementId,
                  milestoneId: card.milestoneId,
                })}
            >+</button>
          `
        : nothing}
    </article>
  `;
}

function renderGraph(controller: TaskfoldProjectViewController) {
  const { state } = controller;
  const project = state.project;
  if (!project) {
    return nothing;
  }
  const cards = project.cards.filter((card) => !isArchivedCard(card)).slice(0, 200);
  const requirements = cards.filter(
    (card) => isRequirementCard(card) && !cardRequirementId(card),
  );
  const childrenByRequirement = new Map<string, TaskfoldCard[]>();
  const unassigned: TaskfoldCard[] = [];
  for (const card of cards) {
    if (isRequirementCard(card)) {
      continue;
    }
    const requirementId = cardRequirementId(card);
    if (!requirementId) {
      unassigned.push(card);
      continue;
    }
    const children = childrenByRequirement.get(requirementId) ?? [];
    children.push(card);
    childrenByRequirement.set(requirementId, children);
  }
  const graphCards = [...requirements, ...unassigned, ...[...childrenByRequirement.values()].flat()];
  const graphEdges = graphCards.flatMap<TaskfoldGraphEdge>((card) =>
    (card.metadata?.links ?? []).flatMap<TaskfoldGraphEdge>((link) => {
      if (!link.targetCardId || link.type === "contained_by" || link.type === "child") {
        return [];
      }
      if (link.type === "parent") {
        return [{ from: link.targetCardId, to: card.id, type: link.type }];
      }
      return [{ from: card.id, to: link.targetCardId, type: link.type }];
    }),
  );
  const projectArchived = Boolean(project.board.archivedAt);
  const zoom = Math.min(1.5, Math.max(0.7, state.graphZoom));
  return html`
    <section class="taskfold-project__graph">
      <div class="taskfold-project__section-heading">
        <div>
          <h1>${t("taskfoldProject.graph")}</h1>
          <p>${project.board.currentObjective || project.board.description || project.board.id}</p>
        </div>
        <div class="taskfold-project__heading-actions">
          <div class="taskfold-project__graph-mode" role="group" aria-label=${t("taskfoldProject.graphMode")}>
            <button
              class=${state.graphMode === "mindmap" ? "is-active" : ""}
              type="button"
              @click=${() => controller.setGraphMode("mindmap")}
            >${t("taskfoldProject.mindMap")}</button>
            <button
              class=${state.graphMode === "flow" ? "is-active" : ""}
              type="button"
              @click=${() => controller.setGraphMode("flow")}
            >${t("taskfoldProject.flowChart")}</button>
          </div>
          <button
            class="taskfold-project__icon-button"
            type="button"
            title=${t("taskfoldProject.zoomOut")}
            @click=${() => controller.setGraphZoom(zoom - 0.1)}
          >-</button>
          <button
            class="taskfold-project__icon-button"
            type="button"
            title=${t("taskfoldProject.fitGraph")}
            @click=${() => controller.setGraphZoom(1)}
          >o</button>
          <button
            class="taskfold-project__icon-button"
            type="button"
            title=${t("taskfoldProject.zoomIn")}
            @click=${() => controller.setGraphZoom(zoom + 0.1)}
          >+</button>
        </div>
      </div>
      ${project.cards.filter((card) => !isArchivedCard(card)).length > 200
        ? html`<div class="callout">${t("taskfoldProject.graphLimitReached")}</div>`
        : nothing}
      <div class="taskfold-project__graph-viewport">
        ${state.graphMode === "mindmap"
          ? html`
              <div class="taskfold-project__mindmap" style=${`--taskfold-graph-zoom:${zoom}`}>
                <section
                  class="taskfold-project__graph-root"
                  @dragover=${(event: DragEvent) => event.preventDefault()}
                  @drop=${(event: DragEvent) => {
                    event.preventDefault();
                    const id = event.dataTransfer?.getData("text/plain") || state.draggedCardId;
                    if (id) {
                      controller.moveCardRequirement(id);
                    }
                  }}
                >
                  <header>
                    <strong>${boardName(project.board)}</strong>
                    <button
                      class="taskfold-project__graph-add"
                      type="button"
                      title=${t("taskfoldProject.newRequirement")}
                      ?disabled=${projectArchived || !controller.connected}
                      @click=${() =>
                        controller.openModal({ kind: "card", cardKind: "requirement" })}
                    >+</button>
                  </header>
                  <div class="taskfold-project__graph-branches">
                    ${requirements.map((requirement) => {
                      const children = childrenByRequirement.get(requirement.id) ?? [];
                      return html`
                        <section
                          class="taskfold-project__graph-branch"
                          @dragover=${(event: DragEvent) => event.preventDefault()}
                          @drop=${(event: DragEvent) => {
                            event.preventDefault();
                            const id = event.dataTransfer?.getData("text/plain") || state.draggedCardId;
                            if (id) {
                              controller.moveCardRequirement(id, requirement.id);
                            }
                          }}
                        >
                          ${renderGraphNode(controller, requirement, { requirementId: requirement.id })}
                          <div class="taskfold-project__graph-children">
                            ${children.map((child) => renderGraphNode(controller, child))}
                          </div>
                        </section>
                      `;
                    })}
                    <section class="taskfold-project__graph-branch is-unassigned">
                      <header>${t("taskfoldProject.unassigned")}</header>
                      <div class="taskfold-project__graph-children">
                        ${unassigned.map((card) => renderGraphNode(controller, card))}
                      </div>
                    </section>
                  </div>
                </section>
              </div>
            `
          : html`
              <div class="taskfold-project__flowgraph" style=${`--taskfold-graph-zoom:${zoom}`}>
                <div class="taskfold-project__flow-nodes">
                  ${graphCards.map((card) => renderGraphNode(controller, card))}
                </div>
                <div class="taskfold-project__flow-edges">
                  ${graphEdges.length
                    ? graphEdges.map((edge) => {
                        const from = graphCards.find((card) => card.id === edge.from);
                        const to = graphCards.find((card) => card.id === edge.to);
                        return from && to
                          ? html`
                              <button
                                class="taskfold-project__flow-edge is-${edge.type}"
                                type="button"
                                @click=${() =>
                                  controller.openModal({ kind: "card-detail", cardId: to.id })}
                              >
                                <span>${from.title}</span><b>-></b><span>${to.title}</span>
                              </button>
                            `
                          : nothing;
                      })
                    : html`<p class="taskfold-project__empty-column">${t("taskfoldProject.noGraphRelations")}</p>`}
                </div>
              </div>
            `}
      </div>
    </section>
  `;
}

function renderSettings(controller: TaskfoldProjectViewController) {
  const project = controller.state.project;
  if (!project) {
    return nothing;
  }
  const workspacePath = project.board.defaultWorkspace?.path ?? "";
  return html`
    <section class="taskfold-project__settings">
      <div class="taskfold-project__section-heading">
        <div>
          <h1>${t("taskfoldProject.projectSettings")}</h1>
          <p>${project.board.id}</p>
        </div>
        ${project.board.archivedAt
          ? html`
              <button class="btn" type="button" @click=${() => controller.archiveProject(false)}>
                ${t("taskfoldProject.restoreProject")}
              </button>
            `
          : html`
              <button class="btn btn--danger" type="button" @click=${() => controller.archiveProject(true)}>
                ${t("taskfoldProject.archiveProject")}
              </button>
            `}
      </div>
      <form
        class="taskfold-project__settings-form"
        @submit=${(event: SubmitEvent) => {
          event.preventDefault();
          controller.updateProject(readForm(event));
        }}
      >
        <label>
          ${t("taskfoldProject.projectName")}
          <input name="name" required .value=${project.board.name ?? ""} />
        </label>
        <label>
          ${t("taskfoldProject.version")}
          <input name="version" .value=${project.board.version ?? ""} />
        </label>
        <label class="taskfold-project__wide-field">
          ${t("taskfoldProject.currentObjective")}
          <textarea name="currentObjective" .value=${project.board.currentObjective ?? ""}></textarea>
        </label>
        <label class="taskfold-project__wide-field">
          ${t("taskfoldProject.coreValue")}
          <textarea name="coreValue" .value=${project.board.coreValue ?? ""}></textarea>
        </label>
        <label>
          ${t("taskfoldProject.sourceOfTruth")}
          <input name="sourceOfTruth" type="url" .value=${project.board.sourceOfTruth ?? ""} />
        </label>
        <label>
          ${t("taskfoldProject.repositoryUrl")}
          <input name="repositoryUrl" type="url" .value=${project.board.repositoryUrl ?? ""} />
        </label>
        <label>
          ${t("taskfoldProject.planningPath")}
          <input name="planningPath" .value=${project.board.planningPath ?? ""} />
        </label>
        <label>
          ${t("taskfoldProject.homepageUrl")}
          <input name="homepageUrl" type="url" .value=${project.board.homepageUrl ?? ""} />
        </label>
        <label class="taskfold-project__wide-field">
          ${t("taskfoldProject.defaultWorkspace")}
          <input name="workspacePath" .value=${workspacePath} />
          <small>${t("taskfoldProject.defaultWorkspaceHelp")}</small>
        </label>
        <div class="taskfold-project__form-actions">
          <button class="btn btn--primary" type="submit" ?disabled=${controller.state.busy}>
            ${t("taskfoldProject.updateProject")}
          </button>
        </div>
      </form>
    </section>
  `;
}

type DocumentIndexGroup = {
  id: string;
  label: string;
  documents: TaskfoldProjectDocument[];
};

function documentIndexGroups(
  documents: TaskfoldProjectDocument[],
): DocumentIndexGroup[] {
  return [
    {
      id: "project",
      label: t("taskfoldProject.groupProject"),
      documents: documents.filter(
        (document) => document.source === "project" && document.section === "project",
      ),
    },
    {
      id: "ai-system",
      label: t("taskfoldProject.groupAiSystem"),
      documents: documents.filter((document) => document.source === "ai_system"),
    },
    {
      id: "codebase",
      label: sectionLabel("codebase"),
      documents: documents.filter(
        (document) => document.source === "project" && document.section === "codebase",
      ),
    },
    {
      id: "environment",
      label: sectionLabel("environment"),
      documents: documents.filter(
        (document) => document.source === "project" && document.section === "environment",
      ),
    },
    {
      id: "knowledge",
      label: sectionLabel("knowledge"),
      documents: documents.filter(
        (document) => document.source === "project" && document.section === "knowledge",
      ),
    },
  ];
}

function renderDocumentIndex(
  controller: TaskfoldProjectViewController,
  documents: TaskfoldProjectDocument[],
) {
  const { state } = controller;
  const workspacePath = state.project?.board.defaultWorkspace?.path;
  return html`
    <div class="taskfold-project__document-index" role="list">
      ${documentIndexGroups(documents).map(
        (group) => html`
          <section class="taskfold-project__document-group">
            <h2>${group.label}</h2>
            ${group.documents.length
              ? html`
                  <div class="taskfold-project__document-list">
                    ${group.documents.map(
                      (document) => html`
                        <button
                          class="taskfold-project__document-index-item ${document.hiddenAt
                            ? "is-hidden"
                            : ""} ${document.id === state.selectedDocumentId ? "is-selected" : ""}"
                          type="button"
                          @click=${() => controller.openDocument(document.id)}
                        >
                          <span>${document.title}</span>
                          <small>
                            ${documentPathLabel(document.target, workspacePath) ??
                            documentTypeLabel(document.type)}
                          </small>
                          <em>${documentSourceLabel(document.source)}</em>
                        </button>
                      `,
                    )}
                  </div>
                `
              : html`<p class="taskfold-project__empty-column">${t(
                  "taskfoldProject.noDocuments",
                )}</p>`}
          </section>
        `,
      )}
    </div>
  `;
}

function renderDocuments(controller: TaskfoldProjectViewController) {
  const { state } = controller;
  const project = state.project;
  if (!project) {
    return nothing;
  }
  const query = state.documentQuery.trim().toLocaleLowerCase();
  const visibleDocuments = state.documents.filter((document) => {
    if (!state.showHiddenDocuments && document.hiddenAt) {
      return false;
    }
    if (state.documentSourceFilter !== "all" && document.source !== state.documentSourceFilter) {
      return false;
    }
    return (
      !query ||
      `${document.title} ${document.key} ${document.summary ?? ""} ${document.target ?? ""}`
        .toLocaleLowerCase()
        .includes(query)
    );
  });
  return html`
    <section class="taskfold-project__documents">
      <div class="taskfold-project__section-heading">
        <div>
          <h1>${t("taskfoldProject.documentLibrary")}</h1>
          <p>${boardName(project.board)}</p>
        </div>
        <div class="taskfold-project__heading-actions">
          <label class="taskfold-project__document-search">
            <span class="taskfold-project__sr-only">${t("taskfoldProject.searchDocuments")}</span>
            <input
              type="search"
              placeholder=${t("taskfoldProject.searchDocuments")}
              .value=${state.documentQuery}
              @input=${(event: InputEvent) => {
                state.documentQuery = (event.currentTarget as HTMLInputElement).value;
                controller.requestUpdate();
              }}
            />
          </label>
          <select
            class="taskfold-project__document-source-filter"
            aria-label=${t("taskfoldProject.documentSource")}
            .value=${state.documentSourceFilter}
            @change=${(event: Event) => {
              state.documentSourceFilter = (event.currentTarget as HTMLSelectElement)
                .value as TaskfoldProjectUiState["documentSourceFilter"];
              controller.requestUpdate();
            }}
          >
            <option value="all">${t("taskfoldProject.allDocumentSources")}</option>
            ${DOCUMENT_SOURCES.map(
              (source) =>
                html`<option value=${source}>${documentSourceLabel(source)}</option>`,
            )}
          </select>
          <label class="taskfold-project__checkbox">
            <input
              type="checkbox"
              .checked=${state.showHiddenDocuments}
              @change=${(event: Event) => {
                state.showHiddenDocuments = (event.currentTarget as HTMLInputElement).checked;
                controller.requestUpdate();
              }}
            />
            ${t("taskfoldProject.showHidden")}
          </label>
          <button
            class="btn btn--primary"
            type="button"
            @click=${() => controller.openModal({ kind: "document" })}
          >
            ${t("taskfoldProject.addDocument")}
          </button>
        </div>
      </div>
      ${renderDocumentIndex(controller, visibleDocuments)}
      ${renderDocumentPreview(controller)}
    </section>
  `;
}

function renderDocumentPreview(controller: TaskfoldProjectViewController) {
  const { state } = controller;
  const document =
    state.documents.find((candidate) => candidate.id === state.selectedDocumentId) ?? null;
  if (!document) {
    return html`
      <section class="taskfold-project__document-reader is-empty">
        <p>${t("taskfoldProject.selectDocument")}</p>
      </section>
    `;
  }
  const preview = state.documentPreview;
  const editable =
    document.type === "markdown" || (document.type === "path" && preview?.source === "path");
  const draftContent = state.documentDraft;
  const dirty = draftContent !== null && draftContent !== preview?.content;
  const content = draftContent ?? preview?.content ?? "";
  const sectionDocuments = state.documents.filter(
    (candidate) => candidate.section === document.section,
  );
  const sameSourceDocuments = sectionDocuments.filter(
    (candidate) => candidate.source === document.source,
  );
  const moveUp = reorderVisibleItemIds(sectionDocuments, sameSourceDocuments, document.id, -1);
  const moveDown = reorderVisibleItemIds(sectionDocuments, sameSourceDocuments, document.id, 1);
  const displayPath = documentPathLabel(
    preview?.path ?? document.target,
    state.project?.board.defaultWorkspace?.path,
  );
  return html`
    <section class="taskfold-project__document-reader">
      <header>
        <div class="taskfold-project__document-reader-title">
          <div class="taskfold-project__document-reader-heading">
            <h2>${document.title}</h2>
            <span class="taskfold-project__document-source-tag">${documentSourceLabel(
              document.source,
            )}</span>
            ${dirty
              ? html`<span class="taskfold-project__document-unsaved">${t(
                  "taskfoldProject.unsavedDocument",
                )}</span>`
              : nothing}
          </div>
          <small>${displayPath ?? documentTypeLabel(document.type)}</small>
          ${displayPath && preview?.path && displayPath !== preview.path
            ? html`<small class="taskfold-project__document-full-path">${preview.path}</small>`
            : nothing}
        </div>
        <div class="taskfold-project__document-reader-actions">
          ${editable
            ? html`
                <button
                  class="btn"
                  type="button"
                  ?disabled=${state.documentPreviewLoading || state.busy}
                  @click=${controller.startDocumentEdit}
                >${t("taskfoldProject.editDocumentContent")}</button>
              `
            : nothing}
          ${dirty
            ? html`
                <button
                  class="btn"
                  type="button"
                  ?disabled=${state.busy}
                  @click=${controller.cancelDocumentEdit}
                >${t("common.cancel")}</button>
                <button
                  class="btn btn--primary"
                  type="button"
                  ?disabled=${state.busy || !preview}
                  @click=${controller.saveDocumentContent}
                >${t("taskfoldProject.saveDocument")}</button>
              `
            : nothing}
          <button
            class="taskfold-project__icon-button"
            type="button"
            title=${t("taskfoldProject.editDocument")}
            aria-label=${t("taskfoldProject.editDocument")}
            ?disabled=${state.busy}
            @click=${() => controller.openModal({ kind: "document", document })}
          >...</button>
          ${renderOrderControls({
            canMoveUp: Boolean(moveUp),
            canMoveDown: Boolean(moveDown),
            onMoveUp: () => moveUp && controller.reorderDocuments(moveUp),
            onMoveDown: () => moveDown && controller.reorderDocuments(moveDown),
          })}
          <button
            class="taskfold-project__icon-button"
            type="button"
            title=${document.hiddenAt ? t("taskfoldProject.restoreDocument") : t("taskfoldProject.hideDocument")}
            aria-label=${document.hiddenAt ? t("taskfoldProject.restoreDocument") : t("taskfoldProject.hideDocument")}
            ?disabled=${state.busy}
            @click=${() => controller.hideDocument(document.id, !document.hiddenAt)}
          >${document.hiddenAt ? "Restore" : "-"}</button>
          ${!document.system
            ? html`
                <button
                  class="taskfold-project__icon-button"
                  type="button"
                  title=${t("taskfoldProject.deleteDocument")}
                  aria-label=${t("taskfoldProject.deleteDocument")}
                  ?disabled=${state.busy}
                  @click=${() => controller.deleteDocument(document.id)}
                >x</button>
              `
            : nothing}
          <button
            class="taskfold-project__icon-button"
            type="button"
            title=${t("taskfoldProject.refreshDocument")}
            aria-label=${t("taskfoldProject.refreshDocument")}
            ?disabled=${state.documentPreviewLoading || state.documentDraft !== null}
            @click=${controller.refreshDocument}
          >&#8635;</button>
        </div>
      </header>
      ${state.documentPreviewLoading
        ? html`<p class="taskfold-project__document-reader-message">${t(
            "taskfoldProject.readingDocument",
          )}</p>`
        : state.documentEditing
            ? html`
                <div class="taskfold-project__document-editor">
                  ${state.documentPreviewError
                    ? html`<p class="taskfold-project__document-reader-message is-error">${state.documentPreviewError}</p>`
                    : nothing}
                  <div
                    class="taskfold-project__document-editor-toolbar"
                    role="toolbar"
                    aria-label=${t("taskfoldProject.richTextToolbar")}
                  >
                    <button
                      class="taskfold-project__editor-button"
                      type="button"
                      title=${t("taskfoldProject.formatBold")}
                      aria-label=${t("taskfoldProject.formatBold")}
                      @mousedown=${(event: MouseEvent) => event.preventDefault()}
                      @click=${() => controller.formatDocument("bold")}
                    ><strong>B</strong></button>
                    <button
                      class="taskfold-project__editor-button"
                      type="button"
                      title=${t("taskfoldProject.formatItalic")}
                      aria-label=${t("taskfoldProject.formatItalic")}
                      @mousedown=${(event: MouseEvent) => event.preventDefault()}
                      @click=${() => controller.formatDocument("italic")}
                    ><em>I</em></button>
                    <button
                      class="taskfold-project__editor-button"
                      type="button"
                      title=${t("taskfoldProject.formatHeading")}
                      aria-label=${t("taskfoldProject.formatHeading")}
                      @mousedown=${(event: MouseEvent) => event.preventDefault()}
                      @click=${() => controller.formatDocument("formatBlock")}
                    >H</button>
                    <button
                      class="taskfold-project__editor-button"
                      type="button"
                      title=${t("taskfoldProject.formatList")}
                      aria-label=${t("taskfoldProject.formatList")}
                      @mousedown=${(event: MouseEvent) => event.preventDefault()}
                      @click=${() => controller.formatDocument("insertUnorderedList")}
                    >${t("taskfoldProject.formatList")}</button>
                  </div>
                  <div
                    class="taskfold-project__rich-editor"
                    contenteditable="true"
                    role="textbox"
                    aria-multiline="true"
                    aria-label=${t("taskfoldProject.documentContent")}
                    .innerHTML=${taskfoldMarkdownToEditorHtml(content)}
                    @input=${(event: InputEvent) => {
                      state.documentDraft = taskfoldEditorHtmlToMarkdown(
                        (event.currentTarget as HTMLElement).innerHTML,
                      );
                    }}
                    @keydown=${(event: KeyboardEvent) => {
                      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "s") {
                        event.preventDefault();
                        controller.saveDocumentContent();
                      }
                    }}
                  ></div>
                  <div class="taskfold-project__document-editor-actions">
                    <button class="btn" type="button" @click=${controller.cancelDocumentEdit}>
                      ${t("common.cancel")}
                    </button>
                    <button class="btn" type="button" @click=${controller.previewDocumentDraft}>
                      ${t("taskfoldProject.previewDocument")}
                    </button>
                    <button
                      class="btn btn--primary"
                      type="button"
                      ?disabled=${state.busy}
                      @click=${controller.saveDocumentContent}
                    >${t("taskfoldProject.saveDocument")}</button>
                  </div>
                </div>
              `
            : state.documentPreviewError
              ? html`<p class="taskfold-project__document-reader-message is-error">${state.documentPreviewError}</p>`
            : preview
              ? html`<article class="taskfold-markdown">${renderTaskfoldMarkdown(content)}</article>`
              : html`<p class="taskfold-project__document-reader-message">${t(
                  "taskfoldProject.noDocumentContent",
                )}</p>`}
    </section>
  `;
}

function renderCardDetail(controller: TaskfoldProjectViewController, card: TaskfoldCard) {
  const project = controller.state.project;
  if (!project) {
    return nothing;
  }
  const otherProjects = controller.state.projects.filter(
    (candidate) => candidate.id !== boardId(card) && !candidate.archivedAt,
  );
  return html`
    <div class="taskfold-project__modal-panel taskfold-project__detail-panel">
      <header>
        <div>
          <small>${boardName(project.board)}</small>
          <h2>${t("taskfoldProject.details")}</h2>
        </div>
        <button class="taskfold-project__icon-button" type="button" @click=${controller.closeModal}>&times;</button>
      </header>
      <div class="taskfold-project__detail-body">
        <h3>${card.title}</h3>
        ${card.notes ? html`<p class="taskfold-project__detail-notes">${card.notes}</p>` : nothing}
        <dl>
          <div><dt>${t("taskfoldProject.status")}</dt><dd>${t(`workboard.status.${card.status}`)}</dd></div>
          <div><dt>${t("taskfoldProject.priority")}</dt><dd>${card.priority}</dd></div>
          <div><dt>${t("taskfoldProject.assignee")}</dt><dd>${card.agentId || t("taskfoldProject.unassigned")}</dd></div>
          <div><dt>${t("taskfoldProject.viewProject")}</dt><dd>${boardId(card)}</dd></div>
        </dl>
        <label>
          ${t("taskfoldProject.status")}
          <select
            .value=${card.status}
            @change=${(event: Event) =>
              controller.updateCardStatus(
                card.id,
                (event.currentTarget as HTMLSelectElement).value as TaskfoldStatus,
              )}
          >
            ${renderStatusOptions(card.status)}
          </select>
        </label>
        <label>
          ${t("taskfoldProject.moveTo")}
          <select
            .value=${card.milestoneId ?? ""}
            ?disabled=${Boolean(project.board.archivedAt)}
            @change=${(event: Event) =>
              controller.moveCardMilestone(
                card.id,
                (event.currentTarget as HTMLSelectElement).value || undefined,
              )}
          >
            <option value="">${t("taskfoldProject.unassigned")}</option>
            ${project.milestones
              .filter((milestone) => milestone.state === "active")
              .map(
                (milestone) =>
                  html`<option value=${milestone.id}>${milestone.title}</option>`,
              )}
          </select>
        </label>
        ${renderExecutionSection(controller, card)}
        ${renderDeliverySection(controller, card)}
        ${renderSourceReferenceSection(controller, card)}
        ${renderEvidenceSection(controller, card)}
        ${otherProjects.length
          ? html`
              <button
                class="btn"
                type="button"
                ?disabled=${Boolean(project.board.archivedAt)}
                @click=${() => controller.openModal({ kind: "move-project", cardId: card.id })}
              >
                ${t("taskfoldProject.moveToProject")}
              </button>
            `
          : nothing}
      </div>
      <footer>
        <button
          class="btn"
          type="button"
          @click=${() => {
            controller.closeModal();
            controller.selectProject(boardId(card));
          }}
        >
          ${t("taskfoldProject.viewProject")}
        </button>
        <button
          class="btn"
          type="button"
          @click=${() => controller.archiveCard(card.id, !isArchivedCard(card))}
        >
          ${isArchivedCard(card) ? t("taskfoldProject.restoreCard") : t("taskfoldProject.archiveCard")}
        </button>
        <button class="btn btn--primary" type="button" @click=${controller.closeModal}>
          ${t("taskfoldProject.close")}
        </button>
      </footer>
    </div>
  `;
}

function renderExecutionSection(controller: TaskfoldProjectViewController, card: TaskfoldCard) {
  const { state } = controller;
  const projectArchived = Boolean(state.project?.board.archivedAt);
  if (isRequirementCard(card)) {
    return html`
      <section class="taskfold-project__detail-section taskfold-project__execution-section">
        <h3>${t("taskfoldProject.execution")}</h3>
        <p class="taskfold-project__detail-empty">${t("taskfoldProject.requirementExecutionDisabled")}</p>
      </section>
    `;
  }
  const inspection = inspectionForCard(state, card.id);
  const active = inspection?.active === true;
  const unresolvedActive = !active && hasActiveCardExecution(card);
  const sessionKey = inspection?.sessionKey ?? card.execution?.sessionKey ?? card.sessionKey;
  const runId = inspection?.runId ?? card.execution?.runId ?? card.runId;
  const workspace = card.metadata?.automation?.workspace;
  const inspectionError =
    state.executionInspectionCardId === card.id ? state.executionInspectionError : null;
  const inspectionLoading =
    state.executionInspectionCardId === card.id && state.executionInspectionLoading;

  return html`
    <section class="taskfold-project__detail-section taskfold-project__execution-section">
      <div class="taskfold-project__execution-heading">
        <h3>${t("taskfoldProject.execution")}</h3>
        ${active
          ? html`
              <button
                class="taskfold-project__icon-button"
                type="button"
                title=${t("taskfoldProject.refreshExecution")}
                aria-label=${t("taskfoldProject.refreshExecution")}
                ?disabled=${inspectionLoading}
                @click=${() => controller.refreshCardExecution(card.id)}
              >&#8635;</button>
            `
          : nothing}
      </div>
      ${active
        ? html`
            <p class="taskfold-project__execution-state">
              ${t("taskfoldProject.executionRunning")}
            </p>
            <dl class="taskfold-project__execution-facts">
              ${sessionKey
                ? html`<div><dt>${t("taskfoldProject.executionSession")}</dt><dd>${sessionKey}</dd></div>`
                : nothing}
              ${runId
                ? html`<div><dt>${t("taskfoldProject.executionRun")}</dt><dd>${runId}</dd></div>`
                : nothing}
              ${workspace?.kind === "worktree" && workspace.path
                ? html`<div><dt>${t("taskfoldProject.executionWorktreePath")}</dt><dd>${workspace.path}</dd></div>`
                : nothing}
            </dl>
            ${inspectionLoading
              ? html`<p class="taskfold-project__detail-empty">${t(
                  "taskfoldProject.refreshingExecution",
                )}</p>`
              : nothing}
            ${inspectionError
              ? html`<p class="taskfold-project__execution-error">${inspectionError}</p>`
              : nothing}
            ${inspection?.preview
              ? html`
                  <details class="taskfold-project__execution-preview">
                    <summary>${t("taskfoldProject.executionSessionPreview")}</summary>
                    <pre>${executionValue(inspection.preview)}</pre>
                  </details>
                `
              : nothing}
            <div class="taskfold-project__execution-actions">
              ${sessionKey
                ? html`
                    <a class="btn" href=${taskfoldNativeChatHref(sessionKey)} target="_top">
                      ${t("taskfoldProject.openNativeChat")}
                    </a>
                  `
                : nothing}
              <button
                class="btn btn--danger"
                type="button"
                ?disabled=${state.busy}
                @click=${() => controller.abortCardExecution(card.id)}
              >
                ${t("taskfoldProject.stopExecution")}
              </button>
            </div>
            <form
              class="taskfold-project__execution-steer"
              @submit=${(event: SubmitEvent) => {
                event.preventDefault();
                controller.steerCardExecution(card.id, readForm(event).message ?? "");
              }}
            >
              <label>
                ${t("taskfoldProject.steerInstruction")}
                <textarea
                  name="message"
                  required
                  placeholder=${t("taskfoldProject.steerInstructionPlaceholder")}
                ></textarea>
              </label>
              <button class="btn" type="submit" ?disabled=${state.busy}>
                ${t("taskfoldProject.steerExecution")}
              </button>
            </form>
          `
        : unresolvedActive
          ? html`
              <p class="taskfold-project__detail-empty">
                ${inspectionLoading
                  ? t("taskfoldProject.refreshingExecution")
                  : t("taskfoldProject.executionCheckRequired")}
              </p>
              ${inspectionError
                ? html`<p class="taskfold-project__execution-error">${inspectionError}</p>`
                : nothing}
              <button
                class="btn"
                type="button"
                ?disabled=${inspectionLoading}
                @click=${() => controller.refreshCardExecution(card.id)}
              >
                ${t("taskfoldProject.refreshExecution")}
              </button>
            `
        : html`
            <p class="taskfold-project__detail-empty">
              ${card.execution?.status === "done"
                ? t("taskfoldProject.executionFinished")
                : card.execution?.status === "blocked"
                  ? t("taskfoldProject.executionStopped")
                  : t("taskfoldProject.executionIdle")}
            </p>
            ${runId || (workspace?.kind === "worktree" && workspace.path)
              ? html`
                  <dl class="taskfold-project__execution-facts">
                    ${runId
                      ? html`<div><dt>${t("taskfoldProject.executionRun")}</dt><dd>${runId}</dd></div>`
                      : nothing}
                    ${workspace?.kind === "worktree" && workspace.path
                      ? html`<div><dt>${t("taskfoldProject.executionWorktreePath")}</dt><dd>${workspace.path}</dd></div>`
                      : nothing}
                  </dl>
                `
              : nothing}
            <button
              class="btn btn--primary"
              type="button"
              ?disabled=${state.busy || !controller.connected || isArchivedCard(card) || projectArchived}
              @click=${() => controller.prepareCardExecution(card.id)}
            >
              ${t("taskfoldProject.startExecution")}
            </button>
          `}
    </section>
  `;
}

function renderDeliverySection(controller: TaskfoldProjectViewController, card: TaskfoldCard) {
  const delivery = card.delivery;
  return html`
    <section class="taskfold-project__detail-section">
      <h3>${t("taskfoldProject.deliveryFacts")}</h3>
      <form
        class="taskfold-project__delivery-form"
        @submit=${(event: SubmitEvent) => {
          event.preventDefault();
          controller.updateCardDelivery(card.id, readForm(event));
        }}
      >
        <label>
          ${t("taskfoldProject.deliveryObjective")}
          <textarea name="objective" .value=${delivery?.objective ?? ""}></textarea>
        </label>
        <label>
          ${t("taskfoldProject.deliverySummary")}
          <textarea name="deliverySummary" .value=${delivery?.deliverySummary ?? ""}></textarea>
        </label>
        <label>
          ${t("taskfoldProject.deliveryOpenItems")}
          <textarea name="openItems" .value=${delivery?.openItems ?? ""}></textarea>
        </label>
        <div class="taskfold-project__modal-grid">
          <label>
            ${t("taskfoldProject.deliveryImplementation")}
            <select name="implementationState">
              ${renderDeliveryOptions(
                IMPLEMENTATION_STATES,
                delivery?.implementationState,
                "implementation",
              )}
            </select>
          </label>
          <label>
            ${t("taskfoldProject.deliveryVerification")}
            <select name="verificationState">
              ${renderDeliveryOptions(
                VERIFICATION_STATES,
                delivery?.verificationState,
                "verification",
              )}
            </select>
          </label>
          <label>
            ${t("taskfoldProject.deliveryRelease")}
            <select name="releaseState">
              ${renderDeliveryOptions(RELEASE_STATES, delivery?.releaseState, "release")}
            </select>
          </label>
        </div>
        <button class="btn" type="submit" ?disabled=${controller.state.busy}>
          ${t("taskfoldProject.saveDelivery")}
        </button>
      </form>
    </section>
  `;
}

function renderSourceReferenceSection(controller: TaskfoldProjectViewController, card: TaskfoldCard) {
  const references = [...(card.sourceReferences ?? [])].toSorted(
    (left, right) => left.position - right.position || left.createdAt - right.createdAt,
  );
  return html`
    <section class="taskfold-project__detail-section">
      <h3>${t("taskfoldProject.sourceReferences")}</h3>
      <div class="taskfold-project__detail-list">
        ${references.length
          ? references.map((reference, index) => {
              const ids = references.map((item) => item.id);
              const moveUp =
                index > 0
                  ? [
                      ...ids.slice(0, index - 1),
                      reference.id,
                      ids[index - 1]!,
                      ...ids.slice(index + 1),
                    ]
                  : undefined;
              const moveDown =
                index < ids.length - 1
                  ? [
                      ...ids.slice(0, index),
                      ids[index + 1]!,
                      reference.id,
                      ...ids.slice(index + 2),
                    ]
                  : undefined;
              return html`
                <form
                  class="taskfold-project__source-reference"
                  @submit=${(event: SubmitEvent) => {
                    event.preventDefault();
                    controller.updateSourceReference(card.id, readForm(event));
                  }}
                >
                  <input type="hidden" name="sourceReferenceId" value=${reference.id} />
                  <input name="label" aria-label=${t("taskfoldProject.sourceReferenceLabel")} .value=${reference.label} required />
                  <input name="target" aria-label=${t("taskfoldProject.sourceReferenceTarget")} .value=${reference.target} required />
                  <input name="note" aria-label=${t("taskfoldProject.sourceReferenceNote")} .value=${reference.note ?? ""} />
                  <div class="taskfold-project__inline-actions">
                    <button class="btn" type="submit" ?disabled=${controller.state.busy}>
                      ${t("taskfoldProject.save")}
                    </button>
                    ${renderOrderControls({
                      canMoveUp: Boolean(moveUp),
                      canMoveDown: Boolean(moveDown),
                      onMoveUp: () =>
                        moveUp && controller.reorderSourceReferences(card.id, moveUp),
                      onMoveDown: () =>
                        moveDown && controller.reorderSourceReferences(card.id, moveDown),
                    })}
                    <button
                      class="taskfold-project__icon-button"
                      type="button"
                      title=${t("common.delete")}
                      @click=${() => controller.deleteSourceReference(card.id, reference.id)}
                    >&times;</button>
                  </div>
                </form>
              `;
            })
          : html`<p class="taskfold-project__detail-empty">${t(
              "taskfoldProject.noSourceReferences",
            )}</p>`}
      </div>
      <form
        class="taskfold-project__source-reference"
        @submit=${(event: SubmitEvent) => {
          event.preventDefault();
          controller.createSourceReference(card.id, readForm(event));
        }}
      >
        <input name="label" placeholder=${t("taskfoldProject.sourceReferenceLabel")} required />
        <input name="target" placeholder=${t("taskfoldProject.sourceReferenceTarget")} required />
        <input name="note" placeholder=${t("taskfoldProject.sourceReferenceNote")} />
        <button class="btn" type="submit" ?disabled=${controller.state.busy}>
          ${t("taskfoldProject.addSourceReference")}
        </button>
      </form>
    </section>
  `;
}

function renderEvidenceSection(controller: TaskfoldProjectViewController, card: TaskfoldCard) {
  const proof = card.metadata?.proof ?? [];
  const artifacts = card.metadata?.artifacts ?? [];
  return html`
    <section class="taskfold-project__detail-section">
      <h3>${t("taskfoldProject.proof")}</h3>
      <div class="taskfold-project__detail-list">
        ${proof.length
          ? proof.map(
              (entry) => html`
                <div class="taskfold-project__evidence-item">
                  <span>${entry.label || entry.command || entry.url || entry.status}</span>
                  <small>${entry.status}${entry.note ? ` · ${entry.note}` : ""}</small>
                  <button
                    class="taskfold-project__icon-button"
                    type="button"
                    title=${t("common.delete")}
                    @click=${() => controller.deleteProof(card.id, entry.id)}
                  >&times;</button>
                </div>
              `,
            )
          : html`<p class="taskfold-project__detail-empty">${t("taskfoldProject.noProof")}</p>`}
      </div>
      <form
        class="taskfold-project__evidence-form"
        @submit=${(event: SubmitEvent) => {
          event.preventDefault();
          controller.addProof(card.id, readForm(event));
        }}
      >
        <select name="status">
          <option value="unknown">${t("taskfoldProject.proofUnknown")}</option>
          <option value="passed">${t("taskfoldProject.proofPassed")}</option>
          <option value="failed">${t("taskfoldProject.proofFailed")}</option>
          <option value="skipped">${t("taskfoldProject.proofSkipped")}</option>
        </select>
        <input name="label" placeholder=${t("taskfoldProject.evidenceLabel")} />
        <input name="command" placeholder=${t("taskfoldProject.proofCommand")} />
        <input name="url" placeholder=${t("taskfoldProject.evidenceUrl")} />
        <input name="note" placeholder=${t("taskfoldProject.evidenceNote")} />
        <button class="btn" type="submit" ?disabled=${controller.state.busy}>
          ${t("taskfoldProject.addProof")}
        </button>
      </form>
    </section>
    <section class="taskfold-project__detail-section">
      <h3>${t("taskfoldProject.artifacts")}</h3>
      <div class="taskfold-project__detail-list">
        ${artifacts.length
          ? artifacts.map(
              (entry) => html`
                <div class="taskfold-project__evidence-item">
                  <span>${entry.label || entry.path || entry.url || t("taskfoldProject.artifact")}</span>
                  <small>${entry.path || entry.url || ""}</small>
                  <button
                    class="taskfold-project__icon-button"
                    type="button"
                    title=${t("common.delete")}
                    @click=${() => controller.deleteArtifact(card.id, entry.id)}
                  >&times;</button>
                </div>
              `,
            )
          : html`<p class="taskfold-project__detail-empty">${t(
              "taskfoldProject.noArtifacts",
            )}</p>`}
      </div>
      <form
        class="taskfold-project__evidence-form"
        @submit=${(event: SubmitEvent) => {
          event.preventDefault();
          controller.addArtifact(card.id, readForm(event));
        }}
      >
        <input name="label" placeholder=${t("taskfoldProject.evidenceLabel")} />
        <input name="path" placeholder=${t("taskfoldProject.artifactPath")} />
        <input name="url" placeholder=${t("taskfoldProject.evidenceUrl")} />
        <input name="mimeType" placeholder=${t("taskfoldProject.artifactMimeType")} />
        <button class="btn" type="submit" ?disabled=${controller.state.busy}>
          ${t("taskfoldProject.addArtifact")}
        </button>
      </form>
    </section>
  `;
}

function renderMoveProjectModal(
  controller: TaskfoldProjectViewController,
  modal: Extract<TaskfoldProjectModal, { kind: "move-project" }>,
) {
  const project = controller.state.project;
  const card = project?.cards.find((candidate) => candidate.id === modal.cardId);
  if (!card) {
    return nothing;
  }
  const otherProjects = controller.state.projects.filter(
    (candidate) => candidate.id !== boardId(card) && !candidate.archivedAt,
  );
  const activeMilestones = modal.targetProject?.milestones.filter(
    (milestone) => milestone.state === "active",
  ) ?? [];
  const canMove = Boolean(modal.boardId && modal.milestoneId && !controller.state.busy);
  return html`
    <form
      class="taskfold-project__modal-panel"
      @submit=${(event: SubmitEvent) => {
        event.preventDefault();
        if (modal.boardId && modal.milestoneId) {
          controller.moveCardProject(card.id, modal.boardId, modal.milestoneId);
        }
      }}
    >
      <header><h2>${t("taskfoldProject.moveToProject")}</h2></header>
      <p class="taskfold-project__move-card-title">${card.title}</p>
      <label>
        ${t("taskfoldProject.moveToProject")}
        <select
          .value=${modal.boardId ?? ""}
          ?disabled=${controller.state.busy}
          @change=${(event: Event) =>
            controller.selectMoveCardProjectTarget(
              card.id,
              (event.currentTarget as HTMLSelectElement).value,
            )}
        >
          <option value="">${t("taskfoldProject.selectTargetProject")}</option>
          ${otherProjects.map(
            (candidate) => html`<option value=${candidate.id}>${boardName(candidate)}</option>`,
          )}
        </select>
      </label>
      <label>
        ${t("taskfoldProject.targetMilestone")}
        <select
          .value=${modal.milestoneId ?? ""}
          ?disabled=${controller.state.busy || !modal.targetProject || activeMilestones.length === 0}
          @change=${(event: Event) =>
            controller.openModal({
              ...modal,
              milestoneId: (event.currentTarget as HTMLSelectElement).value || undefined,
            })}
        >
          <option value="">${t("taskfoldProject.selectTargetMilestone")}</option>
          ${activeMilestones.map(
            (milestone) => html`<option value=${milestone.id}>${milestone.title}</option>`,
          )}
        </select>
      </label>
      ${modal.targetProject && activeMilestones.length === 0
        ? html`<p class="taskfold-project__empty-column">${t("taskfoldProject.noActiveMilestones")}</p>`
        : nothing}
      <footer>
        <button class="btn" type="button" @click=${controller.closeModal}>${t("common.cancel")}</button>
        <button class="btn btn--primary" type="submit" ?disabled=${!canMove}>
          ${t("taskfoldProject.moveCard")}
        </button>
      </footer>
    </form>
  `;
}

function renderExecutionStartModal(
  controller: TaskfoldProjectViewController,
  modal: Extract<TaskfoldProjectModal, { kind: "execution-start" }>,
) {
  const card = controller.state.project?.cards.find((candidate) => candidate.id === modal.cardId);
  if (!card) {
    return nothing;
  }
  const preparation =
    controller.state.executionPreparationCardId === card.id
      ? controller.state.executionPreparation
      : null;
  const loading =
    controller.state.executionPreparationCardId === card.id &&
    controller.state.executionPreparationLoading;
  const error =
    controller.state.executionPreparationCardId === card.id
      ? controller.state.executionPreparationError
      : null;
  const model =
    preparation?.defaultProvider && preparation.defaultModel
      ? `${preparation.defaultProvider}/${preparation.defaultModel}`
      : preparation?.defaultModel ?? preparation?.defaultProvider;
  return html`
    <section class="taskfold-project__modal-panel taskfold-project__execution-confirmation">
      <header><h2>${t("taskfoldProject.startExecution")}</h2></header>
      <p class="taskfold-project__move-card-title">${card.title}</p>
      ${loading
        ? html`<p class="taskfold-project__detail-empty">${t(
            "taskfoldProject.preparingExecution",
          )}</p>`
        : error
          ? html`<p class="taskfold-project__execution-error">${error}</p>`
          : preparation
            ? html`
                ${card.status === "done"
                  ? html`<p class="callout">${t("taskfoldProject.executionDoneNotice")}</p>`
                  : nothing}
                <p class="callout">${t("taskfoldProject.executionWorktreeNotice")}</p>
                <dl class="taskfold-project__execution-facts">
                  <div><dt>${t("taskfoldProject.executionAgent")}</dt><dd>${preparation.agentId}</dd></div>
                  ${model
                    ? html`<div><dt>${t("taskfoldProject.executionModel")}</dt><dd>${model}</dd></div>`
                    : nothing}
                  <div><dt>${t("taskfoldProject.executionSource")}</dt><dd>${preparation.sourceCheckout}</dd></div>
                  ${preparation.baseBranch
                    ? html`<div><dt>${t("taskfoldProject.executionBaseBranch")}</dt><dd>${preparation.baseBranch}</dd></div>`
                    : nothing}
                  <div><dt>${t("taskfoldProject.executionWorktree")}</dt><dd>${preparation.worktreeName}</dd></div>
                </dl>
                <details class="taskfold-project__execution-preview" open>
                  <summary>${t("taskfoldProject.executionPromptPreview")}</summary>
                  <pre>${preparation.promptPreview}</pre>
                </details>
              `
            : nothing}
      <footer>
        <button class="btn" type="button" @click=${controller.closeModal}>
          ${t("common.cancel")}
        </button>
        <button
          class="btn btn--primary"
          type="button"
          ?disabled=${!preparation || loading || controller.state.busy}
          @click=${() => controller.startCardExecution(card.id)}
        >
          ${t("taskfoldProject.confirmStartExecution")}
        </button>
      </footer>
    </section>
  `;
}

function renderModal(controller: TaskfoldProjectViewController) {
  const { modal, project } = controller.state;
  if (!modal) {
    return nothing;
  }
  const closeOnBackdrop = (event: MouseEvent) => {
    if (event.target === event.currentTarget) {
      controller.closeModal();
    }
  };
  if (modal.kind === "card-detail") {
    const card = project?.cards.find((candidate) => candidate.id === modal.cardId);
    return card
      ? html`<openclaw-modal-dialog @click=${closeOnBackdrop} @modal-cancel=${controller.closeModal}>
          ${renderCardDetail(controller, card)}
        </openclaw-modal-dialog>`
      : nothing;
  }
  if (modal.kind === "execution-start") {
    return html`
      <openclaw-modal-dialog @click=${closeOnBackdrop} @modal-cancel=${controller.closeModal}>
        ${renderExecutionStartModal(controller, modal)}
      </openclaw-modal-dialog>
    `;
  }
  if (modal.kind === "move-project") {
    return html`
      <openclaw-modal-dialog @click=${closeOnBackdrop} @modal-cancel=${controller.closeModal}>
        ${renderMoveProjectModal(controller, modal)}
      </openclaw-modal-dialog>
    `;
  }
  if (modal.kind === "project") {
    return html`
      <openclaw-modal-dialog @click=${closeOnBackdrop} @modal-cancel=${controller.closeModal}>
        <form
          class="taskfold-project__modal-panel"
          @submit=${(event: SubmitEvent) => {
            event.preventDefault();
            controller.createProject(readForm(event));
          }}
        >
          <header><h2>${t("taskfoldProject.newProject")}</h2></header>
          <fieldset class="taskfold-project__project-mode">
            <legend>${t("taskfoldProject.projectMode")}</legend>
            <label>
              <input
                type="radio"
                name="projectMode"
                value="new"
                checked
                @change=${setProjectCreateMode}
              />
              <span>${t("taskfoldProject.newBlankProject")}</span>
            </label>
            <label>
              <input
                type="radio"
                name="projectMode"
                value="existing"
                @change=${setProjectCreateMode}
              />
              <span>${t("taskfoldProject.initializeExistingProject")}</span>
            </label>
          </fieldset>
          <label>${t("taskfoldProject.projectId")}<input name="id" required pattern="[a-z0-9][a-z0-9._-]{0,79}" /></label>
          <label>${t("taskfoldProject.projectName")}<input name="name" required /></label>
          <label data-project-workspace hidden>
            ${t("taskfoldProject.existingWorkspace")}
            <input name="workspacePath" />
          </label>
          <footer>
            <button class="btn" type="button" @click=${controller.closeModal}>${t("common.cancel")}</button>
            <button
              class="btn btn--primary"
              type="submit"
              ?disabled=${controller.state.busy || !controller.connected}
            >${t("taskfoldProject.createProject")}</button>
          </footer>
        </form>
      </openclaw-modal-dialog>
    `;
  }
  if (modal.kind === "card") {
    if (!project) {
      return nothing;
    }
    const cardKind = modal.cardKind ?? "task";
    return html`
      <openclaw-modal-dialog @click=${closeOnBackdrop} @modal-cancel=${controller.closeModal}>
        <form
          class="taskfold-project__modal-panel"
          @submit=${(event: SubmitEvent) => {
            event.preventDefault();
            controller.createCard(readForm(event));
          }}
        >
          <header><h2>${cardKind === "requirement" ? t("taskfoldProject.newRequirement") : t("taskfoldProject.newCard")}</h2></header>
          <input type="hidden" name="milestoneId" value=${modal.milestoneId ?? ""} />
          <input type="hidden" name="requirementId" value=${modal.requirementId ?? ""} />
          <input type="hidden" name="cardKind" value=${cardKind} />
          <label>${t("taskfoldProject.cardTitle")}<input name="title" required /></label>
          <label>${t("taskfoldProject.cardNotes")}<textarea name="notes"></textarea></label>
          <div class="taskfold-project__modal-grid">
            <label>${t("taskfoldProject.status")}<select name="status">${renderStatusOptions(modal.status ?? "todo")}</select></label>
            <label>${t("taskfoldProject.priority")}<select name="priority">${renderPriorityOptions("normal")}</select></label>
            <label>${t("taskfoldProject.assignee")}<input name="agentId" /></label>
          </div>
          <footer>
            <button class="btn" type="button" @click=${controller.closeModal}>${t("common.cancel")}</button>
            <button
              class="btn btn--primary"
              type="submit"
              ?disabled=${controller.state.busy || !controller.connected}
            >${t("taskfoldProject.createCard")}</button>
          </footer>
        </form>
      </openclaw-modal-dialog>
    `;
  }
  if (modal.kind === "milestone") {
    const milestone = modal.milestone;
    return html`
      <openclaw-modal-dialog @click=${closeOnBackdrop} @modal-cancel=${controller.closeModal}>
        <form
          class="taskfold-project__modal-panel"
          @submit=${(event: SubmitEvent) => {
            event.preventDefault();
            controller.saveMilestone(readForm(event));
          }}
        >
          <header><h2>${milestone ? t("taskfoldProject.editMilestone") : t("taskfoldProject.newMilestone")}</h2></header>
          <input type="hidden" name="id" value=${milestone?.id ?? ""} />
          <label>${t("taskfoldProject.milestoneName")}<input name="title" required .value=${milestone?.title ?? ""} /></label>
          <label>${t("taskfoldProject.milestoneDescription")}<textarea name="description" .value=${milestone?.description ?? ""}></textarea></label>
          <label>Color<input name="color" .value=${milestone?.color ?? ""} /></label>
          <footer>
            <button class="btn" type="button" @click=${controller.closeModal}>${t("common.cancel")}</button>
            <button
              class="btn btn--primary"
              type="submit"
              ?disabled=${controller.state.busy || !controller.connected}
            >
              ${milestone ? t("common.save") : t("taskfoldProject.createMilestone")}
            </button>
          </footer>
        </form>
      </openclaw-modal-dialog>
    `;
  }
  const document = modal.document;
  return html`
    <openclaw-modal-dialog @click=${closeOnBackdrop} @modal-cancel=${controller.closeModal}>
      <form
        class="taskfold-project__modal-panel taskfold-project__document-form"
        @submit=${(event: SubmitEvent) => {
          event.preventDefault();
          controller.saveDocument(readForm(event));
        }}
      >
        <header><h2>${document ? t("taskfoldProject.editDocument") : t("taskfoldProject.addDocument")}</h2></header>
        <input type="hidden" name="id" value=${document?.id ?? ""} />
        ${document
          ? nothing
          : html`<label>${t("taskfoldProject.documentKey")}<input name="key" required pattern="[a-z0-9][a-z0-9._-]{0,79}" /></label>`}
        <label>${t("taskfoldProject.documentTitle")}<input name="title" required .value=${document?.title ?? ""} /></label>
        <div class="taskfold-project__modal-grid">
          <label>
            ${t("taskfoldProject.documentSection")}
            <select name="section" ?disabled=${Boolean(document)}>
              ${DOCUMENT_SECTIONS.map(
                (section) =>
                  html`<option value=${section} ?selected=${section === (document?.section ?? "project")}>${sectionLabel(section)}</option>`,
              )}
            </select>
          </label>
          <label>
            ${t("taskfoldProject.documentType")}
            <select name="type">
              ${DOCUMENT_TYPES.map(
                (type) =>
                  html`<option value=${type} ?selected=${type === (document?.type ?? "path")}>${documentTypeLabel(type)}</option>`,
              )}
            </select>
          </label>
        </div>
        <label>${t("taskfoldProject.documentSummary")}<input name="summary" .value=${document?.summary ?? ""} /></label>
        <label>${t("taskfoldProject.documentTarget")}<input name="target" .value=${document?.target ?? ""} /></label>
        <label>${t("taskfoldProject.documentContent")}<textarea name="content" .value=${document?.content ?? ""}></textarea></label>
        <footer>
          <button class="btn" type="button" @click=${controller.closeModal}>${t("common.cancel")}</button>
          <button class="btn btn--primary" type="submit" ?disabled=${controller.state.busy}>${t("taskfoldProject.saveDocument")}</button>
        </footer>
      </form>
    </openclaw-modal-dialog>
  `;
}

function renderProjectTabs(controller: TaskfoldProjectViewController): TemplateResult {
  const { state } = controller;
  const tabs: Array<[TaskfoldProjectUiState["screen"], string]> = [
    ["board", "taskfoldProject.board"],
    ["graph", "taskfoldProject.graph"],
    ["settings", "taskfoldProject.settings"],
    ["documents", "taskfoldProject.documents"],
  ];
  return html`
    <nav class="taskfold-project__tabs" aria-label=${t("taskfoldProject.title")}>
      ${tabs.map(
        ([screen, key]) => html`
          <button
            class=${state.screen === screen ? "is-active" : ""}
            type="button"
            aria-current=${state.screen === screen ? "page" : nothing}
            @click=${() => controller.setScreen(screen)}
          >${t(key)}</button>
        `,
      )}
    </nav>
  `;
}

export function renderTaskfoldProjects(controller: TaskfoldProjectViewController): TemplateResult {
  const { state } = controller;
  const projectView =
    state.screen === "overview"
      ? renderOverview(controller)
      : !state.project
        ? html`<section class="taskfold-project__blank"><p>${t("taskfoldProject.emptyProject")}</p></section>`
        : state.screen === "board"
          ? renderBoard(controller)
          : state.screen === "graph"
            ? renderGraph(controller)
            : state.screen === "settings"
              ? renderSettings(controller)
              : renderDocuments(controller);
  return html`
    <section class="taskfold-project">
      <div class="taskfold-project__topbar">
        <div class="taskfold-project__brand">
          <strong>taskfold</strong>
          <span>${t("taskfoldProject.title")}</span>
        </div>
        <div class="taskfold-project__topbar-actions">
          ${state.loading ? html`<span class="taskfold-project__refreshing">${t("taskfoldProject.loading")}</span>` : nothing}
          <button class="taskfold-project__refresh" type="button" title=${t("taskfoldProject.refresh")} @click=${controller.refresh}>
            &#8635;
          </button>
          <button
            class="btn taskfold-project__all-projects ${state.screen === "overview" ? "is-active" : ""}"
            type="button"
            @click=${() => controller.setScreen("overview")}
          >
            <span>${t("taskfoldProject.allProjects")}</span>
            <strong>${state.projects.length}</strong>
          </button>
          <label class="taskfold-project__language">
            <span class="taskfold-project__sr-only">${t("taskfoldProject.language")}</span>
            <select
              class="taskfold-project__language-select"
              aria-label=${t("taskfoldProject.language")}
              .value=${controller.locale}
              ?disabled=${state.languageSwitching}
              @change=${(event: Event) =>
                controller.setLocale(
                  (event.currentTarget as HTMLSelectElement).value as TaskfoldLocale,
                )}
            >
              <option value="zh-CN">${t("languages.zhCN")}</option>
              <option value="en">${t("languages.en")}</option>
            </select>
          </label>
          <button
            class="btn btn--primary"
            type="button"
            ?disabled=${!controller.connected}
            @click=${() => controller.openModal({ kind: "project" })}
          >
            ${t("taskfoldProject.newProject")}
          </button>
          ${state.languageError
            ? html`<span class="taskfold-project__language-error" role="status">${state.languageError}</span>`
            : nothing}
        </div>
      </div>
      ${!controller.connected
        ? html`<div class="callout">${t("taskfoldProject.connectionRequired")}</div>`
        : nothing}
      ${state.error ? html`<div class="callout danger" role="alert">${state.error}</div>` : nothing}
      ${renderProjectToolbar(controller)}
      <main class="taskfold-project__main">
        ${state.project && state.screen !== "overview" ? renderProjectTabs(controller) : nothing}
        ${projectView}
      </main>
      ${renderModal(controller)}
    </section>
  `;
}
