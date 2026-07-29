import { html, nothing, type TemplateResult } from "lit";
import type {
  FlowboardBoardMetadata,
  FlowboardBoardSummary,
  FlowboardCard,
  FlowboardMilestone,
  FlowboardPriority,
  FlowboardProjectDocument,
  FlowboardProjectDocumentSection,
  FlowboardProjectDocumentType,
  FlowboardProjectView,
  FlowboardStatus,
} from "../../../../src/contract/index.ts";
import "../../components/modal-dialog.ts";
import { t } from "../../i18n/index.ts";
import "../../styles/flowboard-project.css";

const STATUSES: readonly FlowboardStatus[] = [
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
const PRIORITIES: readonly FlowboardPriority[] = ["low", "normal", "high", "urgent"];
const DOCUMENT_SECTIONS: readonly FlowboardProjectDocumentSection[] = [
  "project",
  "codebase",
  "environment",
  "knowledge",
];
const DOCUMENT_TYPES: readonly FlowboardProjectDocumentType[] = [
  "markdown",
  "json",
  "link",
  "path",
  "secret_ref",
];

export type FlowboardProjectModal =
  | { kind: "project" }
  | { kind: "card"; milestoneId?: string }
  | { kind: "milestone"; milestone?: FlowboardMilestone }
  | { kind: "document"; document?: FlowboardProjectDocument }
  | { kind: "card-detail"; cardId: string }
  | {
      kind: "move-project";
      cardId: string;
      boardId?: string;
      milestoneId?: string;
      targetProject?: FlowboardProjectView;
    };

export type FlowboardProjectUiState = {
  loading: boolean;
  loaded: boolean;
  busy: boolean;
  error: string | null;
  projects: FlowboardBoardSummary[];
  project: FlowboardProjectView | null;
  documents: FlowboardProjectDocument[];
  selectedProjectId: string | null;
  screen: "overview" | "board" | "settings" | "documents";
  modal: FlowboardProjectModal | null;
  draggedCardId: string | null;
  showArchivedProjects: boolean;
  showHiddenDocuments: boolean;
  query: string;
};

export type FlowboardProjectViewController = {
  state: FlowboardProjectUiState;
  connected: boolean;
  requestUpdate: () => void;
  refresh: () => void;
  selectProject: (id: string) => void;
  setScreen: (screen: FlowboardProjectUiState["screen"]) => void;
  openModal: (modal: FlowboardProjectModal) => void;
  closeModal: () => void;
  createProject: (data: Record<string, string>) => void;
  updateProject: (data: Record<string, string>) => void;
  archiveProject: (archived: boolean) => void;
  createCard: (data: Record<string, string>) => void;
  updateCardStatus: (id: string, status: FlowboardStatus) => void;
  archiveCard: (id: string, archived: boolean) => void;
  moveCardMilestone: (id: string, milestoneId?: string, position?: number) => void;
  moveCardProject: (id: string, boardId: string, milestoneId: string) => void;
  selectMoveCardProjectTarget: (cardId: string, boardId: string) => void;
  reorderProjects: (ids: string[]) => void;
  reorderMilestones: (ids: string[]) => void;
  reorderDocuments: (ids: string[]) => void;
  saveMilestone: (data: Record<string, string>) => void;
  completeMilestone: (id: string) => void;
  archiveMilestone: (id: string, archived: boolean) => void;
  saveDocument: (data: Record<string, string>) => void;
  hideDocument: (id: string, hidden: boolean) => void;
  deleteDocument: (id: string) => void;
};

export function createFlowboardProjectUiState(): FlowboardProjectUiState {
  return {
    loading: false,
    loaded: false,
    busy: false,
    error: null,
    projects: [],
    project: null,
    documents: [],
    selectedProjectId: null,
    screen: "overview",
    modal: null,
    draggedCardId: null,
    showArchivedProjects: false,
    showHiddenDocuments: false,
    query: "",
  };
}

function boardName(board: Pick<FlowboardBoardSummary | FlowboardBoardMetadata, "id" | "name">): string {
  return board.name || board.id;
}

function boardId(card: FlowboardCard): string {
  return card.metadata?.automation?.boardId ?? "default";
}

function isArchivedCard(card: FlowboardCard): boolean {
  return Boolean(card.metadata?.archivedAt);
}

function milestoneLabel(milestone: FlowboardMilestone): string {
  const key =
    milestone.state === "active"
      ? "flowboardProject.active"
      : milestone.state === "completed"
        ? "flowboardProject.completed"
        : "flowboardProject.archived";
  return t(key);
}

function sectionLabel(section: FlowboardProjectDocumentSection): string {
  return t(
    `flowboardProject.section${section[0]?.toUpperCase() ?? ""}${section.slice(1)}`,
  );
}

function documentTypeLabel(type: FlowboardProjectDocumentType): string {
  const key =
    type === "secret_ref"
      ? "SecretRef"
      : `${type[0]?.toUpperCase() ?? ""}${type.slice(1)}`;
  return t(`flowboardProject.type${key}`);
}

function projectCardCount(project: FlowboardBoardSummary): number {
  return project.active;
}

function readForm(event: SubmitEvent): Record<string, string> {
  const form = event.currentTarget as HTMLFormElement;
  return Object.fromEntries(
    [...new FormData(form).entries()].map(([key, value]) => [key, String(value)]),
  );
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

function renderStatusOptions(selected: FlowboardStatus) {
  return STATUSES.map(
    (status) =>
      html`<option value=${status} ?selected=${status === selected}>${t(`workboard.status.${status}`)}</option>`,
  );
}

function renderPriorityOptions(selected: FlowboardPriority) {
  return PRIORITIES.map(
    (priority) =>
      html`<option value=${priority} ?selected=${priority === selected}>${priority}</option>`,
  );
}

function renderOrderControls(params: {
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return html`
    <div class="flowboard-project__order-actions">
      <button
        class="flowboard-project__icon-button flowboard-project__order-button"
        type="button"
        title=${t("flowboardProject.moveUp")}
        aria-label=${t("flowboardProject.moveUp")}
        ?disabled=${!params.canMoveUp}
        @click=${params.onMoveUp}
      >&#8593;</button>
      <button
        class="flowboard-project__icon-button flowboard-project__order-button"
        type="button"
        title=${t("flowboardProject.moveDown")}
        aria-label=${t("flowboardProject.moveDown")}
        ?disabled=${!params.canMoveDown}
        @click=${params.onMoveDown}
      >&#8595;</button>
    </div>
  `;
}

function renderProjectList(controller: FlowboardProjectViewController) {
  const { state } = controller;
  const query = state.query.trim().toLocaleLowerCase();
  const projects = state.projects.filter((project) => {
    if (!state.showArchivedProjects && project.archivedAt) {
      return false;
    }
    return !query || `${project.name ?? ""} ${project.id}`.toLocaleLowerCase().includes(query);
  });
  return html`
    <aside class="flowboard-project__sidebar">
      <button
        class="flowboard-project__nav-item ${state.screen === "overview" ? "is-active" : ""}"
        type="button"
        @click=${() => controller.setScreen("overview")}
      >
        <span>${t("flowboardProject.allProjects")}</span>
        <strong>${projects.length}</strong>
      </button>
      <label class="flowboard-project__search">
        <span class="flowboard-project__sr-only">${t("flowboardProject.searchProjects")}</span>
        <input
          type="search"
          placeholder=${t("flowboardProject.searchProjects")}
          .value=${state.query}
          @input=${(event: InputEvent) => {
            state.query = (event.currentTarget as HTMLInputElement).value;
            controller.requestUpdate();
          }}
        />
      </label>
      <label class="flowboard-project__checkbox">
        <input
          type="checkbox"
          .checked=${state.showArchivedProjects}
          @change=${(event: Event) => {
            state.showArchivedProjects = (event.currentTarget as HTMLInputElement).checked;
            controller.requestUpdate();
          }}
        />
        ${t("flowboardProject.includeArchived")}
      </label>
      <div class="flowboard-project__project-list" role="list">
        ${projects.length
          ? projects.map(
              (project) => {
                const moveUp = reorderVisibleItemIds(state.projects, projects, project.id, -1);
                const moveDown = reorderVisibleItemIds(state.projects, projects, project.id, 1);
                return html`
                  <div class="flowboard-project__project-row" role="listitem">
                    <button
                      class="flowboard-project__nav-project ${state.selectedProjectId === project.id
                        ? "is-selected"
                        : ""}"
                      type="button"
                      @click=${() => controller.selectProject(project.id)}
                    >
                      <span class="flowboard-project__project-color" style=${project.color ? `--project-color:${project.color}` : ""}></span>
                      <span class="flowboard-project__nav-project-name">${boardName(project)}</span>
                      ${project.archivedAt
                        ? html`<small>${t("flowboardProject.archived")}</small>`
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
          : html`<p class="flowboard-project__empty-side">${t("flowboardProject.emptyProject")}</p>`}
      </div>
    </aside>
  `;
}

function renderOverview(controller: FlowboardProjectViewController) {
  const { state } = controller;
  const projects = state.projects.filter(
    (project) => state.showArchivedProjects || !project.archivedAt,
  );
  return html`
    <section class="flowboard-project__overview" aria-label=${t("flowboardProject.overview")}>
      <div class="flowboard-project__section-heading">
        <div>
          <h1>${t("flowboardProject.allProjects")}</h1>
          <p>${t("flowboardProject.title")}</p>
        </div>
        <button class="btn btn--primary" type="button" @click=${() => controller.openModal({ kind: "project" })}>
          ${t("flowboardProject.newProject")}
        </button>
      </div>
      ${projects.length
        ? html`
            <div class="flowboard-project__overview-grid">
              ${projects.map(
                (project) => html`
                  <article
                    class="flowboard-project__overview-item ${project.archivedAt ? "is-archived" : ""}"
                    @click=${() => controller.selectProject(project.id)}
                  >
                    <div class="flowboard-project__overview-item-top">
                      <span class="flowboard-project__project-color" style=${project.color ? `--project-color:${project.color}` : ""}></span>
                      <span class="flowboard-project__overview-item-id">${project.id}</span>
                      ${project.archivedAt
                        ? html`<span class="flowboard-project__badge">${t("flowboardProject.archived")}</span>`
                        : nothing}
                    </div>
                    <h2>${boardName(project)}</h2>
                    <p>${project.currentObjective || project.description || "\u00a0"}</p>
                    <footer>
                      <span>${t("flowboardProject.cards", { count: String(project.active) })}</span>
                      <span>${project.version || ""}</span>
                    </footer>
                  </article>
                `,
              )}
            </div>
          `
        : html`
            <div class="flowboard-project__blank">
              <p>${t("flowboardProject.emptyOverview")}</p>
              <button class="btn btn--primary" type="button" @click=${() => controller.openModal({ kind: "project" })}>
                ${t("flowboardProject.newProject")}
              </button>
            </div>
          `}
    </section>
  `;
}

function renderCard(
  controller: FlowboardProjectViewController,
  card: FlowboardCard,
  milestoneId: string | undefined,
  cards: readonly FlowboardCard[],
) {
  const { state } = controller;
  const project = state.project;
  if (!project) {
    return nothing;
  }
  const archived = isArchivedCard(card);
  const isProjectArchived = Boolean(project.board.archivedAt);
  const cardIndex = cards.findIndex((candidate) => candidate.id === card.id);
  const previousCard = cards[cardIndex - 1];
  const nextCard = cards[cardIndex + 1];
  return html`
    <article
      class="flowboard-project__card ${archived ? "is-archived" : ""}"
      draggable=${!isProjectArchived}
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
        if (id && id !== card.id) {
          controller.moveCardMilestone(id, milestoneId, Math.max(0, card.position - 1));
        }
      }}
    >
      <button
        class="flowboard-project__card-main"
        type="button"
        @click=${() => controller.openModal({ kind: "card-detail", cardId: card.id })}
      >
        <span class="flowboard-project__priority priority-${card.priority}"></span>
        <span class="flowboard-project__card-title">${card.title}</span>
        ${card.notes ? html`<span class="flowboard-project__card-notes">${card.notes}</span>` : nothing}
      </button>
      <div class="flowboard-project__card-footer">
        <select
          class="flowboard-project__compact-select"
          aria-label=${t("flowboardProject.status")}
          .value=${card.status}
          @change=${(event: Event) =>
            controller.updateCardStatus(
              card.id,
              (event.currentTarget as HTMLSelectElement).value as FlowboardStatus,
            )}
        >
          ${renderStatusOptions(card.status)}
        </select>
        <select
          class="flowboard-project__compact-select flowboard-project__move-card"
          aria-label=${t("flowboardProject.moveTo")}
          ?disabled=${isProjectArchived}
          .value=${card.milestoneId ?? ""}
          @change=${(event: Event) =>
            controller.moveCardMilestone(
              card.id,
              (event.currentTarget as HTMLSelectElement).value || undefined,
            )}
        >
          <option value="">${t("flowboardProject.unassigned")}</option>
          ${project.milestones
            .filter((milestone) => milestone.state === "active")
            .map(
              (milestone) => html`
                <option value=${milestone.id}>${milestone.title}</option>
              `,
            )}
        </select>
        ${renderOrderControls({
          canMoveUp: !archived && !isProjectArchived && Boolean(previousCard),
          canMoveDown: !archived && !isProjectArchived && Boolean(nextCard),
          onMoveUp: () =>
            previousCard &&
            controller.moveCardMilestone(
              card.id,
              milestoneId,
              Math.max(0, previousCard.position - 1),
            ),
          onMoveDown: () =>
            nextCard &&
            controller.moveCardMilestone(card.id, milestoneId, nextCard.position + 1),
        })}
      </div>
      ${archived ? html`<span class="flowboard-project__card-archived">${t("flowboardProject.archived")}</span>` : nothing}
    </article>
  `;
}

function renderColumn(
  controller: FlowboardProjectViewController,
  params: {
    id?: string;
    title: string;
    subtitle?: string;
    state?: FlowboardMilestone["state"];
    cards: FlowboardCard[];
    milestone?: FlowboardMilestone;
  },
) {
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
      class="flowboard-project__column ${params.state ? `is-${params.state}` : "is-unassigned"}"
      @dragover=${(event: DragEvent) => event.preventDefault()}
      @drop=${(event: DragEvent) => {
        event.preventDefault();
        const id = event.dataTransfer?.getData("text/plain") || state.draggedCardId;
        if (id) {
          controller.moveCardMilestone(id, params.id);
        }
      }}
    >
      <header class="flowboard-project__column-header">
        <div>
          <h2>${params.title}</h2>
          <span>${params.subtitle || t("flowboardProject.cards", { count: String(params.cards.length) })}</span>
        </div>
        <div class="flowboard-project__column-actions">
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
                  class="flowboard-project__icon-button"
                  type="button"
                  title=${t("flowboardProject.editMilestone")}
                  @click=${() => controller.openModal({ kind: "milestone", milestone })}
                >...</button>
                ${milestone.state === "active"
                  ? html`
                      <button
                        class="flowboard-project__icon-button"
                        type="button"
                        title=${t("flowboardProject.completeMilestone")}
                        @click=${() => controller.completeMilestone(milestone.id)}
                      >&#10003;</button>
                      <button
                        class="flowboard-project__icon-button"
                        type="button"
                        title=${t("flowboardProject.archiveMilestone")}
                        @click=${() => controller.archiveMilestone(milestone.id, true)}
                      >&#8942;</button>
                    `
                  : html`
                      <button
                        class="flowboard-project__icon-button"
                        type="button"
                        title=${t("flowboardProject.restoreMilestone")}
                        @click=${() => controller.archiveMilestone(milestone.id, false)}
                      >&#8635;</button>
                    `}
              `
            : nothing}
          <button
            class="flowboard-project__icon-button"
            type="button"
            title=${t("flowboardProject.newCard")}
            ?disabled=${projectArchived || (milestone && milestone.state !== "active")}
            @click=${() => controller.openModal({ kind: "card", ...(params.id ? { milestoneId: params.id } : {}) })}
          >+</button>
        </div>
      </header>
      <div class="flowboard-project__card-list">
        ${params.cards.length
          ? params.cards.map((card) => renderCard(controller, card, params.id, params.cards))
          : html`<p class="flowboard-project__empty-column">${t("flowboardProject.emptyColumn")}</p>`}
      </div>
    </section>
  `;
}

function renderBoard(controller: FlowboardProjectViewController) {
  const { state } = controller;
  const project = state.project;
  if (!project) {
    return nothing;
  }
  const cards = project.cards.filter((card) => !isArchivedCard(card));
  const byMilestone = new Map<string | undefined, FlowboardCard[]>();
  for (const card of cards) {
    const key = card.milestoneId;
    const current = byMilestone.get(key) ?? [];
    current.push(card);
    byMilestone.set(key, current);
  }
  for (const columnCards of byMilestone.values()) {
    columnCards.sort((left, right) => left.position - right.position || left.createdAt - right.createdAt);
  }
  return html`
    <section class="flowboard-project__board">
      <div class="flowboard-project__section-heading">
        <div>
          <h1>${boardName(project.board)}</h1>
          <p>${project.board.currentObjective || project.board.description || project.board.id}</p>
        </div>
        <div class="flowboard-project__heading-actions">
          ${project.board.archivedAt
            ? html`
                <button class="btn" type="button" @click=${() => controller.archiveProject(false)}>
                  ${t("flowboardProject.restoreProject")}
                </button>
              `
            : html`
                <button class="btn" type="button" @click=${() => controller.openModal({ kind: "milestone" })}>
                  ${t("flowboardProject.newMilestone")}
                </button>
                <button class="btn btn--primary" type="button" @click=${() => controller.openModal({ kind: "card" })}>
                  ${t("flowboardProject.newCard")}
                </button>
              `}
        </div>
      </div>
      ${project.board.archivedAt
        ? html`<div class="callout">${t("flowboardProject.projectArchived")}</div>`
        : nothing}
      <div class="flowboard-project__kanban" aria-label=${t("flowboardProject.board")}>
        ${renderColumn(controller, {
          title: t("flowboardProject.unassigned"),
          subtitle: t("flowboardProject.unassignedHelp"),
          cards: byMilestone.get(undefined) ?? [],
        })}
        ${project.milestones.map((milestone) =>
          renderColumn(controller, {
            id: milestone.id,
            title: milestone.title,
            subtitle: milestoneLabel(milestone),
            state: milestone.state,
            cards: byMilestone.get(milestone.id) ?? [],
            milestone,
          }),
        )}
      </div>
    </section>
  `;
}

function renderSettings(controller: FlowboardProjectViewController) {
  const project = controller.state.project;
  if (!project) {
    return nothing;
  }
  const workspacePath = project.board.defaultWorkspace?.path ?? "";
  return html`
    <section class="flowboard-project__settings">
      <div class="flowboard-project__section-heading">
        <div>
          <h1>${t("flowboardProject.projectSettings")}</h1>
          <p>${project.board.id}</p>
        </div>
        ${project.board.archivedAt
          ? html`
              <button class="btn" type="button" @click=${() => controller.archiveProject(false)}>
                ${t("flowboardProject.restoreProject")}
              </button>
            `
          : html`
              <button class="btn btn--danger" type="button" @click=${() => controller.archiveProject(true)}>
                ${t("flowboardProject.archiveProject")}
              </button>
            `}
      </div>
      <form
        class="flowboard-project__settings-form"
        @submit=${(event: SubmitEvent) => {
          event.preventDefault();
          controller.updateProject(readForm(event));
        }}
      >
        <label>
          ${t("flowboardProject.projectName")}
          <input name="name" required .value=${project.board.name ?? ""} />
        </label>
        <label>
          ${t("flowboardProject.version")}
          <input name="version" .value=${project.board.version ?? ""} />
        </label>
        <label class="flowboard-project__wide-field">
          ${t("flowboardProject.currentObjective")}
          <textarea name="currentObjective" .value=${project.board.currentObjective ?? ""}></textarea>
        </label>
        <label class="flowboard-project__wide-field">
          ${t("flowboardProject.coreValue")}
          <textarea name="coreValue" .value=${project.board.coreValue ?? ""}></textarea>
        </label>
        <label>
          ${t("flowboardProject.sourceOfTruth")}
          <input name="sourceOfTruth" type="url" .value=${project.board.sourceOfTruth ?? ""} />
        </label>
        <label>
          ${t("flowboardProject.repositoryUrl")}
          <input name="repositoryUrl" type="url" .value=${project.board.repositoryUrl ?? ""} />
        </label>
        <label>
          ${t("flowboardProject.planningPath")}
          <input name="planningPath" .value=${project.board.planningPath ?? ""} />
        </label>
        <label>
          ${t("flowboardProject.homepageUrl")}
          <input name="homepageUrl" type="url" .value=${project.board.homepageUrl ?? ""} />
        </label>
        <label class="flowboard-project__wide-field">
          ${t("flowboardProject.defaultWorkspace")}
          <input name="workspacePath" .value=${workspacePath} />
          <small>${t("flowboardProject.defaultWorkspaceHelp")}</small>
        </label>
        <div class="flowboard-project__form-actions">
          <button class="btn btn--primary" type="submit" ?disabled=${controller.state.busy}>
            ${t("flowboardProject.updateProject")}
          </button>
        </div>
      </form>
    </section>
  `;
}

function renderDocumentSection(
  controller: FlowboardProjectViewController,
  section: FlowboardProjectDocumentSection,
) {
  const sectionDocuments = controller.state.documents.filter(
    (document) => document.section === section,
  );
  const documents = sectionDocuments.filter(
    (document) => controller.state.showHiddenDocuments || !document.hiddenAt,
  );
  return html`
    <section class="flowboard-project__document-section">
      <h2>${sectionLabel(section)}</h2>
      ${documents.length
        ? html`
            <div class="flowboard-project__document-list">
              ${documents.map((document) => {
                const moveUp = reorderVisibleItemIds(sectionDocuments, documents, document.id, -1);
                const moveDown = reorderVisibleItemIds(sectionDocuments, documents, document.id, 1);
                return html`
                  <article class="flowboard-project__document ${document.hiddenAt ? "is-hidden" : ""}">
                    <button
                      class="flowboard-project__document-main"
                      type="button"
                      @click=${() => controller.openModal({ kind: "document", document })}
                    >
                      <span>${document.title}</span>
                      <small>${document.key} · ${documentTypeLabel(document.type)}</small>
                      ${document.summary ? html`<p>${document.summary}</p>` : nothing}
                    </button>
                    <div class="flowboard-project__document-actions">
                      ${renderOrderControls({
                        canMoveUp: Boolean(moveUp),
                        canMoveDown: Boolean(moveDown),
                        onMoveUp: () => moveUp && controller.reorderDocuments(moveUp),
                        onMoveDown: () => moveDown && controller.reorderDocuments(moveDown),
                      })}
                      <button
                        class="flowboard-project__icon-button"
                        type="button"
                        title=${document.hiddenAt ? t("flowboardProject.restoreDocument") : t("flowboardProject.hideDocument")}
                        @click=${() => controller.hideDocument(document.id, !document.hiddenAt)}
                      >${document.hiddenAt ? "&#8635;" : "&#8211;"}</button>
                      ${!document.system
                        ? html`
                            <button
                              class="flowboard-project__icon-button"
                              type="button"
                              title=${t("flowboardProject.deleteDocument")}
                              @click=${() => controller.deleteDocument(document.id)}
                            >&times;</button>
                          `
                        : nothing}
                    </div>
                  </article>
                `;
              })}
            </div>
          `
        : html`<p class="flowboard-project__empty-column">${t("flowboardProject.noDocuments")}</p>`}
    </section>
  `;
}

function renderDocuments(controller: FlowboardProjectViewController) {
  const { state } = controller;
  const project = state.project;
  if (!project) {
    return nothing;
  }
  return html`
    <section class="flowboard-project__documents">
      <div class="flowboard-project__section-heading">
        <div>
          <h1>${t("flowboardProject.documentLibrary")}</h1>
          <p>${boardName(project.board)}</p>
        </div>
        <div class="flowboard-project__heading-actions">
          <label class="flowboard-project__checkbox">
            <input
              type="checkbox"
              .checked=${state.showHiddenDocuments}
              @change=${(event: Event) => {
                state.showHiddenDocuments = (event.currentTarget as HTMLInputElement).checked;
                controller.refresh();
              }}
            />
            ${t("flowboardProject.showHidden")}
          </label>
          <button class="btn btn--primary" type="button" @click=${() => controller.openModal({ kind: "document" })}>
            ${t("flowboardProject.addDocument")}
          </button>
        </div>
      </div>
      ${DOCUMENT_SECTIONS.map((section) => renderDocumentSection(controller, section))}
    </section>
  `;
}

function renderCardDetail(controller: FlowboardProjectViewController, card: FlowboardCard) {
  const project = controller.state.project;
  if (!project) {
    return nothing;
  }
  const otherProjects = controller.state.projects.filter(
    (candidate) => candidate.id !== boardId(card) && !candidate.archivedAt,
  );
  return html`
    <div class="flowboard-project__modal-panel flowboard-project__detail-panel">
      <header>
        <div>
          <small>${boardName(project.board)}</small>
          <h2>${t("flowboardProject.details")}</h2>
        </div>
        <button class="flowboard-project__icon-button" type="button" @click=${controller.closeModal}>&times;</button>
      </header>
      <div class="flowboard-project__detail-body">
        <h3>${card.title}</h3>
        ${card.notes ? html`<p class="flowboard-project__detail-notes">${card.notes}</p>` : nothing}
        <dl>
          <div><dt>${t("flowboardProject.status")}</dt><dd>${t(`workboard.status.${card.status}`)}</dd></div>
          <div><dt>${t("flowboardProject.priority")}</dt><dd>${card.priority}</dd></div>
          <div><dt>${t("flowboardProject.assignee")}</dt><dd>${card.agentId || t("flowboardProject.unassigned")}</dd></div>
          <div><dt>${t("flowboardProject.viewProject")}</dt><dd>${boardId(card)}</dd></div>
        </dl>
        <label>
          ${t("flowboardProject.status")}
          <select
            .value=${card.status}
            @change=${(event: Event) =>
              controller.updateCardStatus(
                card.id,
                (event.currentTarget as HTMLSelectElement).value as FlowboardStatus,
              )}
          >
            ${renderStatusOptions(card.status)}
          </select>
        </label>
        <label>
          ${t("flowboardProject.moveTo")}
          <select
            .value=${card.milestoneId ?? ""}
            ?disabled=${Boolean(project.board.archivedAt)}
            @change=${(event: Event) =>
              controller.moveCardMilestone(
                card.id,
                (event.currentTarget as HTMLSelectElement).value || undefined,
              )}
          >
            <option value="">${t("flowboardProject.unassigned")}</option>
            ${project.milestones
              .filter((milestone) => milestone.state === "active")
              .map(
                (milestone) =>
                  html`<option value=${milestone.id}>${milestone.title}</option>`,
              )}
          </select>
        </label>
        ${otherProjects.length
          ? html`
              <button
                class="btn"
                type="button"
                ?disabled=${Boolean(project.board.archivedAt)}
                @click=${() => controller.openModal({ kind: "move-project", cardId: card.id })}
              >
                ${t("flowboardProject.moveToProject")}
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
          ${t("flowboardProject.viewProject")}
        </button>
        <button
          class="btn"
          type="button"
          @click=${() => controller.archiveCard(card.id, !isArchivedCard(card))}
        >
          ${isArchivedCard(card) ? t("flowboardProject.restoreCard") : t("flowboardProject.archiveCard")}
        </button>
        <button class="btn btn--primary" type="button" @click=${controller.closeModal}>
          ${t("flowboardProject.close")}
        </button>
      </footer>
    </div>
  `;
}

