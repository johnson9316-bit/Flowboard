import { createHash } from "node:crypto";
import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  TaskfoldProjectDocumentSection,
  TaskfoldProjectDocumentSource,
} from "../../contract/index.js";

export type TaskfoldProjectDocumentCandidate = {
  key: string;
  relativePath: string;
  target: string;
  title: string;
  summary: string;
  section: TaskfoldProjectDocumentSection;
  source: TaskfoldProjectDocumentSource;
};

const MAX_DISCOVERED_DOCUMENTS = 500;
const MARKDOWN_EXTENSIONS = new Set([".md", ".markdown"]);
const TOP_LEVEL_AI_INSTRUCTION_NAMES = new Set(["agents.md", "claude.md"]);
const EXCLUDED_TOP_LEVEL_AI_INSTRUCTION_DIRECTORIES = new Set([
  ".git",
  ".next",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "tpm",
  "vendor",
]);
const PLANNING_DOCUMENT_DIRECTORIES = new Set(["codebase", "intel", "notes", "research", "seeds"]);
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

function sourceForDocument(relativePath: string): TaskfoldProjectDocumentSource {
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

function sectionForDocument(relativePath: string): TaskfoldProjectDocumentSection {
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

function candidateKey(relativePath: string, source: TaskfoldProjectDocumentSource): string {
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

async function directoryEntries(directory: string): Promise<Dirent<string>[]> {
  try {
    return await fs.readdir(directory, { encoding: "utf8", withFileTypes: true });
  } catch {
    return [];
  }
}

async function addCandidate(params: {
  root: string;
  relativePath: string;
  results: TaskfoldProjectDocumentCandidate[];
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

async function addDirectoryMarkdownFiles(params: {
  root: string;
  relativeDirectory: string;
  results: TaskfoldProjectDocumentCandidate[];
  targets: Set<string>;
}): Promise<void> {
  const directory = path.join(params.root, params.relativeDirectory);
  const entries = await directoryEntries(directory);
  for (const entry of entries
    .filter((entry) => entry.isFile() && isMarkdownPath(entry.name))
    .toSorted((left, right) => left.name.localeCompare(right.name))) {
    await addCandidate({
      ...params,
      relativePath: path.join(params.relativeDirectory, entry.name),
    });
  }
}

async function addTopLevelModuleAiInstructions(params: {
  root: string;
  results: TaskfoldProjectDocumentCandidate[];
  targets: Set<string>;
}): Promise<void> {
  const entries = await directoryEntries(params.root);
  for (const entry of entries
    .filter(
      (entry) =>
        entry.isDirectory() &&
        !entry.isSymbolicLink() &&
        !entry.name.startsWith(".") &&
        !EXCLUDED_TOP_LEVEL_AI_INSTRUCTION_DIRECTORIES.has(entry.name),
    )
    .toSorted((left, right) => left.name.localeCompare(right.name))) {
    const moduleEntries = await directoryEntries(path.join(params.root, entry.name));
    for (const instruction of moduleEntries
      .filter(
        (moduleEntry) =>
          moduleEntry.isFile() &&
          TOP_LEVEL_AI_INSTRUCTION_NAMES.has(moduleEntry.name.toLocaleLowerCase()),
      )
      .toSorted((left, right) => left.name.localeCompare(right.name))) {
      await addCandidate({
        ...params,
        relativePath: path.join(entry.name, instruction.name),
      });
    }
  }
}

export async function resolveTaskfoldProjectDocumentWorkspacePath(
  workspacePath: string,
): Promise<string> {
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
  return root;
}

export function isTaskfoldProjectDocumentDiscoveryPath(
  workspaceRoot: string,
  target: string | undefined,
): boolean {
  if (!target || !path.isAbsolute(target)) {
    return false;
  }
  const root = path.resolve(workspaceRoot);
  const resolvedTarget = path.resolve(target);
  if (!isPathInside(root, resolvedTarget)) {
    return false;
  }
  const relativePath = normalizedRelativePath(root, resolvedTarget);
  if (!isMarkdownPath(relativePath)) {
    return false;
  }
  const segments = relativePath.split("/");
  if (segments.length === 1) {
    return true;
  }
  if (
    segments.length === 2 &&
    TOP_LEVEL_AI_INSTRUCTION_NAMES.has(segments[1]!.toLocaleLowerCase()) &&
    !segments[0]!.startsWith(".") &&
    !EXCLUDED_TOP_LEVEL_AI_INSTRUCTION_DIRECTORIES.has(segments[0]!)
  ) {
    return true;
  }
  if (segments.length === 2 && segments[0] === ".planning") {
    return true;
  }
  if (
    segments.length === 3 &&
    segments[0] === ".planning" &&
    PLANNING_DOCUMENT_DIRECTORIES.has(segments[1]!)
  ) {
    return true;
  }
  return EXTRA_DOCUMENT_PATHS.includes(relativePath as (typeof EXTRA_DOCUMENT_PATHS)[number]);
}

export async function discoverTaskfoldProjectDocuments(
  workspacePath: string,
): Promise<TaskfoldProjectDocumentCandidate[]> {
  const root = await resolveTaskfoldProjectDocumentWorkspacePath(workspacePath);
  const results: TaskfoldProjectDocumentCandidate[] = [];
  const targets = new Set<string>();
  const params = { root, results, targets };

  await addDirectoryMarkdownFiles({ ...params, relativeDirectory: "" });
  await addTopLevelModuleAiInstructions(params);
  await addDirectoryMarkdownFiles({ ...params, relativeDirectory: ".planning" });
  for (const directory of PLANNING_DOCUMENT_DIRECTORIES) {
    await addDirectoryMarkdownFiles({
      ...params,
      relativeDirectory: path.join(".planning", directory),
    });
  }
  for (const relativePath of EXTRA_DOCUMENT_PATHS) {
    await addCandidate({ ...params, relativePath });
  }
  return results;
}
