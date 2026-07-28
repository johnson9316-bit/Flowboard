import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const activeFiles = [
  "openclaw.plugin.json",
  "package.json",
  "src/backend/index.ts",
  "src/backend/api.ts",
  "src/backend/runtime-api.ts",
  "src/backend/doctor-contract-api.ts",
  "src/ui-static.ts",
  "src/contract/index.ts",
  ...fs
    .readdirSync(path.join(root, "src/backend/src"), { recursive: true })
    .filter((entry) => typeof entry === "string" && entry.endsWith(".ts"))
    .map((entry) => path.join("src/backend/src", entry)),
];

const violations = [];
for (const relativePath of activeFiles) {
  const contents = fs.readFileSync(path.join(root, relativePath), "utf8");
  for (const [index, line] of contents.split(/\r?\n/).entries()) {
    if (!/\bworkboard\b/i.test(line)) {
      continue;
    }
    const allowedHostCompatibility =
      relativePath === "src/backend/src/dispatcher.ts" &&
      /^\s*ownerKind:\s*"workboard",\s*$/.test(line);
    if (!allowedHostCompatibility) {
      violations.push(`${relativePath}:${index + 1}: ${line.trim()}`);
    }
  }
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, "openclaw.plugin.json"), "utf8"));
const manifestText = JSON.stringify(manifest);
if (manifest.id !== "flowboard" || manifest.name !== "Flowboard") {
  violations.push("openclaw.plugin.json must expose id flowboard and name Flowboard.");
}
if (!manifestText.includes("flowboard.cards.list") || /\bworkboard[._]/i.test(manifestText)) {
  violations.push("openclaw.plugin.json contains an unmigrated public RPC name.");
}

if (violations.length) {
  console.error("Unmigrated public Workboard names found:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Checked ${activeFiles.length} active files: flowboard public names are isolated.`);
}
