import { createHash } from "node:crypto";
import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  FlowboardProjectDocumentSection,
  FlowboardProjectDocumentSource,
} from "../../contract/index.js";

export type FlowboardProjectDocumentCandidate = {
  key: string;
  relativePath: string;
  target: string;
  title: string;
  summary: string;
  section: FlowboardProjectDocumentSection;
  source: FlowboardProjectDocumentSource;
};

const MAX_DISCOVERED_DOCUMENTS = 500;
const MARKDOWN_EXTENSIONS = new Set([".md", ".markdown"]);
const EXCLUDED_DIRECTORIES = new Set([
  ".claude",
  ".git",
  ".github",
  ".next",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "tpm",
  "vendor",
]);
const INCLUDED_HIDDEN_DIRECTORIES = new Set([".planning", ".trae"]);
const EXTRA_DOCUMENT_PATHS = [
  ".github/copilot-instructions.md",
  ".claude/skills/deploy-test/SKILL.md",
  ".claude/skills/deploy-prod/SKILL.md",
] as const;

function isPathInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== "..");
}

function normalizedRelativePath(root: string, target: string): string {
  return path.relative(root, target).split(path.sep).join("/");
}

function isMarkdownPath(relativePath: string): boolean {
  return MARKDOWN_EXTENSIONS.has(path.extname(relativePath).toLocaleLowerCase());
}

function sourceForDocument(relativePath: string): FlowboardProjectDocumentSource {
  const normalized = relativePath.toLocaleLowerCase();
  if (
    normalized === ".github/copilot-instructions.md" ||
    normalized === ".claude/skills/deploy-test/skill.md" ||
    normalized === ".claude/skills/deploy-prod/skill.md" ||
    /^(?:[^/]+\/)?(?:agents|claude)\.md$/.test(normalized)
  ) {
    return "ai_system";
  }
  return "project";
}

function sectionForDocument(relativePath: string): FlowboardProjectDocumentSection {
  const normalized = relativePath.toLocaleLowerCase();
  if (normalized.startsWith(".planning/codebase/")) {
    return "codebase";
  }
  if (
    normalized.startsWith(".planning/intel/") ||
    /(?:^|\/)(?:deploy|deployment|environment|operations|ops|runbook)(?:\/|$)/.test(normalized)
  ) {
    return "environment";
  }
  if (normalized.startsWith(".planning/notes/") || normalized.startsWith(".planning/research/")) {
    return "knowledge";
  }
  return "project";
}

function candidateKey(relativePath: string, source: FlowboardProjectDocumentSource): string {
  if (source === "ai_system") {
    const normalized = relativePath
      .toLocaleLowerCase()
      .replace(/\.(?:md|markdown)$/i, "")
      .replace(/[\\/]+/g, ".")
      .replace(/[^a-z0-9._-]/g, "-")
      .replace(/^\.+/, "");
    return `ai.${normalized}`;
  }
  return `file.${createHash("sha256").update(relativePath).digest("hex").slice(0, 24)}`;
}

function candidateTitle(relativePath: string): string {
  return path.basename(relativePath).replace(/\.(?:md|markdown)$/i, "");
}

async function addCandidate(params: {
  root: string;
  relativePath: string;
  results: FlowboardProjectDocumentCandidate[];
  targets: Set<string>;
}): Promise<void> {
  if (params.results.length >= MAX_DISCOVERED_DOCUMENTS || !isMarkdownPath(params.relativePath)) {
    return;
  }
  const candidatePath = path.join(params.root, params.relativePath);
  let target: string;
  try {
    target = await fs.realpath(candidatePath);
  } catch {
    return;
  }
  if (!isPathInside(params.root, target) || params.targets.has(target)) {
    return;
  }
  let stat: Awaited<ReturnType<typeof fs.stat>>;
  try {
    stat = await fs.stat(target);
  } catch {
    return;
  }
  if (!stat.isFile()) {
    return;
  }
  const relativePath = normalizedRelativePath(params.root, target);
  const source = sourceForDocument(relativePath);
  params.results.push({
    key: candidateKey(relativePath, source),
    relativePath,
    target,
    title: candidateTitle(relativePath),
    summary: source === "ai_system" ? "AI instruction file." : relativePath,
    section: sectionForDocument(relativePath),
    source,
  });
  params.targets.add(target);
}

async function walkDirectory(params: {
  root: string;
  directory: string;
  relativeDirectory: string;
  results: FlowboardProjectDocumentCandidate[];
  targets: Set<string>;
}): Promise<void> {
  if (params.results.length >= MAX_DISCOVERED_DOCUMENTS) {
    return;
  }
  let entries: Dirent<string>[];
  try {
    entries = await fs.readdir(params.directory, { encoding: "utf8", withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries.toSorted(
    (left, right) =>
      Number(right.isFile()) - Number(left.isFile()) || left.name.localeCompare(right.name),
  )) {
    if (params.results.length >= MAX_DISCOVERED_DOCUMENTS || entry.isSymbolicLink()) {
      continue;
    }
    const relativePath = params.relativeDirectory
      ? path.join(params.relativeDirectory, entry.name)
      : entry.name;
    if (entry.isFile()) {
      await addCandidate({
        root: params.root,
        relativePath,
        results: params.results,
        targets: params.targets,
      });
      continue;
    }
    if (!entry.isDirectory()) {
      continue;
    }
    if (
      EXCLUDED_DIRECTORIES.has(entry.name) ||
      (entry.name.startsWith(".") && !INCLUDED_HIDDEN_DIRECTORIES.has(entry.name))
    ) {
      continue;
    }
    await walkDirectory({
      ...params,
      directory: path.join(params.directory, entry.name),
      relativeDirectory: relativePath,
    });
  }
}

export async function discoverFlowboardProjectDocuments(
  workspacePath: string,
): Promise<FlowboardProjectDocumentCandidate[]> {
  let root: string;
  try {
    root = await fs.realpath(workspacePath);
  } catch {
    throw new Error("project default workspace does not exist.");
  }
  let rootStat: Awaited<ReturnType<typeof fs.stat>>;
  try {
    rootStat = await fs.stat(root);
  } catch {
    throw new Error("project default workspace cannot be read.");
  }
  if (!rootStat.isDirectory()) {
    throw new Error("project default workspace must be a directory.");
  }

  const results: FlowboardProjectDocumentCandidate[] = [];
  const targets = new Set<string>();
  for (const relativePath of EXTRA_DOCUMENT_PATHS) {
    await addCandidate({ root, relativePath, results, targets });
  }
  await walkDirectory({
    root,
    directory: root,
    relativeDirectory: "",
    results,
    targets,
  });
  return results;
}
