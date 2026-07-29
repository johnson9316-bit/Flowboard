import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { createFlowboardSqliteStores } from "../src/backend/src/sqlite-store.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function createSchema3Database(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "flowboard-schema3-"));
  roots.push(root);
  const dbPath = path.join(root, "flowboard.sqlite");
  const db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE flowboard_schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
    ) STRICT;
    INSERT INTO flowboard_schema_migrations (id, applied_at) VALUES ('schema-3', 1);
    CREATE TABLE flowboard_boards (
      id TEXT PRIMARY KEY,
      name TEXT,
      description TEXT,
      icon TEXT,
      color TEXT,
      default_workspace_json TEXT,
      orchestration_json TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      archived_at INTEGER
    ) STRICT;
    CREATE TABLE flowboard_cards (
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
      position REAL NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    ) STRICT;
    CREATE TABLE flowboard_card_events (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      ordinal INTEGER NOT NULL,
      kind TEXT NOT NULL,
      at INTEGER NOT NULL,
      from_status TEXT,
      to_status TEXT,
      session_key TEXT,
      run_id TEXT
    ) STRICT;
  `);
  db.prepare(
    `
      INSERT INTO flowboard_cards
        (id, board_id, title, status, priority, position, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run("legacy-card", "default", "Legacy card", "done", "normal", 1024, 10, 20);
  db.close();
  return dbPath;
}

function createSchema4Database(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "flowboard-schema4-"));
  roots.push(root);
  const dbPath = path.join(root, "flowboard.sqlite");
  const db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE flowboard_schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
    ) STRICT;
    INSERT INTO flowboard_schema_migrations (id, applied_at) VALUES ('schema-4', 1);
    CREATE TABLE flowboard_cards (
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
      updated_at INTEGER NOT NULL
    ) STRICT;
    CREATE TABLE flowboard_card_events (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
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
    CREATE TABLE flowboard_project_documents (
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
  `);
  db.prepare(
    `
      INSERT INTO flowboard_project_documents (
        id, board_id, document_key, section, type, title, position, system, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    "legacy-document",
    "default",
    "legacy",
    "project",
    "markdown",
    "Legacy document",
    1024,
    0,
    10,
    20,
  );
  db.close();
  return dbPath;
}

describe("Flowboard SQLite schema migrations", () => {
  it("upgrades a schema-3 database without replacing old cards", async () => {
    const dbPath = createSchema3Database();
    const stores = createFlowboardSqliteStores({ dbPath });
    const legacy = await stores.cards.lookup("legacy-card");
    stores.close();

    const db = new DatabaseSync(dbPath);
    try {
      const columns = (table: string) =>
        (db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map(
          (row) => row.name,
        );
      const indexes = (table: string) =>
        (db.prepare(`PRAGMA index_list(${table})`).all() as Array<{ name: string }>).map(
          (row) => row.name,
        );

      expect(columns("flowboard_cards")).toEqual(expect.arrayContaining(["milestone_id"]));
      expect(columns("flowboard_card_events")).toEqual(
        expect.arrayContaining(["from_milestone_id", "to_milestone_id"]),
      );
      expect(columns("flowboard_boards")).toEqual(
        expect.arrayContaining([
          "position",
          "version",
          "current_objective",
          "core_value",
          "source_of_truth",
          "repository_url",
          "planning_path",
          "homepage_url",
        ]),
      );
      expect(columns("flowboard_milestones")).toEqual(
        expect.arrayContaining(["board_id", "position", "state"]),
      );
      expect(columns("flowboard_project_documents")).toEqual(
        expect.arrayContaining(["document_key", "section", "source", "type", "system"]),
      );
      expect(indexes("flowboard_cards")).toContain("flowboard_cards_board_milestone_position_idx");
      expect(
        db
          .prepare("SELECT id FROM flowboard_schema_migrations WHERE id = 'schema-6'")
          .get(),
      ).toBeTruthy();
      expect(legacy).toMatchObject({
        version: 1,
        card: { id: "legacy-card", title: "Legacy card", status: "done" },
      });
    } finally {
      db.close();
    }
  });

  it("upgrades schema-4 databases with delivery and source-reference tables", async () => {
    const dbPath = createSchema4Database();
    const stores = createFlowboardSqliteStores({ dbPath });
    const legacyDocument = await stores.documents.lookup("legacy-document");
    stores.close();

    const db = new DatabaseSync(dbPath);
    try {
      const tables = (db.prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
      ).all() as Array<{ name: string }>).map((row) => row.name);

      expect(tables).toEqual(
        expect.arrayContaining([
          "flowboard_card_delivery",
          "flowboard_card_source_references",
        ]),
      );
      expect(
        db
          .prepare("SELECT id FROM flowboard_schema_migrations WHERE id = 'schema-6'")
          .get(),
      ).toBeTruthy();
      expect(legacyDocument).toMatchObject({
        document: { id: "legacy-document", source: "project" },
      });
    } finally {
      db.close();
    }
  });
});
