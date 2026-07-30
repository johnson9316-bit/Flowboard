// Taskfold API module exposes the plugin public contract.
import type {
  PluginDoctorStateMigration,
  PluginDoctorStateMigrationContext,
} from "openclaw/plugin-sdk/runtime-doctor";
import type {
  PersistedTaskfoldAttachment,
  PersistedTaskfoldBoard,
  PersistedTaskfoldCard,
  PersistedTaskfoldNotificationSubscription,
  TaskfoldKeyedStore,
} from "./src/persistence-types.js";
import { createTaskfoldSqliteStores, resolveTaskfoldSqlitePath } from "./src/sqlite-store.js";

const MAX_CARDS = 2000;

function migrationEnv(params: { env: NodeJS.ProcessEnv; stateDir: string }): NodeJS.ProcessEnv {
  return { ...params.env, OPENCLAW_STATE_DIR: params.stateDir };
}

function openLegacyStore<T>(params: {
  context: PluginDoctorStateMigrationContext;
  env: NodeJS.ProcessEnv;
  namespace: string;
  maxEntries: number;
}): TaskfoldKeyedStore<T> {
  return params.context.openPluginStateKeyedStore<T>({
    namespace: params.namespace,
    maxEntries: params.maxEntries,
    env: params.env,
  });
}

function isPersistedCard(value: unknown): value is PersistedTaskfoldCard {
  return Boolean(
    value && typeof value === "object" && (value as PersistedTaskfoldCard).version === 1,
  );
}

function isPersistedBoard(value: unknown): value is PersistedTaskfoldBoard {
  return Boolean(
    value && typeof value === "object" && (value as PersistedTaskfoldBoard).version === 1,
  );
}

function isPersistedSubscription(
  value: unknown,
): value is PersistedTaskfoldNotificationSubscription {
  return Boolean(
    value &&
    typeof value === "object" &&
    (value as PersistedTaskfoldNotificationSubscription).version === 1,
  );
}

function isPersistedAttachment(value: unknown): value is PersistedTaskfoldAttachment {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as {
    version?: unknown;
    attachment?: Partial<PersistedTaskfoldAttachment["attachment"]>;
    contentBase64?: unknown;
  };
  const attachment = candidate.attachment;
  return (
    candidate.version === 1 &&
    attachment !== undefined &&
    typeof attachment === "object" &&
    typeof attachment.id === "string" &&
    typeof attachment.cardId === "string" &&
    typeof attachment.fileName === "string" &&
    typeof attachment.byteSize === "number" &&
    typeof attachment.createdAt === "number" &&
    typeof candidate.contentBase64 === "string"
  );
}

async function migrateNamespace<T>(params: {
  label: string;
  legacy: TaskfoldKeyedStore<T>;
  target: TaskfoldKeyedStore<T>;
  isValid: (value: unknown) => value is T;
}): Promise<{ imported: number; warnings: string[] }> {
  const warnings: string[] = [];
  let imported = 0;
  for (const entry of await params.legacy.entries()) {
    if (!params.isValid(entry.value)) {
      warnings.push(`Skipped malformed legacy Taskfold ${params.label} entry ${entry.key}`);
      continue;
    }
    try {
      const targetEntry = await params.target.lookup(entry.key);
      if (targetEntry) {
        if (JSON.stringify(targetEntry) === JSON.stringify(entry.value)) {
          await params.legacy.delete(entry.key);
          imported++;
          continue;
        }
        warnings.push(
          `Skipped legacy Taskfold ${params.label} entry ${entry.key} because the SQLite target already exists`,
        );
        continue;
      }
      await params.target.register(entry.key, entry.value);
      await params.legacy.delete(entry.key);
      imported++;
    } catch (err) {
      warnings.push(
        `Failed migrating legacy Taskfold ${params.label} entry ${entry.key}: ${String(err)}`,
      );
    }
  }
  return { imported, warnings };
}

async function targetCardReferencesAttachment(
  cards: TaskfoldKeyedStore,
  attachment: PersistedTaskfoldAttachment,
): Promise<boolean> {
  const card = await cards.lookup(attachment.attachment.cardId);
  return Boolean(
    card?.version === 1 &&
    card.card.metadata?.attachments?.some(
      (entry) =>
        entry.id === attachment.attachment.id && entry.cardId === attachment.attachment.cardId,
    ),
  );
}