function renderMoveProjectModal(
  controller: FlowboardProjectViewController,
  modal: Extract<FlowboardProjectModal, { kind: "move-project" }>,
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
      class="flowboard-project__modal-panel"
      @submit=${(event: SubmitEvent) => {
        event.preventDefault();
        if (modal.boardId && modal.milestoneId) {
          controller.moveCardProject(card.id, modal.boardId, modal.milestoneId);
        }
      }}
    >
      <header><h2>${t("flowboardProject.moveToProject")}</h2></header>
      <p class="flowboard-project__move-card-title">${card.title}</p>
      <label>
        ${t("flowboardProject.moveToProject")}
        <select
          .value=${modal.boardId ?? ""}
          ?disabled=${controller.state.busy}
          @change=${(event: Event) =>
            controller.selectMoveCardProjectTarget(
              card.id,
              (event.currentTarget as HTMLSelectElement).value,
            )}
        >
          <option value="">${t("flowboardProject.selectTargetProject")}</option>
          ${otherProjects.map(
            (candidate) => html`<option value=${candidate.id}>${boardName(candidate)}</option>`,
          )}
        </select>
      </label>
      <label>
        ${t("flowboardProject.targetMilestone")}
        <select
          .value=${modal.milestoneId ?? ""}
          ?disabled=${controller.state.busy || !modal.targetProject || activeMilestones.length === 0}
          @change=${(event: Event) =>
            controller.openModal({
              ...modal,
              milestoneId: (event.currentTarget as HTMLSelectElement).value || undefined,
            })}
        >
          <option value="">${t("flowboardProject.selectTargetMilestone")}</option>
          ${activeMilestones.map(
            (milestone) => html`<option value=${milestone.id}>${milestone.title}</option>`,
          )}
        </select>
      </label>
      ${modal.targetProject && activeMilestones.length === 0
        ? html`<p class="flowboard-project__empty-column">${t("flowboardProject.noActiveMilestones")}</p>`
        : nothing}
      <footer>
        <button class="btn" type="button" @click=${controller.closeModal}>${t("common.cancel")}</button>
        <button class="btn btn--primary" type="submit" ?disabled=${!canMove}>
          ${t("flowboardProject.moveCard")}
        </button>
      </footer>
    </form>
  `;
}

function renderModal(controller: FlowboardProjectViewController) {
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
          class="flowboard-project__modal-panel"
          @submit=${(event: SubmitEvent) => {
            event.preventDefault();
            controller.createProject(readForm(event));
          }}
        >
          <header><h2>${t("flowboardProject.newProject")}</h2></header>
          <label>${t("flowboardProject.projectId")}<input name="id" required pattern="[a-z0-9][a-z0-9._-]{0,79}" /></label>
          <label>${t("flowboardProject.projectName")}<input name="name" required /></label>
          <label>${t("flowboardProject.firstMilestone")}<input name="initialMilestoneTitle" required /></label>
          <footer>
            <button class="btn" type="button" @click=${controller.closeModal}>${t("common.cancel")}</button>
            <button class="btn btn--primary" type="submit" ?disabled=${controller.state.busy}>${t("flowboardProject.createProject")}</button>
          </footer>
        </form>
      </openclaw-modal-dialog>
    `;
  }
  if (modal.kind === "card") {
    if (!project) {
      return nothing;
    }
    return html`
      <openclaw-modal-dialog @click=${closeOnBackdrop} @modal-cancel=${controller.closeModal}>
        <form
          class="flowboard-project__modal-panel"
          @submit=${(event: SubmitEvent) => {
            event.preventDefault();
            controller.createCard(readForm(event));
          }}
        >
          <header><h2>${t("flowboardProject.newCard")}</h2></header>
          <input type="hidden" name="milestoneId" value=${modal.milestoneId ?? ""} />
          <label>${t("flowboardProject.cardTitle")}<input name="title" required /></label>
          <label>${t("flowboardProject.cardNotes")}<textarea name="notes"></textarea></label>
          <div class="flowboard-project__modal-grid">
            <label>${t("flowboardProject.status")}<select name="status">${renderStatusOptions("todo")}</select></label>
            <label>${t("flowboardProject.priority")}<select name="priority">${renderPriorityOptions("normal")}</select></label>
            <label>${t("flowboardProject.assignee")}<input name="agentId" /></label>
          </div>
          <footer>
            <button class="btn" type="button" @click=${controller.closeModal}>${t("common.cancel")}</button>
            <button class="btn btn--primary" type="submit" ?disabled=${controller.state.busy}>${t("flowboardProject.createCard")}</button>
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
          class="flowboard-project__modal-panel"
          @submit=${(event: SubmitEvent) => {
            event.preventDefault();
            controller.saveMilestone(readForm(event));
          }}
        >
          <header><h2>${milestone ? t("flowboardProject.editMilestone") : t("flowboardProject.newMilestone")}</h2></header>
          <input type="hidden" name="id" value=${milestone?.id ?? ""} />
          <label>${t("flowboardProject.milestoneName")}<input name="title" required .value=${milestone?.title ?? ""} /></label>
          <label>${t("flowboardProject.milestoneDescription")}<textarea name="description" .value=${milestone?.description ?? ""}></textarea></label>
          <label>Color<input name="color" .value=${milestone?.color ?? ""} /></label>
          <footer>
            <button class="btn" type="button" @click=${controller.closeModal}>${t("common.cancel")}</button>
            <button class="btn btn--primary" type="submit" ?disabled=${controller.state.busy}>
              ${milestone ? t("common.save") : t("flowboardProject.createMilestone")}
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
        class="flowboard-project__modal-panel flowboard-project__document-form"
        @submit=${(event: SubmitEvent) => {
          event.preventDefault();
          controller.saveDocument(readForm(event));
        }}
      >
        <header><h2>${document ? t("flowboardProject.editDocument") : t("flowboardProject.addDocument")}</h2></header>
        <input type="hidden" name="id" value=${document?.id ?? ""} />
        ${document
          ? nothing
          : html`<label>${t("flowboardProject.documentKey")}<input name="key" required pattern="[a-z0-9][a-z0-9._-]{0,79}" /></label>`}
        <label>${t("flowboardProject.documentTitle")}<input name="title" required .value=${document?.title ?? ""} /></label>
        <div class="flowboard-project__modal-grid">
          <label>
            ${t("flowboardProject.documentSection")}
            <select name="section" ?disabled=${Boolean(document)}>
              ${DOCUMENT_SECTIONS.map(
                (section) =>
                  html`<option value=${section} ?selected=${section === (document?.section ?? "project")}>${sectionLabel(section)}</option>`,
              )}
            </select>
          </label>
          <label>
            ${t("flowboardProject.documentType")}
            <select name="type">
              ${DOCUMENT_TYPES.map(
                (type) =>
                  html`<option value=${type} ?selected=${type === (document?.type ?? "markdown")}>${documentTypeLabel(type)}</option>`,
              )}
            </select>
          </label>
        </div>
        <label>${t("flowboardProject.documentSummary")}<input name="summary" .value=${document?.summary ?? ""} /></label>
        <label>${t("flowboardProject.documentTarget")}<input name="target" .value=${document?.target ?? ""} /></label>
        <label>${t("flowboardProject.documentContent")}<textarea name="content" .value=${document?.content ?? ""}></textarea></label>
        <footer>
          <button class="btn" type="button" @click=${controller.closeModal}>${t("common.cancel")}</button>
          <button class="btn btn--primary" type="submit" ?disabled=${controller.state.busy}>${t("flowboardProject.saveDocument")}</button>
        </footer>
      </form>
    </openclaw-modal-dialog>
  `;
}

