import { randomUUID } from "node:crypto";
import type {
  FlowboardBoardMetadata,
  FlowboardCard,
  FlowboardMilestone,
  FlowboardProjectDocument,
  FlowboardProjectDocumentSection,
  FlowboardProjectDocumentType,
  FlowboardProjectView,
} from "../../contract/index.js";
import {
  FLOWBOARD_MILESTONE_STATES,
  FLOWBOARD_PROJECT_DOCUMENT_SECTIONS,
  FLOWBOARD_PROJECT_DOCUMENT_TYPES,
} from "../../contract/index.js";
import {
  appendEvent,
  cardBoardId,
  removeUndefinedCardFields,
} from "./store-card-helpers.js";
import { POSITION_STEP } from "./store-constants.js";
import type {
  FlowboardBoardInput,
  FlowboardCardPatch,
  FlowboardLinkedCreateInput,
  FlowboardMilestoneCreateInput,
  FlowboardMilestoneReorderInput,
  FlowboardMilestoneUpdateInput,
  FlowboardMoveMilestoneInput,
  FlowboardMoveProjectInput,
  FlowboardMutationScope,
  FlowboardProjectCreateInput,
  FlowboardProjectDocumentCreateInput,
  FlowboardProjectDocumentReorderInput,
  FlowboardProjectDocumentUpdateInput,
} from "./store-inputs.js";
import {
  normalizeBoardId,
  normalizeBoardIdRequired,
  normalizeBoardMetadata,
  normalizeBoundedString,
  normalizeExternalUrl,
  normalizeOptionalString,
  normalizePosition,
  normalizeTitle,
} from "./store-normalizers.js";
import { FlowboardNotificationStore } from "./store-notifications.js";
import {
  discoverFlowboardProjectDocuments,
  isFlowboardProjectDocumentDiscoveryPath,
  resolveFlowboardProjectDocumentWorkspacePath,
} from "./project-document-discovery.js";

const RESERVED_AUTOMATIC_DOCUMENT_KEY_PREFIXES = ["file.", "ai."] as const;

function presentProjectDocument(document: FlowboardProjectDocument): FlowboardProjectDocument {
  const next: FlowboardProjectDocument = {
    ...document,
    source: document.source ?? "project",
  };
  delete next.system;
  return next;
}

function isDocumentSection(value: unknown): value is FlowboardProjectDocumentSection {
  return (
    typeof value === "string" &&
    (FLOWBOARD_PROJECT_DOCUMENT_SECTIONS as readonly string[]).includes(value)
  );
}

function isDocumentType(value: unknown): value is FlowboardProjectDocumentType {
  return (
    typeof value === "string" &&
    (FLOWBOARD_PROJECT_DOCUMENT_TYPES as readonly string[]).includes(value)
  );
}

function normalizeDocumentKey(value: unknown, fallback?: string): string {
  const key = normalizeBoundedString(value, fallback, 80, "document key");
  if (!key || !/^[a-z0-9][a-z0-9._-]{0,79}$/.test(key)) {
    throw new Error("document key must match [a-z0-9][a-z0-9._-]{0,79}.");
  }
  return key;
}

