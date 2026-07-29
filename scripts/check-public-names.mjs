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

const manifestPath = path.join(root, "openclaw.plugin.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const manifestText = JSON.stringify(manifest);
if (manifest.id !== "flowboard" || manifest.name !== "Flowboard") {
  violations.push("openclaw.plugin.json must expose id flowboard and name Flowboard.");
}
if (!manifestText.includes("flowboard.cards.list") || /\bworkboard[._]/i.test(manifestText)) {
  violations.push("openclaw.plugin.json contains an unmigrated public RPC name.");
}

// FLOWBOARD_TOOL_NAMES is the single source of truth for the tool surface. The
// manifest repeats it twice and the implementations a third time, so without this
// check a tool can be advertised without existing, or exist without being
// advertised, and nothing fails until runtime.
const toolNamesSource = fs.readFileSync(
  path.join(root, "src/backend/src/workspace-access.ts"),
  "utf8",
);
const toolNamesBlock = toolNamesSource.match(
  /export const FLOWBOARD_TOOL_NAMES = \[([\s\S]*?)\] as const;/,
);
if (!toolNamesBlock) {
  violations.push("workspace-access.ts no longer declares FLOWBOARD_TOOL_NAMES as a literal array.");
}
const toolNames = toolNamesBlock ? [...toolNamesBlock[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]) : [];

const implemented = new Set(
  fs
    .readdirSync(path.join(root, "src/backend/src"), { recursive: true })
    .filter((entry) => typeof entry === "string" && entry.endsWith(".ts"))
    .flatMap((entry) =>
      [
        ...fs
          .readFileSync(path.join(root, "src/backend/src", entry), "utf8")
          .matchAll(/^\s*name: "(flowboard_[a-z_]+)",$/gm),
      ].map((m) => m[1]),
    ),
);

function reportSetDifference(label, expected, actual) {
  const missing = expected.filter((name) => !actual.has(name));
  const extra = [...actual].filter((name) => !expected.includes(name));
  if (missing.length) {
    violations.push(`${label} is missing: ${missing.join(", ")}`);
  }
  if (extra.length) {
    violations.push(`${label} has entries absent from FLOWBOARD_TOOL_NAMES: ${extra.join(", ")}`);
  }
}

if (toolNames.length) {
  reportSetDifference("openclaw.plugin.json contracts.tools", toolNames, new Set(manifest.contracts?.tools ?? []));
  reportSetDifference("openclaw.plugin.json toolMetadata", toolNames, new Set(Object.keys(manifest.toolMetadata ?? {})));
  reportSetDifference("the registered tool implementations", toolNames, implemented);
}

if (process.argv.includes("--fix") && toolNames.length) {
  // Textual splice rather than a JSON round-trip: re-serializing the whole
  // manifest would reflow every hand-formatted block in it.
  const original = fs.readFileSync(manifestPath, "utf8");
  const replaceBlock = (text, key, body) => {
    const pattern = new RegExp(`("${key}": )(\\[[\\s\\S]*?\\n {4}\\]|\\{[\\s\\S]*?\\n {2}\\})`);
    if (!pattern.test(text)) {
      throw new Error(`could not locate the ${key} block in openclaw.plugin.json`);
    }
    return text.replace(pattern, `$1${body}`);
  };
  const toolsBody = `[\n${toolNames.map((name) => `      "${name}"`).join(",\n")}\n    ]`;
  const metadataBody = `{\n${toolNames
    .map((name) => `    "${name}": {\n      "optional": true\n    }`)
    .join(",\n")}\n  }`;
  const fixed = replaceBlock(replaceBlock(original, "tools", toolsBody), "toolMetadata", metadataBody);
  JSON.parse(fixed);
  fs.writeFileSync(manifestPath, fixed);
  console.log(`Rewrote openclaw.plugin.json tool surface from ${toolNames.length} source names.`);
  process.exit(0);
}

if (violations.length) {
  console.error("Public name audit failed:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  console.error("Run `npm run check:public-names -- --fix` to rewrite the manifest tool surface.");
  process.exitCode = 1;
} else {
  console.log(
    `Checked ${activeFiles.length} active files and ${toolNames.length} tool names: flowboard public names are isolated and the tool surface agrees.`,
  );
}