async function migrateAttachments(params: {
  legacy: TaskfoldKeyedStore<PersistedTaskfoldAttachment>;
  cards: TaskfoldKeyedStore;
  target: TaskfoldKeyedStore<PersistedTaskfoldAttachment>;
}): Promise<{ imported: number; warnings: string[] }> {
  const warnings: string[] = [];
  let imported = 0;
  for (const entry of await params.legacy.entries()) {
    if (!isPersistedAttachment(entry.value)) {
      warnings.push(`Skipped malformed legacy Taskfold attachment entry ${entry.key}`);
      continue;
    }
    if (!(await targetCardReferencesAttachment(params.cards, entry.value))) {
      warnings.push(
        `Skipped legacy Taskfold attachment entry ${entry.key} because its owning card was not migrated or does not reference the attachment`,
      );
      continue;
    }
    const targetEntry = await params.target.lookup(entry.key);
    if (targetEntry) {
      if (JSON.stringify(targetEntry) === JSON.stringify(entry.value)) {
        await params.legacy.delete(entry.key);
        imported++;
        continue;
      }
      warnings.push(
        `Skipped legacy Taskfold attachment entry ${entry.key} because the SQLite target already exists`,
      );
      continue;
    }
    try {
      await params.target.register(entry.key, entry.value);
      await params.legacy.delete(entry.key);
      imported++;
    } catch (err) {
      warnings.push(
        `Failed migrating legacy Taskfold attachment entry ${entry.key}: ${String(err)}`,
      );
    }
  }
  return { imported, warnings };
}

export const stateMigrations: PluginDoctorStateMigration[] = [
  {
    id: "taskfold-28-kv-to-sqlite",
    label: "Taskfold .28 plugin-state KV",
    async detectLegacyState(params) {
      const env = migrationEnv(params);
      const cards = await openLegacyStore<PersistedTaskfoldCard>({
        context: params.context,
        env,
        namespace: "taskfold.cards",
        maxEntries: MAX_CARDS,
      }).entries();
      const boards = await openLegacyStore<PersistedTaskfoldBoard>({
        context: params.context,
        env,
        namespace: "taskfold.boards",
        maxEntries: 200,
      }).entries();
      const subscriptions = await openLegacyStore<PersistedTaskfoldNotificationSubscription>({
        context: params.context,
        env,
        namespace: "taskfold.notify",
        maxEntries: 2000,
      }).entries();
      const attachments = await openLegacyStore<PersistedTaskfoldAttachment>({
        context: params.context,
        env,
        namespace: "taskfold.attachments",
        maxEntries: MAX_CARDS * 21,
      }).entries();
      const count = cards.length + boards.length + subscriptions.length + attachments.length;
      if (count === 0) {
        return null;
      }
      return {
        preview: [
          `- Taskfold: ${count} legacy .28 plugin-state KV ${count === 1 ? "entry" : "entries"} → ${resolveTaskfoldSqlitePath(env)}`,
        ],
      };
    },
    async migrateLegacyState(params) {
      const env = migrationEnv(params);
      const cards = openLegacyStore<PersistedTaskfoldCard>({
        context: params.context,
        env,
        namespace: "taskfold.cards",
        maxEntries: MAX_CARDS,
      });
      const boards = openLegacyStore<PersistedTaskfoldBoard>({
        context: params.context,
        env,
        namespace: "taskfold.boards",
        maxEntries: 200,
      });
      const subscriptions = openLegacyStore<PersistedTaskfoldNotificationSubscription>({
        context: params.context,
        env,
        namespace: "taskfold.notify",
        maxEntries: 2000,
      });
      const attachments = openLegacyStore<PersistedTaskfoldAttachment>({
        context: params.context,
        env,
        namespace: "taskfold.attachments",
        maxEntries: MAX_CARDS * 21,
      });
      const sqlite = createTaskfoldSqliteStores({ env });
      try {
        const cardResult = await migrateNamespace({
          label: "card",
          legacy: cards,
          target: sqlite.cards,
          isValid: isPersistedCard,
        });
        const boardResult = await migrateNamespace({
          label: "board",
          legacy: boards,
          target: sqlite.boards,
          isValid: isPersistedBoard,
        });
        const subscriptionResult = await migrateNamespace({
          label: "notification subscription",
          legacy: subscriptions,
          target: sqlite.subscriptions,
          isValid: isPersistedSubscription,
        });
        const attachmentResult = await migrateAttachments({
          legacy: attachments,
          cards: sqlite.cards,
          target: sqlite.attachments,
        });
        const imported =
          cardResult.imported +
          boardResult.imported +
          subscriptionResult.imported +
          attachmentResult.imported;
        return {
          changes:
            imported > 0
              ? [
                  `Migrated ${imported} Taskfold .28 plugin-state KV ${imported === 1 ? "entry" : "entries"} → relational SQLite`,
                ]
              : [],
          warnings: [
            ...cardResult.warnings,
            ...boardResult.warnings,
            ...subscriptionResult.warnings,
            ...attachmentResult.warnings,
          ],
        };
      } finally {
        sqlite.close();
      }
    },
  },
];
