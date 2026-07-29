import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");

describe("Flowboard M2 project UI host", () => {
  it("uses the project page and live refresh instead of cards.list polling", () => {
    const main = fs.readFileSync(path.join(root, "ui/src/main.ts"), "utf8");
    const page = fs.readFileSync(path.join(root, "ui/src/pages/projects/project-view.ts"), "utf8");

    expect(main).toContain('from "./pages/projects/project-view.ts"');
    expect(main).toContain("flowboard.changes.wait");
    expect(main).toContain("flowboard.projects.list");
    expect(main).toContain("flowboard.projects.get");
    expect(main).toContain("flowboard.cards.moveMilestone");
    expect(main).toContain("flowboard.cards.moveProject");
    expect(main).toContain('i18n.t("flowboardProject.connectionRequired")');
    expect(main).not.toMatch(/setInterval\s*\(/);
    expect(page).toContain("flowboardProject.unassigned");
    expect(page).toContain("draggable=");
    expect(page).toContain("flowboard-project__kanban");
    expect(page).toContain("flowboard-project__project-toolbar");
    expect(page).not.toContain("flowboard-project__sidebar");
    expect(page).toContain("?disabled=${controller.state.busy || !controller.connected}");
  });

  it("keeps all imported locale bundles and their source metadata", () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(root, "UPSTREAM-IMPORT.json"), "utf8"),
    ) as { upstream: { sourceTrees: Array<{ upstreamPath: string; files?: unknown[] }> } };
    const locales = path.join(root, "ui/src/i18n/locales");

    expect(fs.existsSync(path.join(locales, "zh-CN.ts"))).toBe(true);
    expect(fs.existsSync(path.join(locales, "zh-TW.ts"))).toBe(true);
    expect(fs.existsSync(path.join(locales, "en.ts"))).toBe(true);
    expect(
      manifest.upstream.sourceTrees.find((entry) => entry.upstreamPath === "ui/src/i18n/locales")
        ?.files?.length,
    ).toBeGreaterThan(20);
  });
});