function hasReservedAutomaticDocumentKeyPrefix(key: string): boolean {
  return RESERVED_AUTOMATIC_DOCUMENT_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function isAutomaticProjectDocument(document: FlowboardProjectDocument): boolean {
  return document.system === true || hasReservedAutomaticDocumentKeyPrefix(document.key);
}

function normalizeDocumentSection(
  value: unknown,
  fallback?: FlowboardProjectDocumentSection,
): FlowboardProjectDocumentSection {
  if (value === undefined) {
    if (fallback) {
      return fallback;
    }
    throw new Error(`document section must be one of: ${FLOWBOARD_PROJECT_DOCUMENT_SECTIONS.join(", ")}.`);
  }
  if (!isDocumentSection(value)) {
    throw new Error(`document section must be one of: ${FLOWBOARD_PROJECT_DOCUMENT_SECTIONS.join(", ")}.`);
  }
  return value;
}

function normalizeDocumentType(
  value: unknown,
  fallback?: FlowboardProjectDocumentType,
): FlowboardProjectDocumentType {
  if (value === undefined) {
    if (fallback) {
      return fallback;
    }
    throw new Error(`document type must be one of: ${FLOWBOARD_PROJECT_DOCUMENT_TYPES.join(", ")}.`);
  }
  if (!isDocumentType(value)) {
    throw new Error(`document type must be one of: ${FLOWBOARD_PROJECT_DOCUMENT_TYPES.join(", ")}.`);
  }
  return value;
}

function normalizeDocumentBody(
  input: Pick<FlowboardProjectDocumentCreateInput, "type" | "target" | "content">,
  type: FlowboardProjectDocumentType,
  fallback?: FlowboardProjectDocument,
): Pick<FlowboardProjectDocument, "target" | "content"> {
  const target =
    type === "link"
      ? normalizeExternalUrl(input.target, fallback?.target, "document URL")
      : type === "path" || type === "secret_ref"
        ? normalizeBoundedString(input.target, fallback?.target, 2000, "document target")
        : undefined;
  const content =
    type === "markdown" || type === "json"
      ? normalizeBoundedString(input.content, fallback?.content, 20_000, "document content")
      : undefined;
  if (
    (type === "link" || type === "path" || type === "secret_ref") &&
    !target
  ) {
    throw new Error(`${type} documents require a target.`);
  }
  if (type === "path" && (target?.includes("\0") || target?.includes("\n"))) {
    throw new Error("document path contains unsupported characters.");
  }
  if (type === "json" && content) {
    try {
      JSON.parse(content);
    } catch {
      throw new Error("document JSON must be valid.");
    }
  }
  return {
    ...(target ? { target } : {}),
    ...(content ? { content } : {}),
  };
}

function boardRunningCards(cards: FlowboardCard[]): FlowboardCard[] {
  return cards.filter(
    (card) =>
      card.status === "running" ||
      card.execution?.status === "running" ||
      card.metadata?.attempts?.some((attempt) => attempt.status === "running"),
  );
}

export class FlowboardProjectStore extends FlowboardNotificationStore {
  private async ensureBoardDirect(boardId: string, now = Date.now()): Promise<FlowboardBoardMetadata> {
    const existing = await this.boardStore.lookup(boardId);
    if (existing?.version === 1) {
      return existing.board;
    }
    const board = normalizeBoardMetadata({ id: boardId }, undefined, now);
    await this.boardStore.register(board.id, { version: 1, board });
    return board;
  }

  private async removeLegacyGeneratedProjectDocumentsDirect(
    board: FlowboardBoardMetadata,
  ): Promise<void> {
    if (
      !board.defaultWorkspace?.path ||
      (board.defaultWorkspace.kind !== "dir" && board.defaultWorkspace.kind !== "worktree")
    ) {
      return;
    }
    for (const entry of await this.documentStore.entries()) {
      const document = entry.value?.version === 1 ? entry.value.document : undefined;
      if (
        document?.boardId === board.id &&
        document.system === true &&
        document.type === "path" &&
        !hasReservedAutomaticDocumentKeyPrefix(document.key)
      ) {
        await this.documentStore.delete(entry.key);
      }
    }
  }

  private async discoverProjectDocumentsDirect(
    board: FlowboardBoardMetadata,
    now = Date.now(),
  ): Promise<void> {
    const workspacePath = board.defaultWorkspace?.path;
    if (
      !workspacePath ||
      (board.defaultWorkspace?.kind !== "dir" && board.defaultWorkspace?.kind !== "worktree")
    ) {
      return;
    }
    let workspaceRoot: string;
    let candidates: Awaited<ReturnType<typeof discoverFlowboardProjectDocuments>>;
    try {
      workspaceRoot = await resolveFlowboardProjectDocumentWorkspacePath(workspacePath);
      candidates = await discoverFlowboardProjectDocuments(workspaceRoot);
    } catch {
      // A stale optional workspace must not make the document library unavailable.
      return;
    }
    for (const entry of await this.documentStore.entries()) {
      const document = entry.value?.version === 1 ? entry.value.document : undefined;
      if (
        document?.boardId === board.id &&
        isAutomaticProjectDocument(document) &&
        !isFlowboardProjectDocumentDiscoveryPath(workspaceRoot, document.target)
      ) {
        await this.documentStore.delete(entry.key);
      }
    }
    const existing = (await this.documentStore.entries())
      .map((entry) => entry.value)
      .filter(
        (entry): entry is { version: 1; document: FlowboardProjectDocument } =>
          entry?.version === 1 && entry.document?.boardId === board.id,
      )
      .map((entry) => presentProjectDocument(entry.document));
    const existingKeys = new Set(existing.map((document) => document.key));
    const existingTargets = new Set(
      existing
        .map((document) => document.target)
        .filter((target): target is string => Boolean(target)),
    );
    const nextPositionBySection = new Map<FlowboardProjectDocumentSection, number>();
    for (const candidate of candidates) {
      if (existingKeys.has(candidate.key) || existingTargets.has(candidate.target)) {
        continue;
      }
      const position =
        (nextPositionBySection.get(candidate.section) ??
          Math.max(
            0,
            ...existing
              .filter((document) => document.section === candidate.section)
              .map((document) => document.position),
          )) + POSITION_STEP;
      nextPositionBySection.set(candidate.section, position);
      const document: FlowboardProjectDocument = {
        id: randomUUID(),
        boardId: board.id,
        key: candidate.key,
        section: candidate.section,
        source: candidate.source,
        type: "path",
        title: candidate.title,
        summary: candidate.summary,
        target: candidate.target,
        position,
        system: true,
        createdAt: now,
        updatedAt: now,
      };
      await this.documentStore.register(document.id, { version: 1, document });
      existingKeys.add(candidate.key);
      existingTargets.add(candidate.target);
    }
  }

  private async ensureProjectDirect(boardId: string, now = Date.now()): Promise<FlowboardBoardMetadata> {
    return await this.ensureBoardDirect(boardId, now);
  }

  async assertProjectCanReceiveCards(boardId: string): Promise<void> {
    const board = await this.boardStore.lookup(boardId);
    if (board?.version === 1 && board.board.archivedAt) {
      throw new Error("project is archived and cannot receive cards.");
    }
  }

  async isProjectArchived(boardId: string): Promise<boolean> {
    const board = await this.boardStore.lookup(boardId);
    return Boolean(board?.version === 1 && board.board.archivedAt);
  }

  async listProjects(params: { includeArchived?: unknown } = {}) {
    const includeArchived = params.includeArchived === true;
    const { boards } = await this.listBoards();
    return {
      projects: boards
        .filter((board) => includeArchived || !board.archivedAt)
        .toSorted(
          (left, right) =>
            (left.position ?? Number.MAX_SAFE_INTEGER) - (right.position ?? Number.MAX_SAFE_INTEGER) ||
            left.id.localeCompare(right.id),
        ),
    };
  }

  async getProject(id: unknown): Promise<FlowboardProjectView> {
    const boardId = normalizeBoardIdRequired(id);
    return await this.enqueueMutation(async () => {
      const board = await this.ensureProjectDirect(boardId);
      const milestones = await this.listMilestonesDirect(boardId);
      const cards = await this.list({ boardId });
      return { board, milestones, cards };
    });
  }

  async createProject(input: FlowboardProjectCreateInput): Promise<FlowboardProjectView> {
    return await this.enqueueMutation(async () => {
      const boardId = normalizeBoardIdRequired(input.id);
      if (await this.boardStore.lookup(boardId)) {
        throw new Error(`project already exists: ${boardId}`);
      }
      if ((await this.list({ boardId })).length > 0) {
        throw new Error(`project already exists through existing cards: ${boardId}`);
      }
      const name = normalizeTitle(input.name);
      const initialMilestoneTitle = normalizeTitle(input.initialMilestoneTitle);
      const existingBoards = await this.listBoards();
      const maxPosition = Math.max(
        0,
        ...existingBoards.boards.map((board) => board.position ?? 0),
      );
      const board = normalizeBoardMetadata(
        {
          ...input,
          id: boardId,
          name,
          position: input.position ?? maxPosition + POSITION_STEP,
        },
        undefined,
      );
      const milestone = this.createMilestoneRecord(
        boardId,
        {
          title: initialMilestoneTitle,
          description: undefined,
          color: undefined,
          position: POSITION_STEP,
        },
        Date.now(),
      );
      await this.boardStore.register(board.id, { version: 1, board });
      try {
        await this.milestoneStore.register(milestone.id, { version: 1, milestone });
      } catch (error) {
        for (const entry of await this.documentStore.entries()) {
          if (entry.value?.version === 1 && entry.value.document.boardId === boardId) {
            await this.documentStore.delete(entry.key);
          }
        }
        await this.milestoneStore.delete(milestone.id);
        await this.boardStore.delete(board.id);
        throw error;
      }
      return {
        board,
        milestones: [milestone],
        cards: [],
      };
    });
  }

  async updateProject(input: FlowboardBoardInput): Promise<FlowboardBoardMetadata> {
    return await this.enqueueMutation(async () => {
      const boardId = normalizeBoardIdRequired(input.id);
      const existing = await this.boardStore.lookup(boardId);
      if (!existing && (await this.list({ boardId })).length === 0 && boardId !== "default") {
        throw new Error(`project not found: ${boardId}`);
      }
      if (!existing) {
        await this.ensureProjectDirect(boardId);
      }
      const board = normalizeBoardMetadata({ ...input, id: boardId }, existing?.board);
      await this.boardStore.register(boardId, { version: 1, board });
      return board;
    });
  }

  async reorderProjects(ids: unknown): Promise<{ projects: FlowboardBoardMetadata[] }> {
    if (!Array.isArray(ids) || ids.length === 0 || ids.some((id) => typeof id !== "string")) {
      throw new Error("project ids are required.");
    }
    return await this.enqueueMutation(async () => {
      const seen = new Set<string>();
      const boards: FlowboardBoardMetadata[] = [];
      for (const rawId of ids) {
        const boardId = normalizeBoardIdRequired(rawId);
        if (seen.has(boardId)) {
          throw new Error("project ids must not contain duplicates.");
        }
        seen.add(boardId);
        const entry = await this.boardStore.lookup(boardId);
        if (!entry?.board) {
          throw new Error(`project not found: ${boardId}`);
        }
        boards.push(entry.board);
      }
      const now = Date.now();
      const updated = boards.map((board, index) =>
        normalizeBoardMetadata(
          { ...board, id: board.id, position: (index + 1) * POSITION_STEP },
          board,
          now,
        ),
      );
      for (const board of updated) {
        await this.boardStore.register(board.id, { version: 1, board });
      }
      return { projects: updated };
    });
  }

  async archiveProject(
    id: unknown,
    archived: unknown = true,
  ): Promise<{ board: FlowboardBoardMetadata; runningCards: FlowboardCard[] }> {
    const boardId = normalizeBoardIdRequired(id);
    return await this.enqueueMutation(async () => {
      const existing = await this.boardStore.lookup(boardId);
      const board = normalizeBoardMetadata(
        { id: boardId, archived },
        existing?.board,
      );
      await this.boardStore.register(boardId, { version: 1, board });
      return {
        board,
        runningCards: archived === false ? [] : boardRunningCards(await this.list({ boardId })),
      };
    });
  }

  async listMilestones(boardId: unknown): Promise<{ milestones: FlowboardMilestone[] }> {
    return { milestones: await this.listMilestonesDirect(normalizeBoardIdRequired(boardId)) };
  }

  private async listMilestonesDirect(boardId: string): Promise<FlowboardMilestone[]> {
    return (await this.milestoneStore.entries())
      .map((entry) => entry.value)
      .filter(
        (entry): entry is { version: 1; milestone: FlowboardMilestone } =>
          entry?.version === 1 && entry.milestone?.boardId === boardId,
      )
      .map((entry) => entry.milestone)
      .toSorted((left, right) => left.position - right.position || left.createdAt - right.createdAt);
  }

  private createMilestoneRecord(
    boardId: string,
    input: Pick<FlowboardMilestoneCreateInput, "title" | "description" | "color" | "position">,
    now: number,
  ): FlowboardMilestone {
    const title = normalizeTitle(input.title);
    const description = normalizeBoundedString(input.description, undefined, 2000, "milestone description");
    const color = normalizeBoundedString(input.color, undefined, 40, "milestone color");
    return {
      id: randomUUID(),
      boardId,
      title,
      position: normalizePosition(input.position, POSITION_STEP),
      state: "active",
      createdAt: now,
      updatedAt: now,
      ...(description ? { description } : {}),
      ...(color ? { color } : {}),
    };
  }

  async createMilestone(input: FlowboardMilestoneCreateInput): Promise<FlowboardMilestone> {
    return await this.enqueueMutation(async () => {
      const boardId = normalizeBoardIdRequired(input.boardId);
      await this.assertProjectCanReceiveCards(boardId);
      await this.ensureProjectDirect(boardId);
      const existing = await this.listMilestonesDirect(boardId);
      const position =
        input.position === undefined
          ? Math.max(0, ...existing.map((milestone) => milestone.position)) + POSITION_STEP
          : input.position;
      const milestone = this.createMilestoneRecord(boardId, { ...input, position }, Date.now());
      await this.milestoneStore.register(milestone.id, { version: 1, milestone });
      return milestone;
    });
  }

  async updateMilestone(id: string, input: FlowboardMilestoneUpdateInput): Promise<FlowboardMilestone> {
    return await this.enqueueMutation(async () => {
      const existing = await this.milestoneStore.lookup(id.trim());
      if (!existing?.milestone) {
        throw new Error(`milestone not found: ${id}`);
      }
      const milestone = existing.milestone;
      const title = input.title === undefined ? milestone.title : normalizeTitle(input.title);
      const description =
        input.description === undefined
          ? milestone.description
          : normalizeBoundedString(input.description, undefined, 2000, "milestone description");
      const color =
        input.color === undefined
          ? milestone.color
          : normalizeBoundedString(input.color, undefined, 40, "milestone color");
      const next: FlowboardMilestone = {
        ...milestone,
        title,
        updatedAt: Date.now(),
        ...(description ? { description } : {}),
        ...(color ? { color } : {}),
      };
      if (!description) {
        delete next.description;
      }
      if (!color) {
        delete next.color;
      }
      await this.milestoneStore.register(next.id, { version: 1, milestone: next });
      return next;
    });
  }

  async reorderMilestones(input: FlowboardMilestoneReorderInput): Promise<{ milestones: FlowboardMilestone[] }> {
    const boardId = normalizeBoardIdRequired(input.boardId);
    if (
      !Array.isArray(input.milestoneIds) ||
      input.milestoneIds.length === 0 ||
      input.milestoneIds.some((id) => typeof id !== "string")
    ) {
      throw new Error("milestone ids are required.");
    }
    return await this.enqueueMutation(async () => {
      const existing = await this.listMilestonesDirect(boardId);
      const ids = input.milestoneIds as string[];
      if (new Set(ids).size !== ids.length || ids.length !== existing.length) {
        throw new Error("milestone ids must contain every project milestone exactly once.");
      }
      const byId = new Map(existing.map((milestone) => [milestone.id, milestone]));
      const now = Date.now();
      const milestones = ids.map((id, index) => {
        const milestone = byId.get(id);
        if (!milestone) {
          throw new Error(`milestone does not belong to project: ${id}`);
        }
        return { ...milestone, position: (index + 1) * POSITION_STEP, updatedAt: now };
      });
      for (const milestone of milestones) {
        await this.milestoneStore.register(milestone.id, { version: 1, milestone });
      }
      return { milestones };
    });
  }

  async completeMilestone(id: string): Promise<FlowboardMilestone> {
    return await this.enqueueMutation(async () => {
      const entry = await this.milestoneStore.lookup(id.trim());
      if (!entry?.milestone) {
        throw new Error(`milestone not found: ${id}`);
      }
      const milestone = entry.milestone;
      if (milestone.state !== "active") {
        throw new Error("only active milestones can be completed.");
      }
      const unfinished = (await this.list({ boardId: milestone.boardId })).filter(
        (card) =>
          card.milestoneId === milestone.id && !card.metadata?.archivedAt && card.status !== "done",
      );
      if (unfinished.length > 0) {
        throw new Error(
          `milestone has unfinished cards: ${unfinished
            .map((card) => `${card.id}:${card.title}`)
            .join(", ")}`,
        );
      }
      const now = Date.now();
      const next: FlowboardMilestone = {
        ...milestone,
        state: "completed",
        completedAt: now,
        updatedAt: now,
      };
      await this.milestoneStore.register(next.id, { version: 1, milestone: next });
      return next;
    });
  }

  async archiveMilestone(id: string): Promise<FlowboardMilestone> {
    return await this.setMilestoneState(id, "archived");
  }

  async restoreMilestone(id: string): Promise<FlowboardMilestone> {
    return await this.setMilestoneState(id, "active");
  }

  private async setMilestoneState(
    id: string,
    state: FlowboardMilestone["state"],
  ): Promise<FlowboardMilestone> {
    return await this.enqueueMutation(async () => {
      if (!(FLOWBOARD_MILESTONE_STATES as readonly string[]).includes(state)) {
        throw new Error("invalid milestone state.");
      }
      const entry = await this.milestoneStore.lookup(id.trim());
      if (!entry?.milestone) {
        throw new Error(`milestone not found: ${id}`);
      }
      const now = Date.now();
      const next: FlowboardMilestone = {
        ...entry.milestone,
        state,
        updatedAt: now,
        ...(state === "archived" ? { archivedAt: now } : {}),
      };
      if (state === "active") {
        delete next.archivedAt;
        delete next.completedAt;
      }
      await this.milestoneStore.register(next.id, { version: 1, milestone: next });
      return next;
    });
  }

  async moveMilestone(id: string, input: FlowboardMoveMilestoneInput): Promise<FlowboardCard> {
    return await this.enqueueMutation(async () => {
      const card = await this.get(id);
      if (!card) {
        throw new Error(`card not found: ${id}`);
      }
      const boardId = cardBoardId(card);
      await this.assertProjectCanReceiveCards(boardId);
      const milestoneId = normalizeOptionalString(input.milestoneId);
      if (milestoneId) {
        const milestone = await this.milestoneStore.lookup(milestoneId);
        if (
          !milestone?.milestone ||
          milestone.milestone.boardId !== boardId ||
          milestone.milestone.state !== "active"
        ) {
          throw new Error("target milestone must be an active milestone in the current project.");
        }
      }
      const position =
        input.position === undefined
          ? Math.max(
              0,
              ...(await this.list({ boardId }))
                .filter((candidate) => candidate.id !== card.id && candidate.milestoneId === milestoneId)
                .map((candidate) => candidate.position),
            ) + POSITION_STEP
          : normalizePosition(input.position, card.position);
      const next = removeUndefinedCardFields({
        ...card,
        ...(milestoneId ? { milestoneId } : {}),
        position,
        updatedAt: Date.now(),
      });
      if (!milestoneId) {
        delete next.milestoneId;
      }
      if (card.milestoneId !== milestoneId) {
        next.events = appendEvent(next, {
          kind: "milestone_moved",
          ...(card.milestoneId ? { fromMilestoneId: card.milestoneId } : {}),
          ...(milestoneId ? { toMilestoneId: milestoneId } : {}),
        });
      }
      await this.store.register(next.id, { version: 1, card: next });
      return next;
    });
  }

  async moveProject(id: string, input: FlowboardMoveProjectInput): Promise<FlowboardCard> {
    return await this.enqueueMutation(async () => {
      const card = await this.get(id);
      if (!card) {
        throw new Error(`card not found: ${id}`);
      }
      const currentBoardId = cardBoardId(card);
      const boardId = normalizeBoardIdRequired(input.boardId);
      const targetBoard = await this.boardStore.lookup(boardId);
      if (!targetBoard && (await this.list({ boardId })).length === 0 && boardId !== "default") {
        throw new Error(`target project not found: ${boardId}`);
      }
      await this.assertProjectCanReceiveCards(boardId);
      await this.ensureProjectDirect(boardId);
      const milestoneId = normalizeOptionalString(input.milestoneId);
      if (boardId !== currentBoardId && !milestoneId) {
        throw new Error("target milestone is required when moving a card to another project.");
      }
      if (milestoneId) {
        const milestone = await this.milestoneStore.lookup(milestoneId);
        if (
          !milestone?.milestone ||
          milestone.milestone.boardId !== boardId ||
          milestone.milestone.state !== "active"
        ) {
          throw new Error("target milestone must be an active milestone in the target project.");
        }
      }
      const position =
        input.position === undefined
          ? Math.max(
              0,
              ...(await this.list({ boardId }))
                .filter((candidate) => candidate.id !== card.id && candidate.milestoneId === milestoneId)
                .map((candidate) => candidate.position),
            ) + POSITION_STEP
          : normalizePosition(input.position, card.position);
      const next = removeUndefinedCardFields({
        ...card,
        ...(milestoneId ? { milestoneId } : {}),
        position,
        updatedAt: Date.now(),
        metadata: {
          ...card.metadata,
          automation: {
            ...card.metadata?.automation,
            boardId,
          },
        },
      });
      if (!milestoneId) {
        delete next.milestoneId;
      }
      next.events = appendEvent(next, {
        kind: "milestone_moved",
        ...(card.milestoneId ? { fromMilestoneId: card.milestoneId } : {}),
        ...(milestoneId ? { toMilestoneId: milestoneId } : {}),
      });
      await this.store.register(next.id, { version: 1, card: next });
      return next;
    });
  }

  async listProjectDocuments(
    boardId: unknown,
    options: { includeHidden?: unknown } = {},
  ): Promise<{ documents: FlowboardProjectDocument[] }> {
    const normalizedBoardId = normalizeBoardIdRequired(boardId);
    return await this.enqueueMutation(async () => {
      const board = await this.ensureProjectDirect(normalizedBoardId);
      await this.removeLegacyGeneratedProjectDocumentsDirect(board);
      await this.discoverProjectDocumentsDirect(board);
      const documents = (await this.documentStore.entries())
        .map((entry) => entry.value)
        .filter(
          (entry): entry is { version: 1; document: FlowboardProjectDocument } =>
            entry?.version === 1 && entry.document?.boardId === normalizedBoardId,
        )
        .map((entry) => presentProjectDocument(entry.document))
        .filter((document) => options.includeHidden === true || !document.hiddenAt)
        .toSorted(
          (left, right) =>
            left.section.localeCompare(right.section) ||
            left.position - right.position ||
            left.createdAt - right.createdAt,
        );
      return { documents };
    });
  }

  async getProjectDocument(id: string): Promise<FlowboardProjectDocument> {
    const entry = await this.documentStore.lookup(id.trim());
    if (!entry?.document) {
      throw new Error(`project document not found: ${id}`);
    }
    return presentProjectDocument(entry.document);
  }

  async createProjectDocument(
    input: FlowboardProjectDocumentCreateInput,
  ): Promise<FlowboardProjectDocument> {
    return await this.enqueueMutation(async () => {
      const boardId = normalizeBoardIdRequired(input.boardId);
      await this.assertProjectCanReceiveCards(boardId);
      await this.ensureProjectDirect(boardId);
      const key = normalizeDocumentKey(input.key);
      if (hasReservedAutomaticDocumentKeyPrefix(key)) {
        throw new Error("document key prefixes file. and ai. are reserved for automatic documents.");
      }
      const section = normalizeDocumentSection(input.section);
      const type = normalizeDocumentType(input.type);
      const title = normalizeTitle(input.title);
      const summary = normalizeBoundedString(input.summary, undefined, 1000, "document summary");
      const body = normalizeDocumentBody(input, type);
      const entries = await this.documentStore.entries();
      if (
        entries.some(
          (entry) =>
            entry.value?.version === 1 &&
            entry.value.document.boardId === boardId &&
            entry.value.document.key === key,
        )
      ) {
        throw new Error(`project document key already exists: ${key}`);
      }
      const sameSection = entries
        .map((entry) => entry.value)
        .filter(
          (entry): entry is { version: 1; document: FlowboardProjectDocument } =>
            entry?.version === 1 &&
            entry.document.boardId === boardId &&
            entry.document.section === section,
        );
      const now = Date.now();
      const document: FlowboardProjectDocument = {
        id: randomUUID(),
        boardId,
        key,
        section,
        source: "project",
        type,
        title,
        position:
          input.position === undefined
            ? Math.max(0, ...sameSection.map((entry) => entry.document.position)) + POSITION_STEP
            : normalizePosition(input.position, POSITION_STEP),
        createdAt: now,
        updatedAt: now,
        ...(summary ? { summary } : {}),
        ...body,
      };
      await this.documentStore.register(document.id, { version: 1, document });
      return document;
    });
  }

  async updateProjectDocument(
    id: string,
    input: FlowboardProjectDocumentUpdateInput,
  ): Promise<FlowboardProjectDocument> {
    return await this.enqueueMutation(async () => {
      const entry = await this.documentStore.lookup(id.trim());
      if (!entry?.document) {
        throw new Error(`project document not found: ${id}`);
      }
      const existing = entry.document;
      await this.assertProjectCanReceiveCards(existing.boardId);
      const type = normalizeDocumentType(input.type, existing.type);
      const title = input.title === undefined ? existing.title : normalizeTitle(input.title);
      const summary =
        input.summary === undefined
          ? existing.summary
          : normalizeBoundedString(input.summary, undefined, 1000, "document summary");
      const body = normalizeDocumentBody(input, type, existing);
      const next: FlowboardProjectDocument = {
        ...existing,
        type,
        title,
        updatedAt: Date.now(),
        ...(summary ? { summary } : {}),
        ...body,
      };
      if (!summary) {
        delete next.summary;
      }
      if (!body.target) {
        delete next.target;
      }
      if (!body.content) {
        delete next.content;
      }
      await this.documentStore.register(next.id, { version: 1, document: next });
      return next;
    });
  }

  async hideProjectDocument(id: string, hidden: unknown = true): Promise<FlowboardProjectDocument> {
    return await this.enqueueMutation(async () => {
      const entry = await this.documentStore.lookup(id.trim());
      if (!entry?.document) {
        throw new Error(`project document not found: ${id}`);
      }
      const next = {
        ...entry.document,
        updatedAt: Date.now(),
        ...(hidden === false ? {} : { hiddenAt: Date.now() }),
      };
      if (hidden === false) {
        delete next.hiddenAt;
      }
      await this.documentStore.register(next.id, { version: 1, document: next });
      return next;
    });
  }

  async deleteProjectDocument(id: string): Promise<{ deleted: boolean }> {
    return await this.enqueueMutation(async () => {
      const entry = await this.documentStore.lookup(id.trim());
      if (!entry?.document) {
        return { deleted: false };
      }
      return { deleted: await this.documentStore.delete(entry.document.id) };
    });
  }

  async reorderProjectDocuments(
    input: FlowboardProjectDocumentReorderInput,
  ): Promise<{ documents: FlowboardProjectDocument[] }> {
    const boardId = normalizeBoardIdRequired(input.boardId);
    if (
      !Array.isArray(input.documentIds) ||
      input.documentIds.length === 0 ||
      input.documentIds.some((id) => typeof id !== "string")
    ) {
      throw new Error("document ids are required.");
    }
    return await this.enqueueMutation(async () => {
      const ids = input.documentIds as string[];
      if (new Set(ids).size !== ids.length) {
        throw new Error("document ids must not contain duplicates.");
      }
      const entries = await Promise.all(ids.map((id) => this.documentStore.lookup(id)));
      const documents = entries.map((entry, index) => {
        if (!entry?.document || entry.document.boardId !== boardId) {
          throw new Error(`project document does not belong to project: ${ids[index]}`);
        }
        return entry.document;
      });
      const section = documents[0]?.section;
      if (!section || documents.some((document) => document.section !== section)) {
        throw new Error("project documents can only be reordered within one section.");
      }
      const now = Date.now();
      const reordered = documents.map((document, index) => ({
        ...document,
        position: (index + 1) * POSITION_STEP,
        updatedAt: now,
      }));
      for (const document of reordered) {
        await this.documentStore.register(document.id, { version: 1, document });
      }
      return { documents: reordered };
    });
  }

  override async update(
    id: string,
    patch: FlowboardCardPatch,
    options: { expectedRevision?: number } = {},
  ): Promise<FlowboardCard> {
    const raw = patch as Record<string, unknown>;
    if (
      Object.hasOwn(raw, "boardId") ||
      Object.hasOwn(raw, "milestoneId") ||
      Object.hasOwn(raw, "position")
    ) {
      throw new Error("use the dedicated project or milestone move operation for card placement.");
    }
    return await super.update(id, patch, options);
  }

  override async deleteBoard(id: unknown): Promise<{ deleted: boolean }> {
    const boardId = normalizeBoardIdRequired(id);
    if (
      (await this.listMilestonesDirect(boardId)).length > 0 ||
      (await this.documentStore.entries()).some(
        (entry) => entry.value?.version === 1 && entry.value.document.boardId === boardId,
      )
    ) {
      throw new Error("initialized projects cannot be permanently deleted.");
    }
    return await super.deleteBoard(boardId);
  }

  protected override async createDirect(
    input: FlowboardLinkedCreateInput,
    scope?: FlowboardMutationScope,
  ): Promise<FlowboardCard> {
    const parentId =
      normalizeOptionalString(input.createdByCardId) ??
      (Array.isArray(input.parents)
        ? input.parents.find(
            (value): value is string => typeof value === "string" && value.trim() !== "",
          )
        : undefined);
    const parent = parentId ? await this.get(parentId) : undefined;
    const inheritedBoardId = parent ? cardBoardId(parent) : undefined;
    const boardId = normalizeBoardId(input.boardId, inheritedBoardId) ?? "default";
    const milestoneId = normalizeOptionalString(input.milestoneId) ?? parent?.milestoneId;
    await this.assertProjectCanReceiveCards(boardId);
    const board = await this.ensureBoardDirect(boardId);
    if (milestoneId) {
      const milestone = await this.milestoneStore.lookup(milestoneId);
      if (
        !milestone?.milestone ||
        milestone.milestone.boardId !== boardId ||
        milestone.milestone.state !== "active"
      ) {
        throw new Error("milestone must be an active milestone in the target project.");
      }
    }
    return await super.createDirect(
      {
        ...input,
        boardId,
        ...(milestoneId ? { milestoneId } : {}),
        ...(!input.workspace && board.defaultWorkspace ? { workspace: board.defaultWorkspace } : {}),
      },
      scope,
    );
  }
}