function renderProjectTabs(controller: FlowboardProjectViewController): TemplateResult {
  const { state } = controller;
  const tabs: Array<[FlowboardProjectUiState["screen"], string]> = [
    ["board", "flowboardProject.board"],
    ["settings", "flowboardProject.settings"],
    ["documents", "flowboardProject.documents"],
  ];
  return html`
    <nav class="flowboard-project__tabs" aria-label=${t("flowboardProject.title")}>
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

export function renderFlowboardProjects(controller: FlowboardProjectViewController): TemplateResult {
  const { state } = controller;
  const projectView =
    state.screen === "overview"
      ? renderOverview(controller)
      : !state.project
        ? html`<section class="flowboard-project__blank"><p>${t("flowboardProject.emptyProject")}</p></section>`
        : state.screen === "board"
          ? renderBoard(controller)
          : state.screen === "settings"
            ? renderSettings(controller)
            : renderDocuments(controller);
  return html`
    <section class="flowboard-project">
      <div class="flowboard-project__topbar">
        <div class="flowboard-project__brand">
          <strong>flowboard</strong>
          <span>${t("flowboardProject.title")}</span>
        </div>
        <div class="flowboard-project__topbar-actions">
          ${state.loading ? html`<span class="flowboard-project__refreshing">${t("flowboardProject.loading")}</span>` : nothing}
          <button class="flowboard-project__refresh" type="button" title=${t("flowboardProject.refresh")} @click=${controller.refresh}>
            &#8635;
          </button>
          <button class="btn btn--primary" type="button" @click=${() => controller.openModal({ kind: "project" })}>
            ${t("flowboardProject.newProject")}
          </button>
        </div>
      </div>
      ${!controller.connected
        ? html`<div class="callout">${t("flowboardProject.connectionRequired")}</div>`
        : nothing}
      ${state.error ? html`<div class="callout danger" role="alert">${state.error}</div>` : nothing}
      <div class="flowboard-project__layout">
        ${renderProjectList(controller)}
        <main class="flowboard-project__main">
          ${state.project && state.screen !== "overview" ? renderProjectTabs(controller) : nothing}
          ${projectView}
        </main>
      </div>
      ${renderModal(controller)}
    </section>
  `;
}
