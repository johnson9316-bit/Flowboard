import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const upstreamRoot = path.join(root, ".upstream");

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(upstreamRoot, name), "utf8"));
}

function sourceFiles() {
  return fs
    .readFileSync(path.join(upstreamRoot, "workboard-files.tsv"), "utf8")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [filePath, sha1] = line.split("\t");
      return {
        upstreamPath: `extensions/workboard/src/${filePath}`,
        sha1,
        targetPath: filePath.endsWith(".test.ts") ? null : `src/backend/src/${filePath}`,
      };
    });
}

function contentsFiles(name) {
  return readJson(name).map((entry) => ({
    upstreamPath: entry.path,
    sha1: entry.sha,
    targetPath: entry.path,
  }));
}

function treeFiles(name, prefix) {
  return readJson(name).tree
    .filter((entry) => entry.type === "blob")
    .map((entry) => ({
      upstreamPath: `${prefix}/${entry.path}`,
      sha1: entry.sha,
      targetPath: `${prefix}/${entry.path}`,
    }));
}

const style = readJson("ui-workboard-css.json");
const manifest = {
  schemaVersion: 2,
  upstream: {
    repository: "https://github.com/openclaw/openclaw",
    commit: "78d6c6c0471723721243d67fb053f3810c622bf8",
    importedAt: "2026-07-28",
    sourceTrees: [
      {
        upstreamPath: "extensions/workboard/src",
        treeSha1: "e0915c21c775c83a67b9d8a9e3a147f75cf29870",
        files: sourceFiles(),
      },
      {
        upstreamPath: "packages/workboard-contract/src/index.ts",
        sha1: "f33f799d2f0476c4a72aad56ec736f1cd3209240",
        targetPath: "src/contract/index.ts",
      },
      {
        upstreamPath: "ui/src/pages/workboard",
        files: contentsFiles("ui-workboard-page-files.json"),
      },
      {
        upstreamPath: "ui/src/lib/workboard",
        files: contentsFiles("ui-workboard-lib-files.json"),
      },
      {
        upstreamPath: "ui/src/i18n/lib",
        files: treeFiles("ui-i18n-lib-tree.json", "ui/src/i18n/lib"),
      },
      {
        upstreamPath: "ui/src/i18n/locales",
        files: treeFiles("ui-i18n-locales-tree.json", "ui/src/i18n/locales"),
      },
      {
        upstreamPath: "ui/src/styles/workboard.css",
        sha1: style.sha,
        targetPath: style.path,
      },
    ],
  },
  adaptations: [
    "Renamed public registrations, RPCs, tools, commands, UI path, and persistence namespaces from workboard to flowboard.",
    "Added external-plugin manifest, Node 22 bundle, authenticated static Control UI route, and checked-in UI build output.",
    "Imported the fixed Workboard page, state, stylesheet, and all Control UI locale bundles; the standalone Lit host supplies the Gateway and minimal component context.",
    "The UI host maps internal workboard.* requests to flowboard.* and consumes flowboard.changes.wait to feed the upstream live-refresh state machine without cards.list polling.",
    "Adapted the fixed snapshot to OpenClaw 2026.7.1-2 public APIs: Node DatabaseSync SQLite opening, optional sandbox authority, no plugin event bus, and the host's fixed managed-worktree owner enum.",
  ],
};

fs.writeFileSync(
  path.join(root, "UPSTREAM-IMPORT.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
