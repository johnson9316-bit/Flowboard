import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FlowboardProjectDocument } from "../src/contract/index.js";
import { readFlowboardProjectDocument } from "../src/backend/src/project-document-reader.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function createRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "flowboard-doc-reader-"));
  roots.push(root);
  return root;
}

function pathDocument(target: string): FlowboardProjectDocument {
  return {
    id: "document-1",
    boardId: "project-1",
    key: "project",
    section: "project",
    type: "path",
    title: "Project",
    target,
    position: 1024,
    createdAt: 1,
    updatedAt: 1,
  };
}

const unrestricted = { unrestricted: true } as const;

describe("Flowboard project document reader", () => {
  it("reads a saved Markdown path without storing its content", async () => {
    const root = createRoot();
    const target = path.join(root, "PROJECT.md");
    fs.writeFileSync(target, "# Project\n\nReadable content.\n");

    await expect(
      readFlowboardProjectDocument({ document: pathDocument(target), access: unrestricted }),
    ).resolves.toMatchObject({
      document: { id: "document-1" },
      content: "# Project\n\nReadable content.\n",
      source: "path",
      path: target,
    });
  });

  it("enforces the caller workspace after resolving symbolic links", async () => {
    const root = createRoot();
    const allowed = path.join(root, "allowed");
    const outside = path.join(root, "outside");
    fs.mkdirSync(allowed);
    fs.mkdirSync(outside);
    const outsideFile = path.join(outside, "SECRET.md");
    fs.writeFileSync(outsideFile, "# Not allowed\n");
    fs.symlinkSync(outsideFile, path.join(allowed, "linked.md"));

    await expect(
      readFlowboardProjectDocument({
        document: pathDocument(path.join(allowed, "linked.md")),
        access: { unrestricted: false, roots: [allowed], writable: false },
      }),
    ).rejects.toThrow("outside the caller's allowed workspaces");
  });

  it("rejects directories, environment files, non-Markdown, missing, oversized, and invalid UTF-8 paths", async () => {
    const root = createRoot();
    const directory = path.join(root, "docs.md");
    const env = path.join(root, ".env.local.md");
    const text = path.join(root, "notes.txt");
    const oversized = path.join(root, "large.md");
    const invalid = path.join(root, "invalid.md");
    fs.mkdirSync(directory);
    fs.writeFileSync(env, "TOKEN=not-read\n");
    fs.writeFileSync(text, "not markdown\n");
    fs.writeFileSync(oversized, Buffer.alloc(1024 * 1024 + 1, 65));
    fs.writeFileSync(invalid, Buffer.from([0xc3, 0x28]));

    await expect(
      readFlowboardProjectDocument({ document: pathDocument(directory), access: unrestricted }),
    ).rejects.toThrow("regular file");
    await expect(
      readFlowboardProjectDocument({ document: pathDocument(env), access: unrestricted }),
    ).rejects.toThrow("environment files");
    await expect(
      readFlowboardProjectDocument({ document: pathDocument(text), access: unrestricted }),
    ).rejects.toThrow("Markdown file");
    await expect(
      readFlowboardProjectDocument({
        document: pathDocument(path.join(root, "missing.md")),
        access: unrestricted,
      }),
    ).rejects.toThrow("does not exist");
    await expect(
      readFlowboardProjectDocument({ document: pathDocument(oversized), access: unrestricted }),
    ).rejects.toThrow("1 MiB");
    await expect(
      readFlowboardProjectDocument({ document: pathDocument(invalid), access: unrestricted }),
    ).rejects.toThrow("valid UTF-8");
  });

  it("preserves legacy stored Markdown but refuses non-readable document record types", async () => {
    const document = {
      ...pathDocument("/unused.md"),
      type: "markdown" as const,
      content: "# Historical note",
    };

    await expect(
      readFlowboardProjectDocument({ document, access: unrestricted }),
    ).resolves.toMatchObject({ source: "stored", content: "# Historical note" });
    await expect(
      readFlowboardProjectDocument({
        document: { ...document, type: "secret_ref", target: "secret://token" },
        access: unrestricted,
      }),
    ).rejects.toThrow("only Markdown documents");
  });
});
