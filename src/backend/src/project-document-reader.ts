import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  FlowboardProjectDocument,
  FlowboardProjectDocumentRead,
  FlowboardWorkspaceAccess,
} from "../../contract/index.js";
import { assertFlowboardWorkspaceSourceAccess } from "./workspace-access.js";

const MAX_PROJECT_DOCUMENT_BYTES = 1024 * 1024;
const MARKDOWN_EXTENSIONS = new Set([".md", ".markdown"]);

type ResolvedProjectDocumentFile = {
  content: string;
  bytes: Buffer;
  path: string;
  stat: Awaited<ReturnType<typeof fs.stat>>;
};

function documentRevision(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function decodeUtf8(bytes: Uint8Array): string {
  let content: string;
  try {
    content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("project document file is not valid UTF-8 text.");
  }
  if (content.includes("\0")) {
    throw new Error("project document file is not valid UTF-8 text.");
  }
  return content;
}

function encodeDocumentContent(content: unknown): Buffer {
  if (typeof content !== "string") {
    throw new Error("document content must be a string.");
  }
  const bytes = Buffer.from(content, "utf8");
  if (bytes.byteLength > MAX_PROJECT_DOCUMENT_BYTES) {
    throw new Error("project document content exceeds the 1 MiB limit.");
  }
  if (decodeUtf8(bytes) !== content) {
    throw new Error("document content is not valid UTF-8 text.");
  }
  return bytes;
}

function assertMarkdownPath(document: FlowboardProjectDocument): string {
  if (document.type !== "path" || !document.target) {
    throw new Error("only Markdown documents and Markdown file paths can be previewed.");
  }
  const fileName = path.basename(document.target).toLowerCase();
  if (fileName === ".env" || fileName.startsWith(".env.")) {
    throw new Error("environment files cannot be previewed as project documents.");
  }
  if (!MARKDOWN_EXTENSIONS.has(path.extname(document.target).toLowerCase())) {
    throw new Error("project document paths must reference a Markdown file.");
  }
  return document.target;
}

async function resolveProjectDocumentFile(params: {
  document: FlowboardProjectDocument;
  access: FlowboardWorkspaceAccess;
}): Promise<ResolvedProjectDocumentFile> {
  const target = assertMarkdownPath(params.document);
  let resolvedPath: string;
  try {
    resolvedPath = await fs.realpath(target);
  } catch {
    throw new Error("project document file does not exist.");
  }
  await assertFlowboardWorkspaceSourceAccess({ kind: "dir", path: resolvedPath }, params.access);
  let stat: Awaited<ReturnType<typeof fs.stat>>;
  try {
    stat = await fs.stat(resolvedPath);
  } catch {
    throw new Error("project document file cannot be read.");
  }
  if (!stat.isFile()) {
    throw new Error("project document path must reference a regular file.");
  }
  if (stat.size > MAX_PROJECT_DOCUMENT_BYTES) {
    throw new Error("project document file exceeds the 1 MiB preview limit.");
  }
  let bytes: Buffer;
  try {
    bytes = await fs.readFile(resolvedPath);
  } catch {
    throw new Error("project document file cannot be read.");
  }
  return { content: decodeUtf8(bytes), bytes, path: resolvedPath, stat };
}

export async function readFlowboardProjectDocument(params: {
  document: FlowboardProjectDocument;
  access: FlowboardWorkspaceAccess;
}): Promise<FlowboardProjectDocumentRead> {
  const { document } = params;
  if (document.type === "markdown") {
    const content = document.content ?? "";
    return {
      document,
      content,
      source: "stored",
      revision: `stored:${document.updatedAt}:${documentRevision(Buffer.from(content, "utf8"))}`,
    };
  }
  const file = await resolveProjectDocumentFile(params);
  return {
    document,
    content: file.content,
    source: "path",
    revision: documentRevision(file.bytes),
    path: file.path,
    modifiedAt: Math.trunc(Number(file.stat.mtimeMs)),
  };
}

export async function writeFlowboardProjectDocumentPath(params: {
  document: FlowboardProjectDocument;
  content: unknown;
  expectedRevision: unknown;
  access: FlowboardWorkspaceAccess;
}): Promise<FlowboardProjectDocumentRead> {
  if (!params.access.unrestricted && !params.access.writable) {
    throw new Error("project document workspace access is read-only.");
  }
  if (typeof params.expectedRevision !== "string" || !params.expectedRevision) {
    throw new Error("expected document revision is required.");
  }
  const content = encodeDocumentContent(params.content);
  const current = await resolveProjectDocumentFile(params);
  if (documentRevision(current.bytes) !== params.expectedRevision) {
    throw new Error("project document changed on disk; reload it before saving.");
  }

  const directory = path.dirname(current.path);
  const temporaryPath = path.join(
    directory,
    `.${path.basename(current.path)}.flowboard-${randomUUID()}.tmp`,
  );
  const originalMode = Number(current.stat.mode) & 0o7777;
  try {
    const handle = await fs.open(temporaryPath, "wx", originalMode);
    try {
      await handle.writeFile(content);
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fs.chmod(temporaryPath, originalMode);
    await fs.rename(temporaryPath, current.path);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
  return await readFlowboardProjectDocument({
    document: params.document,
    access: params.access,
  });
}
