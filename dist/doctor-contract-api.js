// src/backend/src/sqlite-store.ts
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { configureSqliteConnectionPragmas } from "openclaw/plugin-sdk/plugin-state-runtime";
import { resolveStateDir } from "openclaw/plugin-sdk/state-paths";
var FLOWBOARD_DB_RELATIVE_PATH = ["plugins", "flowboard", "flowboard.sqlite"];
var SCHEMA_VERSION = 5;
var FLOWBOARD_SQLITE_BUSY_TIMEOUT_MS = 5e3;
var FLOWBOARD_SQLITE_DIR_MODE = 448;
var FLOWBOARD_SQLITE_FILE_MODE = 384;
function resolveFlowboardSqlitePath(env = process.env) {
  return path.join(resolveStateDir(env), ...FLOWBOARD_DB_RELATIVE_PATH);
}
function jsonValue(value) {
  return value === void 0 ? null : JSON.stringify(value);
}
function parseJson(value) {
  if (typeof value !== "string" || !value) {
    return void 0;
  }
  return JSON.parse(value);
}
function stringValue(row, key) {
  const value = row[key];
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function numberValue(row, key) {
  const value = row[key];
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : void 0;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  return void 0;
}
function requiredString(row, key) {
  const value = stringValue(row, key);
  if (!value) {
    throw new Error(`flowboard sqlite row missing ${key}`);
  }
  return value;
}
function requiredNumber(row, key) {
  const value = numberValue(row, key);
  if (value === void 0) {
    throw new Error(`flowboard sqlite row missing ${key}`);
  }
  return value;
}
function optional(value) {
  return Object.keys(value).length > 0 ? value : void 0;
}
function asBlobContent(value) {
  return Buffer.from(value, "base64");
}
function blobToBase64(value) {
  if (value instanceof Uint8Array) {
    return Buffer.from(value).toString("base64");
  }
  if (typeof value === "string") {
    return Buffer.from(value).toString("base64");
  }
  return "";
}
function runTransaction(db, run) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = run();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
function tableColumns(db, tableName) {
  return new Set(
    db.prepare(`PRAGMA table_info(${tableName})`).all().flatMap(
      (row) => typeof row.name === "string" ? [row.name] : []
    )
  );
}
function ensureColumn(db, tableName, columnName, definition) {
  if (tableColumns(db, tableName).has(columnName)) {
    return;
  }
  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`);
}
var FLOWBOARD_SCHEMA_SQL = `
    CREATE TABLE IF NOT EXISTS flowboard_schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS flowboard_boards (
      id TEXT PRIMARY KEY,
      name TEXT,
      description TEXT,
      icon TEXT,
      color TEXT,
      position REAL,
      version TEXT,
      current_objective TEXT,
      core_value TEXT,
      source_of_truth TEXT,
      repository_url TEXT,
      planning_path TEXT,
      homepage_url TEXT,
      default_workspace_json TEXT,
      orchestration_json TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      archived_at INTEGER
    ) STRICT;

    CREATE TABLE IF NOT EXISTS flowboard_cards (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      title TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      agent_id TEXT,
      session_key TEXT,
      run_id TEXT,
      task_id TEXT,
      source_url TEXT,
      milestone_id TEXT,
      position REAL NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      started_at INTEGER,
      completed_at INTEGER,
      execution_id TEXT,
      execution_kind TEXT,
      execution_engine TEXT,
      execution_mode TEXT,
      execution_status TEXT,
      execution_model TEXT,
      execution_session_key TEXT,
      execution_run_id TEXT,
      execution_started_at INTEGER,
      execution_updated_at INTEGER,
      automation_json TEXT,
      claim_json TEXT,
      template_id TEXT,
      archived_at INTEGER,
      stale_json TEXT,
      lifecycle_status_source_updated_at INTEGER,
      failure_count INTEGER
    ) STRICT;
    CREATE INDEX IF NOT EXISTS flowboard_cards_board_status_idx
      ON flowboard_cards(board_id, status, position);
    CREATE INDEX IF NOT EXISTS flowboard_cards_session_idx
      ON flowboard_cards(session_key, run_id);

    CREATE TABLE IF NOT EXISTS flowboard_card_labels (
      card_id TEXT NOT NULL REFERENCES flowboard_cards(id) ON DELETE CASCADE,
      ordinal INTEGER NOT NULL,
      label TEXT NOT NULL,
      PRIMARY KEY(card_id, ordinal)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS flowboard_card_events (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES flowboard_cards(id) ON DELETE CASCADE,
      ordinal INTEGER NOT NULL,
      kind TEXT NOT NULL,
      at INTEGER NOT NULL,
      from_status TEXT,
      to_status TEXT,
      from_milestone_id TEXT,
      to_milestone_id TEXT,
      session_key TEXT,
      run_id TEXT
    ) STRICT;

    CREATE TABLE IF NOT EXISTS flowboard_card_attempts (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES flowboard_cards(id) ON DELETE CASCADE,
      ordinal INTEGER NOT NULL,
      status TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      engine TEXT,
      mode TEXT,
      model TEXT,
      session_key TEXT,
      run_id TEXT,
      error TEXT
    ) STRICT;

    CREATE TABLE IF NOT EXISTS flowboard_card_comments (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES flowboard_cards(id) ON DELETE CASCADE,
      ordinal INTEGER NOT NULL,
      body TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER
    ) STRICT;

    CREATE TABLE IF NOT EXISTS flowboard_card_links (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES flowboard_cards(id) ON DELETE CASCADE,
      ordinal INTEGER NOT NULL,
      type TEXT NOT NULL,
      target_card_id TEXT,
      title TEXT,
      url TEXT,
      created_at INTEGER NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS flowboard_card_proof (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES flowboard_cards(id) ON DELETE CASCADE,
      ordinal INTEGER NOT NULL,
      status TEXT NOT NULL,
      label TEXT,
      command TEXT,
      url TEXT,
      note TEXT,
      created_at INTEGER NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS flowboard_card_artifacts (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES flowboard_cards(id) ON DELETE CASCADE,
      ordinal INTEGER NOT NULL,
      label TEXT,
      url TEXT,
      path TEXT,
      mime_type TEXT,
      created_at INTEGER NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS flowboard_card_delivery (
      card_id TEXT PRIMARY KEY REFERENCES flowboard_cards(id) ON DELETE CASCADE,
      objective TEXT,
      delivery_summary TEXT,
      open_items TEXT,
      implementation_state TEXT,
      verification_state TEXT,
      release_state TEXT,
      updated_at INTEGER NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS flowboard_card_source_references (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES flowboard_cards(id) ON DELETE CASCADE,
      ordinal INTEGER NOT NULL,
      label TEXT NOT NULL,
      target TEXT NOT NULL,
      note TEXT,
      position REAL NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS flowboard_card_source_references_card_position_idx
      ON flowboard_card_source_references(card_id, position);

    CREATE TABLE IF NOT EXISTS flowboard_card_diagnostics (
      card_id TEXT NOT NULL REFERENCES flowboard_cards(id) ON DELETE CASCADE,
      ordinal INTEGER NOT NULL,
      kind TEXT NOT NULL,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      detail TEXT NOT NULL,
      first_seen_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL,
      count INTEGER NOT NULL,
      actions_json TEXT NOT NULL,
      PRIMARY KEY(card_id, ordinal)
    ) STRICT;

    CREATE TABLE IF NOT EXISTS flowboard_card_notifications (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES flowboard_cards(id) ON DELETE CASCADE,
      ordinal INTEGER NOT NULL,
      kind TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      sequence INTEGER,
      session_key TEXT,
      run_id TEXT
    ) STRICT;

    CREATE TABLE IF NOT EXISTS flowboard_worker_logs (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES flowboard_cards(id) ON DELETE CASCADE,
      ordinal INTEGER NOT NULL,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      session_key TEXT,
      run_id TEXT
    ) STRICT;

    CREATE TABLE IF NOT EXISTS flowboard_worker_protocol (
      card_id TEXT PRIMARY KEY REFERENCES flowboard_cards(id) ON DELETE CASCADE,
      state TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      detail TEXT
    ) STRICT;

    CREATE TABLE IF NOT EXISTS flowboard_card_attachments (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES flowboard_cards(id) ON DELETE CASCADE,
      ordinal INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      byte_size INTEGER NOT NULL,
      mime_type TEXT,
      note TEXT,
      created_at INTEGER NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS flowboard_card_attachments_card_idx
      ON flowboard_card_attachments(card_id, ordinal);

    CREATE TABLE IF NOT EXISTS flowboard_attachment_blobs (
      attachment_id TEXT PRIMARY KEY,
      content BLOB NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS flowboard_notification_subscriptions (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      card_id TEXT,
      session_key TEXT,
      run_id TEXT,
      target TEXT,
      event_kinds_json TEXT,
      last_event_at INTEGER,
      last_event_id TEXT,
      last_event_sequence INTEGER,
      delivered_event_ids_json TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS flowboard_milestones (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      color TEXT,
      position REAL NOT NULL,
      state TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      completed_at INTEGER,
      archived_at INTEGER
    ) STRICT;
    CREATE INDEX IF NOT EXISTS flowboard_milestones_board_position_idx
      ON flowboard_milestones(board_id, position);

    CREATE TABLE IF NOT EXISTS flowboard_project_documents (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      document_key TEXT NOT NULL,
      section TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT,
      target TEXT,
      content TEXT,
      position REAL NOT NULL,
      hidden_at INTEGER,
      system INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(board_id, document_key)
    ) STRICT;
    CREATE INDEX IF NOT EXISTS flowboard_project_documents_board_section_position_idx
      ON flowboard_project_documents(board_id, section, position);
  `;
function ensureFlowboardSchema(db) {
  db.exec(FLOWBOARD_SCHEMA_SQL);
  ensureColumn(
    db,
    "flowboard_cards",
    "lifecycle_status_source_updated_at",
    "lifecycle_status_source_updated_at INTEGER"
  );
  ensureColumn(db, "flowboard_cards", "milestone_id", "milestone_id TEXT");
  ensureColumn(db, "flowboard_card_events", "from_milestone_id", "from_milestone_id TEXT");
  ensureColumn(db, "flowboard_card_events", "to_milestone_id", "to_milestone_id TEXT");
  ensureColumn(db, "flowboard_boards", "position", "position REAL");
  ensureColumn(db, "flowboard_boards", "version", "version TEXT");
  ensureColumn(db, "flowboard_boards", "current_objective", "current_objective TEXT");
  ensureColumn(db, "flowboard_boards", "core_value", "core_value TEXT");
  ensureColumn(db, "flowboard_boards", "source_of_truth", "source_of_truth TEXT");
  ensureColumn(db, "flowboard_boards", "repository_url", "repository_url TEXT");
  ensureColumn(db, "flowboard_boards", "planning_path", "planning_path TEXT");
  ensureColumn(db, "flowboard_boards", "homepage_url", "homepage_url TEXT");
  db.exec(`
    CREATE INDEX IF NOT EXISTS flowboard_cards_board_milestone_position_idx
      ON flowboard_cards(board_id, milestone_id, position);
  `);
  const migrationId = `schema-${SCHEMA_VERSION}`;
  const current = db.prepare("SELECT 1 AS found FROM flowboard_schema_migrations WHERE id = ?").get(migrationId);
  if (!current) {
    db.prepare(
      "INSERT OR IGNORE INTO flowboard_schema_migrations (id, applied_at) VALUES (?, ?)"
    ).run(migrationId, Date.now());
  }
}
function chmodIfExists(targetPath, mode) {
  try {
    fs.chmodSync(targetPath, mode);
  } catch (err) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }
}
function hardenFlowboardDatabaseFiles(dbPath) {
  fs.chmodSync(path.dirname(dbPath), FLOWBOARD_SQLITE_DIR_MODE);
  chmodIfExists(dbPath, FLOWBOARD_SQLITE_FILE_MODE);
  chmodIfExists(`${dbPath}-wal`, FLOWBOARD_SQLITE_FILE_MODE);
  chmodIfExists(`${dbPath}-shm`, FLOWBOARD_SQLITE_FILE_MODE);
  chmodIfExists(`${dbPath}-journal`, FLOWBOARD_SQLITE_FILE_MODE);
}
function createDatabase(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true, mode: FLOWBOARD_SQLITE_DIR_MODE });
  chmodIfExists(path.dirname(dbPath), FLOWBOARD_SQLITE_DIR_MODE);
  if (!fs.existsSync(dbPath)) {
    fs.closeSync(fs.openSync(dbPath, "a", FLOWBOARD_SQLITE_FILE_MODE));
  }
  const db = new DatabaseSync(dbPath);
  let maintenance;
  try {
    maintenance = configureSqliteConnectionPragmas(db, {
      busyTimeoutMs: FLOWBOARD_SQLITE_BUSY_TIMEOUT_MS,
      checkpointIntervalMs: 0,
      databaseLabel: "flowboard database",
      databasePath: dbPath,
      foreignKeys: true,
      synchronous: "NORMAL"
    });
    ensureFlowboardSchema(db);
    hardenFlowboardDatabaseFiles(dbPath);
    return { db, maintenance };
  } catch (error) {
    try {
      maintenance?.close();
    } finally {
      db.close();
    }
    throw error;
  }
}
function childRows(db, table, cardId) {
  return db.prepare(`SELECT * FROM ${table} WHERE card_id = ? ORDER BY ordinal ASC`).all(cardId);
}
function readLabels(db, cardId) {
  return childRows(db, "flowboard_card_labels", cardId).flatMap((row) => {
    const label = stringValue(row, "label");
    return label ? [label] : [];
  });
}
function readEvents(db, cardId) {
  const events = childRows(db, "flowboard_card_events", cardId).map((row) => {
    const event = {
      id: requiredString(row, "id"),
      kind: requiredString(row, "kind"),
      at: requiredNumber(row, "at")
    };
    const fromStatus = stringValue(row, "from_status");
    const toStatus = stringValue(row, "to_status");
    const fromMilestoneId = stringValue(row, "from_milestone_id");
    const toMilestoneId = stringValue(row, "to_milestone_id");
    const sessionKey = stringValue(row, "session_key");
    const runId = stringValue(row, "run_id");
    if (fromStatus) {
      event.fromStatus = fromStatus;
    }
    if (toStatus) {
      event.toStatus = toStatus;
    }
    if (fromMilestoneId) {
      event.fromMilestoneId = fromMilestoneId;
    }
    if (toMilestoneId) {
      event.toMilestoneId = toMilestoneId;
    }
    if (sessionKey) {
      event.sessionKey = sessionKey;
    }
    if (runId) {
      event.runId = runId;
    }
    return event;
  });
  return events.length > 0 ? events : void 0;
}
function readExecution(row) {
  const id = stringValue(row, "execution_id");
  if (!id) {
    return void 0;
  }
  return {
    id,
    kind: "agent-session",
    mode: requiredString(row, "execution_mode"),
    status: requiredString(row, "execution_status"),
    ...stringValue(row, "execution_engine") ? { engine: stringValue(row, "execution_engine") } : {},
    ...stringValue(row, "execution_model") ? { model: stringValue(row, "execution_model") } : {},
    ...stringValue(row, "execution_session_key") ? { sessionKey: stringValue(row, "execution_session_key") } : {},
    ...stringValue(row, "execution_run_id") ? { runId: stringValue(row, "execution_run_id") } : {},
    startedAt: requiredNumber(row, "execution_started_at"),
    updatedAt: requiredNumber(row, "execution_updated_at")
  };
}
function readMetadata(db, row) {
  const cardId = requiredString(row, "id");
  const attempts = childRows(db, "flowboard_card_attempts", cardId).map((child) => {
    const entry = {
      id: requiredString(child, "id"),
      status: requiredString(child, "status"),
      startedAt: requiredNumber(child, "started_at")
    };
    const endedAt = numberValue(child, "ended_at");
    const engine = stringValue(child, "engine");
    const mode = stringValue(child, "mode");
    const model = stringValue(child, "model");
    const sessionKey = stringValue(child, "session_key");
    const runId = stringValue(child, "run_id");
    const error = stringValue(child, "error");
    if (endedAt !== void 0) {
      entry.endedAt = endedAt;
    }
    if (engine) {
      entry.engine = engine;
    }
    if (mode) {
      entry.mode = mode;
    }
    if (model) {
      entry.model = model;
    }
    if (sessionKey) {
      entry.sessionKey = sessionKey;
    }
    if (runId) {
      entry.runId = runId;
    }
    if (error) {
      entry.error = error;
    }
    return entry;
  });
  const comments = childRows(db, "flowboard_card_comments", cardId).map((child) => {
    const entry = {
      id: requiredString(child, "id"),
      body: requiredString(child, "body"),
      createdAt: requiredNumber(child, "created_at")
    };
    const updatedAt = numberValue(child, "updated_at");
    if (updatedAt !== void 0) {
      entry.updatedAt = updatedAt;
    }
    return entry;
  });
  const links = childRows(db, "flowboard_card_links", cardId).map((child) => {
    const entry = {
      id: requiredString(child, "id"),
      type: requiredString(child, "type"),
      createdAt: requiredNumber(child, "created_at")
    };
    const targetCardId = stringValue(child, "target_card_id");
    const title = stringValue(child, "title");
    const url = stringValue(child, "url");
    if (targetCardId) {
      entry.targetCardId = targetCardId;
    }
    if (title) {
      entry.title = title;
    }
    if (url) {
      entry.url = url;
    }
    return entry;
  });
  const proof = childRows(db, "flowboard_card_proof", cardId).map((child) => {
    const entry = {
      id: requiredString(child, "id"),
      status: requiredString(child, "status"),
      createdAt: requiredNumber(child, "created_at")
    };
    const label = stringValue(child, "label");
    const command = stringValue(child, "command");
    const url = stringValue(child, "url");
    const note = stringValue(child, "note");
    if (label) {
      entry.label = label;
    }
    if (command) {
      entry.command = command;
    }
    if (url) {
      entry.url = url;
    }
    if (note) {
      entry.note = note;
    }
    return entry;
  });
  const artifacts = childRows(db, "flowboard_card_artifacts", cardId).map((child) => {
    const entry = {
      id: requiredString(child, "id"),
      createdAt: requiredNumber(child, "created_at")
    };
    const label = stringValue(child, "label");
    const url = stringValue(child, "url");
    const artifactPath = stringValue(child, "path");
    const mimeType = stringValue(child, "mime_type");
    if (label) {
      entry.label = label;
    }
    if (url) {
      entry.url = url;
    }
    if (artifactPath) {
      entry.path = artifactPath;
    }
    if (mimeType) {
      entry.mimeType = mimeType;
    }
    return entry;
  });
  const attachments = childRows(db, "flowboard_card_attachments", cardId).map((child) => {
    const entry = {
      id: requiredString(child, "id"),
      cardId: requiredString(child, "card_id"),
      createdAt: requiredNumber(child, "created_at"),
      fileName: requiredString(child, "file_name"),
      byteSize: requiredNumber(child, "byte_size")
    };
    const mimeType = stringValue(child, "mime_type");
    const note = stringValue(child, "note");
    if (mimeType) {
      entry.mimeType = mimeType;
    }
    if (note) {
      entry.note = note;
    }
    return entry;
  });
  const workerLogs = childRows(db, "flowboard_worker_logs", cardId).map((child) => {
    const entry = {
      id: requiredString(child, "id"),
      createdAt: requiredNumber(child, "created_at"),
      level: requiredString(child, "level"),
      message: requiredString(child, "message")
    };
    const sessionKey = stringValue(child, "session_key");
    const runId = stringValue(child, "run_id");
    if (sessionKey) {
      entry.sessionKey = sessionKey;
    }
    if (runId) {
      entry.runId = runId;
    }
    return entry;
  });
  const diagnostics = childRows(db, "flowboard_card_diagnostics", cardId).map((child) => ({
    kind: requiredString(child, "kind"),
    severity: requiredString(child, "severity"),
    title: requiredString(child, "title"),
    detail: requiredString(child, "detail"),
    firstSeenAt: requiredNumber(child, "first_seen_at"),
    lastSeenAt: requiredNumber(child, "last_seen_at"),
    count: requiredNumber(child, "count"),
    actions: parseJson(child.actions_json) ?? []
  }));
  const notifications = childRows(db, "flowboard_card_notifications", cardId).map((child) => {
    const entry = {
      id: requiredString(child, "id"),
      kind: requiredString(child, "kind"),
      createdAt: requiredNumber(child, "created_at"),
      message: requiredString(child, "message")
    };
    const sequence = numberValue(child, "sequence");
    const sessionKey = stringValue(child, "session_key");
    const runId = stringValue(child, "run_id");
    if (sequence !== void 0) {
      entry.sequence = sequence;
    }
    if (sessionKey) {
      entry.sessionKey = sessionKey;
    }
    if (runId) {
      entry.runId = runId;
    }
    return entry;
  });
  const protocol = db.prepare("SELECT * FROM flowboard_worker_protocol WHERE card_id = ?").get(cardId);
  const automation = parseJson(row.automation_json);
  const claim = parseJson(row.claim_json);
  const stale = parseJson(row.stale_json);
  const lifecycleStatusSourceUpdatedAt = numberValue(row, "lifecycle_status_source_updated_at");
  return optional({
    ...attempts.length > 0 ? { attempts } : {},
    ...comments.length > 0 ? { comments } : {},
    ...links.length > 0 ? { links } : {},
    ...proof.length > 0 ? { proof } : {},
    ...artifacts.length > 0 ? { artifacts } : {},
    ...attachments.length > 0 ? { attachments } : {},
    ...workerLogs.length > 0 ? { workerLogs } : {},
    ...protocol ? {
      workerProtocol: {
        state: requiredString(protocol, "state"),
        updatedAt: requiredNumber(protocol, "updated_at"),
        ...stringValue(protocol, "detail") ? { detail: stringValue(protocol, "detail") } : {}
      }
    } : {},
    ...automation ? { automation } : {},
    ...claim ? { claim } : {},
    ...diagnostics.length > 0 ? { diagnostics } : {},
    ...notifications.length > 0 ? { notifications } : {},
    ...stringValue(row, "template_id") ? { templateId: stringValue(row, "template_id") } : {},
    ...numberValue(row, "archived_at") !== void 0 ? { archivedAt: numberValue(row, "archived_at") } : {},
    ...stale ? { stale } : {},
    ...lifecycleStatusSourceUpdatedAt !== void 0 ? { lifecycleStatusSourceUpdatedAt } : {},
    ...numberValue(row, "failure_count") !== void 0 ? { failureCount: numberValue(row, "failure_count") } : {}
  });
}
function readDelivery(db, cardId) {
  const row = db.prepare("SELECT * FROM flowboard_card_delivery WHERE card_id = ?").get(cardId);
  if (!row) {
    return void 0;
  }
  const delivery = {
    updatedAt: requiredNumber(row, "updated_at")
  };
  const objective = stringValue(row, "objective");
  const deliverySummary = stringValue(row, "delivery_summary");
  const openItems = stringValue(row, "open_items");
  const implementationState = stringValue(row, "implementation_state");
  const verificationState = stringValue(row, "verification_state");
  const releaseState = stringValue(row, "release_state");
  if (objective) {
    delivery.objective = objective;
  }
  if (deliverySummary) {
    delivery.deliverySummary = deliverySummary;
  }
  if (openItems) {
    delivery.openItems = openItems;
  }
  if (implementationState) {
    delivery.implementationState = implementationState;
  }
  if (verificationState) {
    delivery.verificationState = verificationState;
  }
  if (releaseState) {
    delivery.releaseState = releaseState;
  }
  return delivery;
}
function readSourceReferences(db, cardId) {
  return childRows(db, "flowboard_card_source_references", cardId).map((child) => {
    const reference = {
      id: requiredString(child, "id"),
      label: requiredString(child, "label"),
      target: requiredString(child, "target"),
      position: requiredNumber(child, "position"),
      createdAt: requiredNumber(child, "created_at"),
      updatedAt: requiredNumber(child, "updated_at")
    };
    const note = stringValue(child, "note");
    if (note) {
      reference.note = note;
    }
    return reference;
  });
}
function readCard(db, row) {
  const card = {
    id: requiredString(row, "id"),
    title: requiredString(row, "title"),
    status: requiredString(row, "status"),
    priority: requiredString(row, "priority"),
    labels: readLabels(db, requiredString(row, "id")),
    position: requiredNumber(row, "position"),
    createdAt: requiredNumber(row, "created_at"),
    updatedAt: requiredNumber(row, "updated_at")
  };
  const metadata = readMetadata(db, row);
  const delivery = readDelivery(db, card.id);
  const sourceReferences = readSourceReferences(db, card.id);
  return {
    ...card,
    ...stringValue(row, "notes") ? { notes: stringValue(row, "notes") } : {},
    ...stringValue(row, "agent_id") ? { agentId: stringValue(row, "agent_id") } : {},
    ...stringValue(row, "session_key") ? { sessionKey: stringValue(row, "session_key") } : {},
    ...stringValue(row, "run_id") ? { runId: stringValue(row, "run_id") } : {},
    ...stringValue(row, "task_id") ? { taskId: stringValue(row, "task_id") } : {},
    ...stringValue(row, "source_url") ? { sourceUrl: stringValue(row, "source_url") } : {},
    ...stringValue(row, "milestone_id") ? { milestoneId: stringValue(row, "milestone_id") } : {},
    ...readExecution(row) ? { execution: readExecution(row) } : {},
    ...delivery ? { delivery } : {},
    ...sourceReferences.length ? { sourceReferences } : {},
    ...numberValue(row, "started_at") !== void 0 ? { startedAt: numberValue(row, "started_at") } : {},
    ...numberValue(row, "completed_at") !== void 0 ? { completedAt: numberValue(row, "completed_at") } : {},
    ...readEvents(db, card.id) ? { events: readEvents(db, card.id) } : {},
    ...metadata ? { metadata } : {}
  };
}
function cardBoardId(card) {
  return card.metadata?.automation?.boardId ?? "default";
}
function bindNull(value) {
  if (value === void 0 || value === null || typeof value === "string" || typeof value === "number" || typeof value === "bigint" || value instanceof Uint8Array) {
    return value ?? null;
  }
  return JSON.stringify(value);
}
function insertChildren(db, table, cardId, entries, insert) {
  db.prepare(`DELETE FROM ${table} WHERE card_id = ?`).run(cardId);
  entries?.forEach(insert);
}
function insertCard(db, card) {
  const execution = card.execution;
  const metadata = card.metadata;
  db.prepare(
    `
      INSERT INTO flowboard_cards (
        id, board_id, title, notes, status, priority, agent_id, session_key, run_id, task_id,
        source_url, milestone_id, position, created_at, updated_at, started_at, completed_at,
        execution_id, execution_kind, execution_engine, execution_mode, execution_status,
        execution_model, execution_session_key, execution_run_id, execution_started_at,
        execution_updated_at, automation_json, claim_json, template_id, archived_at, stale_json,
        lifecycle_status_source_updated_at, failure_count
      ) VALUES (
        @id, @board_id, @title, @notes, @status, @priority, @agent_id, @session_key, @run_id,
        @task_id, @source_url, @milestone_id, @position, @created_at, @updated_at, @started_at, @completed_at,
        @execution_id, @execution_kind, @execution_engine, @execution_mode, @execution_status,
        @execution_model, @execution_session_key, @execution_run_id, @execution_started_at,
        @execution_updated_at, @automation_json, @claim_json, @template_id, @archived_at,
        @stale_json, @lifecycle_status_source_updated_at, @failure_count
      )
      ON CONFLICT(id) DO UPDATE SET
        board_id = excluded.board_id,
        title = excluded.title,
        notes = excluded.notes,
        status = excluded.status,
        priority = excluded.priority,
        agent_id = excluded.agent_id,
        session_key = excluded.session_key,
        run_id = excluded.run_id,
        task_id = excluded.task_id,
        source_url = excluded.source_url,
        milestone_id = excluded.milestone_id,
        position = excluded.position,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        started_at = excluded.started_at,
        completed_at = excluded.completed_at,
        execution_id = excluded.execution_id,
        execution_kind = excluded.execution_kind,
        execution_engine = excluded.execution_engine,
        execution_mode = excluded.execution_mode,
        execution_status = excluded.execution_status,
        execution_model = excluded.execution_model,
        execution_session_key = excluded.execution_session_key,
        execution_run_id = excluded.execution_run_id,
        execution_started_at = excluded.execution_started_at,
        execution_updated_at = excluded.execution_updated_at,
        automation_json = excluded.automation_json,
        claim_json = excluded.claim_json,
        template_id = excluded.template_id,
        archived_at = excluded.archived_at,
        stale_json = excluded.stale_json,
        lifecycle_status_source_updated_at = excluded.lifecycle_status_source_updated_at,
        failure_count = excluded.failure_count
    `
  ).run({
    id: card.id,
    board_id: cardBoardId(card),
    title: card.title,
    notes: bindNull(card.notes),
    status: card.status,
    priority: card.priority,
    agent_id: bindNull(card.agentId),
    session_key: bindNull(card.sessionKey),
    run_id: bindNull(card.runId),
    task_id: bindNull(card.taskId),
    source_url: bindNull(card.sourceUrl),
    milestone_id: bindNull(card.milestoneId),
    position: card.position,
    created_at: card.createdAt,
    updated_at: card.updatedAt,
    started_at: bindNull(card.startedAt),
    completed_at: bindNull(card.completedAt),
    execution_id: bindNull(execution?.id),
    execution_kind: bindNull(execution?.kind),
    execution_engine: bindNull(execution?.engine),
    execution_mode: bindNull(execution?.mode),
    execution_status: bindNull(execution?.status),
    execution_model: bindNull(execution?.model),
    execution_session_key: bindNull(execution?.sessionKey),
    execution_run_id: bindNull(execution?.runId),
    execution_started_at: bindNull(execution?.startedAt),
    execution_updated_at: bindNull(execution?.updatedAt),
    automation_json: jsonValue(metadata?.automation),
    claim_json: jsonValue(metadata?.claim),
    template_id: bindNull(metadata?.templateId),
    archived_at: bindNull(metadata?.archivedAt),
    stale_json: jsonValue(metadata?.stale),
    lifecycle_status_source_updated_at: bindNull(metadata?.lifecycleStatusSourceUpdatedAt),
    failure_count: bindNull(metadata?.failureCount)
  });
  insertChildren(db, "flowboard_card_labels", card.id, card.labels, (label, ordinal) => {
    db.prepare("INSERT INTO flowboard_card_labels (card_id, ordinal, label) VALUES (?, ?, ?)").run(
      card.id,
      ordinal,
      label
    );
  });
  insertChildren(db, "flowboard_card_events", card.id, card.events, (event, ordinal) => {
    db.prepare(
      `
        INSERT INTO flowboard_card_events
          (id, card_id, ordinal, kind, at, from_status, to_status, from_milestone_id, to_milestone_id, session_key, run_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      event.id,
      card.id,
      ordinal,
      event.kind,
      event.at,
      bindNull(event.fromStatus),
      bindNull(event.toStatus),
      bindNull(event.fromMilestoneId),
      bindNull(event.toMilestoneId),
      bindNull(event.sessionKey),
      bindNull(event.runId)
    );
  });
  insertChildren(db, "flowboard_card_attempts", card.id, metadata?.attempts, (entry, ordinal) => {
    db.prepare(
      `
        INSERT INTO flowboard_card_attempts
          (id, card_id, ordinal, status, started_at, ended_at, engine, mode, model, session_key, run_id, error)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      entry.id,
      card.id,
      ordinal,
      entry.status,
      entry.startedAt,
      bindNull(entry.endedAt),
      bindNull(entry.engine),
      bindNull(entry.mode),
      bindNull(entry.model),
      bindNull(entry.sessionKey),
      bindNull(entry.runId),
      bindNull(entry.error)
    );
  });
  insertChildren(db, "flowboard_card_comments", card.id, metadata?.comments, (entry, ordinal) => {
    db.prepare(
      `
        INSERT INTO flowboard_card_comments (id, card_id, ordinal, body, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `
    ).run(entry.id, card.id, ordinal, entry.body, entry.createdAt, bindNull(entry.updatedAt));
  });
  insertChildren(db, "flowboard_card_links", card.id, metadata?.links, (entry, ordinal) => {
    db.prepare(
      `
        INSERT INTO flowboard_card_links
          (id, card_id, ordinal, type, target_card_id, title, url, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      entry.id,
      card.id,
      ordinal,
      entry.type,
      bindNull(entry.targetCardId),
      bindNull(entry.title),
      bindNull(entry.url),
      entry.createdAt
    );
  });
  insertChildren(db, "flowboard_card_proof", card.id, metadata?.proof, (entry, ordinal) => {
    db.prepare(
      `
        INSERT INTO flowboard_card_proof
          (id, card_id, ordinal, status, label, command, url, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      entry.id,
      card.id,
      ordinal,
      entry.status,
      bindNull(entry.label),
      bindNull(entry.command),
      bindNull(entry.url),
      bindNull(entry.note),
      entry.createdAt
    );
  });
  insertChildren(db, "flowboard_card_artifacts", card.id, metadata?.artifacts, (entry, ordinal) => {
    db.prepare(
      `
        INSERT INTO flowboard_card_artifacts
          (id, card_id, ordinal, label, url, path, mime_type, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      entry.id,
      card.id,
      ordinal,
      bindNull(entry.label),
      bindNull(entry.url),
      bindNull(entry.path),
      bindNull(entry.mimeType),
      entry.createdAt
    );
  });
  db.prepare("DELETE FROM flowboard_card_delivery WHERE card_id = ?").run(card.id);
  if (card.delivery) {
    db.prepare(
      `
        INSERT INTO flowboard_card_delivery
          (card_id, objective, delivery_summary, open_items, implementation_state,
           verification_state, release_state, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      card.id,
      bindNull(card.delivery.objective),
      bindNull(card.delivery.deliverySummary),
      bindNull(card.delivery.openItems),
      bindNull(card.delivery.implementationState),
      bindNull(card.delivery.verificationState),
      bindNull(card.delivery.releaseState),
      card.delivery.updatedAt
    );
  }
  insertChildren(
    db,
    "flowboard_card_source_references",
    card.id,
    card.sourceReferences,
    (entry, ordinal) => {
      db.prepare(
        `
          INSERT INTO flowboard_card_source_references
            (id, card_id, ordinal, label, target, note, position, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      ).run(
        entry.id,
        card.id,
        ordinal,
        entry.label,
        entry.target,
        bindNull(entry.note),
        entry.position,
        entry.createdAt,
        entry.updatedAt
      );
    }
  );
  insertChildren(
    db,
    "flowboard_card_attachments",
    card.id,
    metadata?.attachments,
    (entry, ordinal) => {
      db.prepare(
        `
          INSERT INTO flowboard_card_attachments
            (id, card_id, ordinal, file_name, byte_size, mime_type, note, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
      ).run(
        entry.id,
        entry.cardId,
        ordinal,
        entry.fileName,
        entry.byteSize,
        bindNull(entry.mimeType),
        bindNull(entry.note),
        entry.createdAt
      );
    }
  );
  insertChildren(
    db,
    "flowboard_card_diagnostics",
    card.id,
    metadata?.diagnostics,
    (entry, ordinal) => {
      db.prepare(
        `
          INSERT INTO flowboard_card_diagnostics
            (card_id, ordinal, kind, severity, title, detail, first_seen_at, last_seen_at, count, actions_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      ).run(
        card.id,
        ordinal,
        entry.kind,
        entry.severity,
        entry.title,
        entry.detail,
        entry.firstSeenAt,
        entry.lastSeenAt,
        entry.count,
        JSON.stringify(entry.actions)
      );
    }
  );
  insertChildren(
    db,
    "flowboard_card_notifications",
    card.id,
    metadata?.notifications,
    (entry, ordinal) => {
      db.prepare(
        `
          INSERT INTO flowboard_card_notifications
            (id, card_id, ordinal, kind, message, created_at, sequence, session_key, run_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      ).run(
        entry.id,
        card.id,
        ordinal,
        entry.kind,
        entry.message,
        entry.createdAt,
        bindNull(entry.sequence),
        bindNull(entry.sessionKey),
        bindNull(entry.runId)
      );
    }
  );
  insertChildren(db, "flowboard_worker_logs", card.id, metadata?.workerLogs, (entry, ordinal) => {
    db.prepare(
      `
        INSERT INTO flowboard_worker_logs
          (id, card_id, ordinal, level, message, created_at, session_key, run_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      entry.id,
      card.id,
      ordinal,
      entry.level,
      entry.message,
      entry.createdAt,
      bindNull(entry.sessionKey),
      bindNull(entry.runId)
    );
  });
  db.prepare("DELETE FROM flowboard_worker_protocol WHERE card_id = ?").run(card.id);
  if (metadata?.workerProtocol) {
    db.prepare(
      `
        INSERT INTO flowboard_worker_protocol (card_id, state, updated_at, detail)
        VALUES (?, ?, ?, ?)
      `
    ).run(
      card.id,
      metadata.workerProtocol.state,
      metadata.workerProtocol.updatedAt,
      bindNull(metadata.workerProtocol.detail)
    );
  }
}
var FlowboardSqliteCardStore = class {
  constructor(db) {
    this.db = db;
  }
  async register(key, value) {
    if (value.version !== 1 || value.card.id !== key) {
      throw new Error("invalid flowboard card payload");
    }
    runTransaction(this.db, () => insertCard(this.db, value.card));
  }
  async lookup(key) {
    const row = this.db.prepare("SELECT * FROM flowboard_cards WHERE id = ?").get(key);
    return row ? { version: 1, card: readCard(this.db, row) } : void 0;
  }
  async delete(key) {
    const result = runTransaction(this.db, () => {
      this.db.prepare(
        `
            DELETE FROM flowboard_attachment_blobs
            WHERE attachment_id IN (
              SELECT id FROM flowboard_card_attachments WHERE card_id = ?
            )
          `
      ).run(key);
      return this.db.prepare("DELETE FROM flowboard_cards WHERE id = ?").run(key);
    });
    return result.changes > 0;
  }
  async entries() {
    return this.db.prepare("SELECT * FROM flowboard_cards ORDER BY created_at ASC, id ASC").all().map((row) => ({
      key: requiredString(row, "id"),
      value: { version: 1, card: readCard(this.db, row) }
    }));
  }
};
var FlowboardSqliteBoardStore = class {
  constructor(db) {
    this.db = db;
  }
  async register(key, value) {
    if (value.version !== 1 || value.board.id !== key) {
      throw new Error("invalid flowboard board payload");
    }
    const board = value.board;
    this.db.prepare(
      `
          INSERT INTO flowboard_boards (
            id, name, description, icon, color, position, version, current_objective, core_value,
            source_of_truth, repository_url, planning_path, homepage_url,
            default_workspace_json, orchestration_json,
            created_at, updated_at, archived_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            description = excluded.description,
            icon = excluded.icon,
            color = excluded.color,
            position = excluded.position,
            version = excluded.version,
            current_objective = excluded.current_objective,
            core_value = excluded.core_value,
            source_of_truth = excluded.source_of_truth,
            repository_url = excluded.repository_url,
            planning_path = excluded.planning_path,
            homepage_url = excluded.homepage_url,
            default_workspace_json = excluded.default_workspace_json,
            orchestration_json = excluded.orchestration_json,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at,
            archived_at = excluded.archived_at
        `
    ).run(
      board.id,
      bindNull(board.name),
      bindNull(board.description),
      bindNull(board.icon),
      bindNull(board.color),
      bindNull(board.position),
      bindNull(board.version),
      bindNull(board.currentObjective),
      bindNull(board.coreValue),
      bindNull(board.sourceOfTruth),
      bindNull(board.repositoryUrl),
      bindNull(board.planningPath),
      bindNull(board.homepageUrl),
      jsonValue(board.defaultWorkspace),
      jsonValue(board.orchestration),
      board.createdAt,
      board.updatedAt,
      bindNull(board.archivedAt)
    );
  }
  async lookup(key) {
    const row = this.db.prepare("SELECT * FROM flowboard_boards WHERE id = ?").get(key);
    if (!row) {
      return void 0;
    }
    const defaultWorkspace = parseJson(row.default_workspace_json);
    const orchestration = parseJson(row.orchestration_json);
    return {
      version: 1,
      board: {
        id: requiredString(row, "id"),
        ...stringValue(row, "name") ? { name: stringValue(row, "name") } : {},
        ...stringValue(row, "description") ? { description: stringValue(row, "description") } : {},
        ...stringValue(row, "icon") ? { icon: stringValue(row, "icon") } : {},
        ...stringValue(row, "color") ? { color: stringValue(row, "color") } : {},
        ...numberValue(row, "position") !== void 0 ? { position: numberValue(row, "position") } : {},
        ...stringValue(row, "version") ? { version: stringValue(row, "version") } : {},
        ...stringValue(row, "current_objective") ? { currentObjective: stringValue(row, "current_objective") } : {},
        ...stringValue(row, "core_value") ? { coreValue: stringValue(row, "core_value") } : {},
        ...stringValue(row, "source_of_truth") ? { sourceOfTruth: stringValue(row, "source_of_truth") } : {},
        ...stringValue(row, "repository_url") ? { repositoryUrl: stringValue(row, "repository_url") } : {},
        ...stringValue(row, "planning_path") ? { planningPath: stringValue(row, "planning_path") } : {},
        ...stringValue(row, "homepage_url") ? { homepageUrl: stringValue(row, "homepage_url") } : {},
        ...defaultWorkspace ? { defaultWorkspace } : {},
        ...orchestration ? { orchestration } : {},
        createdAt: requiredNumber(row, "created_at"),
        updatedAt: requiredNumber(row, "updated_at"),
        ...numberValue(row, "archived_at") !== void 0 ? { archivedAt: numberValue(row, "archived_at") } : {}
      }
    };
  }
  async delete(key) {
    const result = this.db.prepare("DELETE FROM flowboard_boards WHERE id = ?").run(key);
    return result.changes > 0;
  }
  async entries() {
    const rows = this.db.prepare("SELECT id FROM flowboard_boards ORDER BY id ASC").all();
    const entries = [];
    for (const row of rows) {
      const key = requiredString(row, "id");
      const value = await this.lookup(key);
      if (value) {
        entries.push({ key, value });
      }
    }
    return entries;
  }
};
function readMilestone(row) {
  return {
    id: requiredString(row, "id"),
    boardId: requiredString(row, "board_id"),
    title: requiredString(row, "title"),
    position: requiredNumber(row, "position"),
    state: requiredString(row, "state"),
    createdAt: requiredNumber(row, "created_at"),
    updatedAt: requiredNumber(row, "updated_at"),
    ...stringValue(row, "description") ? { description: stringValue(row, "description") } : {},
    ...stringValue(row, "color") ? { color: stringValue(row, "color") } : {},
    ...numberValue(row, "completed_at") !== void 0 ? { completedAt: numberValue(row, "completed_at") } : {},
    ...numberValue(row, "archived_at") !== void 0 ? { archivedAt: numberValue(row, "archived_at") } : {}
  };
}
var FlowboardSqliteMilestoneStore = class {
  constructor(db) {
    this.db = db;
  }
  async register(key, value) {
    if (value.version !== 1 || value.milestone.id !== key) {
      throw new Error("invalid flowboard milestone payload");
    }
    const milestone = value.milestone;
    this.db.prepare(
      `
          INSERT INTO flowboard_milestones (
            id, board_id, title, description, color, position, state, created_at, updated_at,
            completed_at, archived_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            board_id = excluded.board_id,
            title = excluded.title,
            description = excluded.description,
            color = excluded.color,
            position = excluded.position,
            state = excluded.state,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at,
            completed_at = excluded.completed_at,
            archived_at = excluded.archived_at
        `
    ).run(
      milestone.id,
      milestone.boardId,
      milestone.title,
      bindNull(milestone.description),
      bindNull(milestone.color),
      milestone.position,
      milestone.state,
      milestone.createdAt,
      milestone.updatedAt,
      bindNull(milestone.completedAt),
      bindNull(milestone.archivedAt)
    );
  }
  async lookup(key) {
    const row = this.db.prepare("SELECT * FROM flowboard_milestones WHERE id = ?").get(key);
    return row ? { version: 1, milestone: readMilestone(row) } : void 0;
  }
  async delete(key) {
    const result = this.db.prepare("DELETE FROM flowboard_milestones WHERE id = ?").run(key);
    return result.changes > 0;
  }
  async entries() {
    return this.db.prepare("SELECT * FROM flowboard_milestones ORDER BY board_id ASC, position ASC, id ASC").all().map((row) => ({
      key: requiredString(row, "id"),
      value: { version: 1, milestone: readMilestone(row) }
    }));
  }
};
function readProjectDocument(row) {
  return {
    id: requiredString(row, "id"),
    boardId: requiredString(row, "board_id"),
    key: requiredString(row, "document_key"),
    section: requiredString(row, "section"),
    type: requiredString(row, "type"),
    title: requiredString(row, "title"),
    position: requiredNumber(row, "position"),
    createdAt: requiredNumber(row, "created_at"),
    updatedAt: requiredNumber(row, "updated_at"),
    ...stringValue(row, "summary") ? { summary: stringValue(row, "summary") } : {},
    ...stringValue(row, "target") ? { target: stringValue(row, "target") } : {},
    ...stringValue(row, "content") ? { content: stringValue(row, "content") } : {},
    ...numberValue(row, "hidden_at") !== void 0 ? { hiddenAt: numberValue(row, "hidden_at") } : {},
    ...numberValue(row, "system") === 1 ? { system: true } : {}
  };
}
var FlowboardSqliteProjectDocumentStore = class {
  constructor(db) {
    this.db = db;
  }
  async register(key, value) {
    if (value.version !== 1 || value.document.id !== key) {
      throw new Error("invalid flowboard project document payload");
    }
    const document = value.document;
    this.db.prepare(
      `
          INSERT INTO flowboard_project_documents (
            id, board_id, document_key, section, type, title, summary, target, content, position,
            hidden_at, system, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            board_id = excluded.board_id,
            document_key = excluded.document_key,
            section = excluded.section,
            type = excluded.type,
            title = excluded.title,
            summary = excluded.summary,
            target = excluded.target,
            content = excluded.content,
            position = excluded.position,
            hidden_at = excluded.hidden_at,
            system = excluded.system,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at
        `
    ).run(
      document.id,
      document.boardId,
      document.key,
      document.section,
      document.type,
      document.title,
      bindNull(document.summary),
      bindNull(document.target),
      bindNull(document.content),
      document.position,
      bindNull(document.hiddenAt),
      document.system ? 1 : 0,
      document.createdAt,
      document.updatedAt
    );
  }
  async lookup(key) {
    const row = this.db.prepare("SELECT * FROM flowboard_project_documents WHERE id = ?").get(key);
    return row ? { version: 1, document: readProjectDocument(row) } : void 0;
  }
  async delete(key) {
    const result = this.db.prepare("DELETE FROM flowboard_project_documents WHERE id = ?").run(key);
    return result.changes > 0;
  }
  async entries() {
    return this.db.prepare(
      "SELECT * FROM flowboard_project_documents ORDER BY board_id ASC, section ASC, position ASC, id ASC"
    ).all().map((row) => ({
      key: requiredString(row, "id"),
      value: { version: 1, document: readProjectDocument(row) }
    }));
  }
};
var FlowboardSqliteSubscriptionStore = class {
  constructor(db) {
    this.db = db;
  }
  async register(key, value) {
    if (value.version !== 1 || value.subscription.id !== key) {
      throw new Error("invalid flowboard notification subscription payload");
    }
    const subscription = value.subscription;
    this.db.prepare(
      `
          INSERT INTO flowboard_notification_subscriptions (
            id, board_id, card_id, session_key, run_id, target, event_kinds_json,
            last_event_at, last_event_id, last_event_sequence, delivered_event_ids_json,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            board_id = excluded.board_id,
            card_id = excluded.card_id,
            session_key = excluded.session_key,
            run_id = excluded.run_id,
            target = excluded.target,
            event_kinds_json = excluded.event_kinds_json,
            last_event_at = excluded.last_event_at,
            last_event_id = excluded.last_event_id,
            last_event_sequence = excluded.last_event_sequence,
            delivered_event_ids_json = excluded.delivered_event_ids_json,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at
        `
    ).run(
      subscription.id,
      subscription.boardId,
      bindNull(subscription.cardId),
      bindNull(subscription.sessionKey),
      bindNull(subscription.runId),
      bindNull(subscription.target),
      jsonValue(subscription.eventKinds),
      bindNull(subscription.lastEventAt),
      bindNull(subscription.lastEventId),
      bindNull(subscription.lastEventSequence),
      jsonValue(subscription.deliveredEventIds),
      subscription.createdAt,
      subscription.updatedAt
    );
  }
  async lookup(key) {
    const row = this.db.prepare("SELECT * FROM flowboard_notification_subscriptions WHERE id = ?").get(key);
    if (!row) {
      return void 0;
    }
    const eventKinds = parseJson(row.event_kinds_json);
    const deliveredEventIds = parseJson(row.delivered_event_ids_json);
    return {
      version: 1,
      subscription: {
        id: requiredString(row, "id"),
        boardId: requiredString(row, "board_id"),
        ...stringValue(row, "card_id") ? { cardId: stringValue(row, "card_id") } : {},
        ...stringValue(row, "session_key") ? { sessionKey: stringValue(row, "session_key") } : {},
        ...stringValue(row, "run_id") ? { runId: stringValue(row, "run_id") } : {},
        ...stringValue(row, "target") ? { target: stringValue(row, "target") } : {},
        ...eventKinds ? { eventKinds } : {},
        ...numberValue(row, "last_event_at") !== void 0 ? { lastEventAt: numberValue(row, "last_event_at") } : {},
        ...stringValue(row, "last_event_id") ? { lastEventId: stringValue(row, "last_event_id") } : {},
        ...numberValue(row, "last_event_sequence") !== void 0 ? { lastEventSequence: numberValue(row, "last_event_sequence") } : {},
        ...deliveredEventIds ? { deliveredEventIds } : {},
        createdAt: requiredNumber(row, "created_at"),
        updatedAt: requiredNumber(row, "updated_at")
      }
    };
  }
  async delete(key) {
    const result = this.db.prepare("DELETE FROM flowboard_notification_subscriptions WHERE id = ?").run(key);
    return result.changes > 0;
  }
  async entries() {
    const rows = this.db.prepare(
      "SELECT id FROM flowboard_notification_subscriptions ORDER BY created_at ASC, id ASC"
    ).all();
    const entries = [];
    for (const row of rows) {
      const key = requiredString(row, "id");
      const value = await this.lookup(key);
      if (value) {
        entries.push({ key, value });
      }
    }
    return entries;
  }
};
var FlowboardSqliteAttachmentStore = class {
  constructor(db) {
    this.db = db;
  }
  async register(key, value) {
    if (value.version !== 1 || value.attachment.id !== key) {
      throw new Error("invalid flowboard attachment payload");
    }
    const attachment = value.attachment;
    this.db.prepare(
      `
          INSERT INTO flowboard_attachment_blobs (attachment_id, content)
          VALUES (?, ?)
          ON CONFLICT(attachment_id) DO UPDATE SET content = excluded.content
        `
    ).run(attachment.id, asBlobContent(value.contentBase64));
  }
  async lookup(key) {
    const row = this.db.prepare(
      `
          SELECT a.*, b.content
          FROM flowboard_card_attachments a
          JOIN flowboard_attachment_blobs b ON b.attachment_id = a.id
          WHERE a.id = ?
        `
    ).get(key);
    if (!row) {
      return void 0;
    }
    return {
      version: 1,
      attachment: {
        id: requiredString(row, "id"),
        cardId: requiredString(row, "card_id"),
        createdAt: requiredNumber(row, "created_at"),
        fileName: requiredString(row, "file_name"),
        byteSize: requiredNumber(row, "byte_size"),
        ...stringValue(row, "mime_type") ? { mimeType: stringValue(row, "mime_type") } : {},
        ...stringValue(row, "note") ? { note: stringValue(row, "note") } : {}
      },
      contentBase64: blobToBase64(row.content)
    };
  }
  async delete(key) {
    const deleted = runTransaction(this.db, () => {
      this.db.prepare("DELETE FROM flowboard_attachment_blobs WHERE attachment_id = ?").run(key);
      return this.db.prepare("DELETE FROM flowboard_card_attachments WHERE id = ?").run(key);
    });
    return deleted.changes > 0;
  }
  async entries() {
    const rows = this.db.prepare(
      `
          SELECT a.id
          FROM flowboard_card_attachments a
          JOIN flowboard_attachment_blobs b ON b.attachment_id = a.id
          ORDER BY a.created_at ASC, a.id ASC
        `
    ).all();
    const entries = [];
    for (const row of rows) {
      const key = requiredString(row, "id");
      const value = await this.lookup(key);
      if (value) {
        entries.push({ key, value });
      }
    }
    return entries;
  }
};
function createFlowboardSqliteStores(options = {}) {
  const { db, maintenance } = createDatabase(
    options.dbPath ?? resolveFlowboardSqlitePath(options.env)
  );
  return {
    cards: new FlowboardSqliteCardStore(db),
    boards: new FlowboardSqliteBoardStore(db),
    milestones: new FlowboardSqliteMilestoneStore(db),
    documents: new FlowboardSqliteProjectDocumentStore(db),
    subscriptions: new FlowboardSqliteSubscriptionStore(db),
    attachments: new FlowboardSqliteAttachmentStore(db),
    // This connection-local primitive changes only after another connection commits.
    dataVersion: () => requiredNumber(db.prepare("PRAGMA data_version").get(), "data_version"),
    close: () => {
      maintenance.close();
      db.close();
    }
  };
}

// src/backend/doctor-contract-api.ts
var MAX_CARDS = 2e3;
function migrationEnv(params) {
  return { ...params.env, OPENCLAW_STATE_DIR: params.stateDir };
}
function openLegacyStore(params) {
  return params.context.openPluginStateKeyedStore({
    namespace: params.namespace,
    maxEntries: params.maxEntries,
    env: params.env
  });
}
function isPersistedCard(value) {
  return Boolean(
    value && typeof value === "object" && value.version === 1
  );
}
function isPersistedBoard(value) {
  return Boolean(
    value && typeof value === "object" && value.version === 1
  );
}
function isPersistedSubscription(value) {
  return Boolean(
    value && typeof value === "object" && value.version === 1
  );
}
function isPersistedAttachment(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value;
  const attachment = candidate.attachment;
  return candidate.version === 1 && attachment !== void 0 && typeof attachment === "object" && typeof attachment.id === "string" && typeof attachment.cardId === "string" && typeof attachment.fileName === "string" && typeof attachment.byteSize === "number" && typeof attachment.createdAt === "number" && typeof candidate.contentBase64 === "string";
}
async function migrateNamespace(params) {
  const warnings = [];
  let imported = 0;
  for (const entry of await params.legacy.entries()) {
    if (!params.isValid(entry.value)) {
      warnings.push(`Skipped malformed legacy Flowboard ${params.label} entry ${entry.key}`);
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
          `Skipped legacy Flowboard ${params.label} entry ${entry.key} because the SQLite target already exists`
        );
        continue;
      }
      await params.target.register(entry.key, entry.value);
      await params.legacy.delete(entry.key);
      imported++;
    } catch (err) {
      warnings.push(
        `Failed migrating legacy Flowboard ${params.label} entry ${entry.key}: ${String(err)}`
      );
    }
  }
  return { imported, warnings };
}
async function targetCardReferencesAttachment(cards, attachment) {
  const card = await cards.lookup(attachment.attachment.cardId);
  return Boolean(
    card?.version === 1 && card.card.metadata?.attachments?.some(
      (entry) => entry.id === attachment.attachment.id && entry.cardId === attachment.attachment.cardId
    )
  );
}
async function migrateAttachments(params) {
  const warnings = [];
  let imported = 0;
  for (const entry of await params.legacy.entries()) {
    if (!isPersistedAttachment(entry.value)) {
      warnings.push(`Skipped malformed legacy Flowboard attachment entry ${entry.key}`);
      continue;
    }
    if (!await targetCardReferencesAttachment(params.cards, entry.value)) {
      warnings.push(
        `Skipped legacy Flowboard attachment entry ${entry.key} because its owning card was not migrated or does not reference the attachment`
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
        `Skipped legacy Flowboard attachment entry ${entry.key} because the SQLite target already exists`
      );
      continue;
    }
    try {
      await params.target.register(entry.key, entry.value);
      await params.legacy.delete(entry.key);
      imported++;
    } catch (err) {
      warnings.push(
        `Failed migrating legacy Flowboard attachment entry ${entry.key}: ${String(err)}`
      );
    }
  }
  return { imported, warnings };
}
var stateMigrations = [
  {
    id: "flowboard-28-kv-to-sqlite",
    label: "Flowboard .28 plugin-state KV",
    async detectLegacyState(params) {
      const env = migrationEnv(params);
      const cards = await openLegacyStore({
        context: params.context,
        env,
        namespace: "flowboard.cards",
        maxEntries: MAX_CARDS
      }).entries();
      const boards = await openLegacyStore({
        context: params.context,
        env,
        namespace: "flowboard.boards",
        maxEntries: 200
      }).entries();
      const subscriptions = await openLegacyStore({
        context: params.context,
        env,
        namespace: "flowboard.notify",
        maxEntries: 2e3
      }).entries();
      const attachments = await openLegacyStore({
        context: params.context,
        env,
        namespace: "flowboard.attachments",
        maxEntries: MAX_CARDS * 21
      }).entries();
      const count = cards.length + boards.length + subscriptions.length + attachments.length;
      if (count === 0) {
        return null;
      }
      return {
        preview: [
          `- Flowboard: ${count} legacy .28 plugin-state KV ${count === 1 ? "entry" : "entries"} \u2192 ${resolveFlowboardSqlitePath(env)}`
        ]
      };
    },
    async migrateLegacyState(params) {
      const env = migrationEnv(params);
      const cards = openLegacyStore({
        context: params.context,
        env,
        namespace: "flowboard.cards",
        maxEntries: MAX_CARDS
      });
      const boards = openLegacyStore({
        context: params.context,
        env,
        namespace: "flowboard.boards",
        maxEntries: 200
      });
      const subscriptions = openLegacyStore({
        context: params.context,
        env,
        namespace: "flowboard.notify",
        maxEntries: 2e3
      });
      const attachments = openLegacyStore({
        context: params.context,
        env,
        namespace: "flowboard.attachments",
        maxEntries: MAX_CARDS * 21
      });
      const sqlite = createFlowboardSqliteStores({ env });
      try {
        const cardResult = await migrateNamespace({
          label: "card",
          legacy: cards,
          target: sqlite.cards,
          isValid: isPersistedCard
        });
        const boardResult = await migrateNamespace({
          label: "board",
          legacy: boards,
          target: sqlite.boards,
          isValid: isPersistedBoard
        });
        const subscriptionResult = await migrateNamespace({
          label: "notification subscription",
          legacy: subscriptions,
          target: sqlite.subscriptions,
          isValid: isPersistedSubscription
        });
        const attachmentResult = await migrateAttachments({
          legacy: attachments,
          cards: sqlite.cards,
          target: sqlite.attachments
        });
        const imported = cardResult.imported + boardResult.imported + subscriptionResult.imported + attachmentResult.imported;
        return {
          changes: imported > 0 ? [
            `Migrated ${imported} Flowboard .28 plugin-state KV ${imported === 1 ? "entry" : "entries"} \u2192 relational SQLite`
          ] : [],
          warnings: [
            ...cardResult.warnings,
            ...boardResult.warnings,
            ...subscriptionResult.warnings,
            ...attachmentResult.warnings
          ]
        };
      } finally {
        sqlite.close();
      }
    }
  }
];
export {
  stateMigrations
};
