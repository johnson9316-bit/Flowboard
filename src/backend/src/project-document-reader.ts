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

export async function readFlowboardProjectDocument(params: {
  document: FlowboardProjectDocument;
  access: FlowboardWorkspaceAccess;
}): Promise<FlowboardProjectDocumentRead> {
  const { document } = params;
  if (document.type === "markdown") {
    return {
      document,
      content: document.content ?? "",
      source: "stored",
    };
  }
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
  let resolvedPath: string;
  try {
    resolvedPath = await fs.realpath(document.target);
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
  let content: string;
  try {
    content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("project document file is not valid UTF-8 text.");
  }
  if (content.includes("\0")) {
    throw new Error("project document file is not valid UTF-8 text.");
  }
  return {
    document,
    content,
    source: "path",
    path: resolvedPath,
    modifiedAt: Math.trunc(stat.mtimeMs),
  };
}
