import fs from "node:fs/promises";
import path from "node:path";

export type FlowboardAiInstructionCandidate = {
  key: string;
  relativePath: string;
  target: string;
  title: string;
  summary: string;
};

const ROOT_INSTRUCTION_FILES = ["AGENTS.md", "CLAUDE.md"] as const;
const DEPLOYMENT_SKILL_FILES = [
  ".claude/skills/deploy-test/SKILL.md",
  ".claude/skills/deploy-prod/SKILL.md",
] as const;
const EXCLUDED_MODULE_DIRECTORIES = new Set([
  ".claude",
  ".git",
  ".next",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "vendor",
]);

function isPathInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== "..");
}

function candidateKey(relativePath: string): string {
  const normalized = relativePath
    .toLocaleLowerCase()
    .replace(/\.md$/i, "")
    .replace(/[\\/]+/g, ".")
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/^\.+/, "");
  return `ai.${normalized}`;
}

function candidateTitle(relativePath: string): string {
  return relativePath.startsWith(".claude/skills/")
    ? relativePath.replace(".claude/skills/", "").replace("/SKILL.md", " skill")
    : relativePath;
}

async function addCandidate(params: {
  root: string;
  relativePath: string;
  result: FlowboardAiInstructionCandidate[];
}): Promise<void> {
  const candidate = path.join(params.root, params.relativePath);
  let target: string;
  try {
    target = await fs.realpath(candidate);
  } catch {
    return;
  }
  if (!isPathInside(params.root, target)) {
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
  params.result.push({
    key: candidateKey(params.relativePath),
    relativePath: params.relativePath,
    target,
    title: candidateTitle(params.relativePath),
    summary: params.relativePath.startsWith(".claude/skills/")
      ? "Managed deployment skill."
      : "AI instruction entry point.",
  });
}

export async function discoverFlowboardAiInstructions(
  workspacePath: string,
): Promise<FlowboardAiInstructionCandidate[]> {
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

  const result: FlowboardAiInstructionCandidate[] = [];
  for (const fileName of ROOT_INSTRUCTION_FILES) {
    await addCandidate({ root, relativePath: fileName, result });
  }
  let entries: Array<{ name: string; isDirectory: () => boolean }>;
  try {
    entries = await fs.readdir(root, { encoding: "utf8", withFileTypes: true });
  } catch {
    throw new Error("project default workspace cannot be read.");
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || EXCLUDED_MODULE_DIRECTORIES.has(entry.name)) {
      continue;
    }
    for (const fileName of ROOT_INSTRUCTION_FILES) {
      await addCandidate({
        root,
        relativePath: path.join(entry.name, fileName),
        result,
      });
    }
  }
  for (const relativePath of DEPLOYMENT_SKILL_FILES) {
    await addCandidate({ root, relativePath, result });
  }
  return result;
}
