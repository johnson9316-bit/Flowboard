import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");

describe("Taskfold M2 project UI host", () => {
  it("uses the project page and live refresh instead of cards.list polling", () => {
    const main = fs.readFileSync(path.join(root, "ui/src/main.ts"), "utf8");
    const page = fs.readFileSync(path.join(root, "ui/src/pages/projects/project-view.ts"), "utf8");

    expect(main).toContain('from "./pages/projects/project-view.ts"');
    expect(main).toContain("taskfold.changes.wait");
    expect(main).toContain("taskfold.projects.list");
    expect(main).toContain("taskfold.projects.get");
    expect(main).toContain("taskfold.cards.moveMilestone");
    expect(main).toContain("taskfold.cards.moveProject");
    expect(main).toContain('i18n.t("taskfoldProject.connectionRequired")');
    expect(main).toContain("readInitialTaskfoldHostLocale");
    expect(main).toContain("startTaskfoldThemeSync");
    expect(main).not.toContain("startTaskfoldHostSync");
    expect(main).not.toMatch(/setInterval\s*\(/);
    expect(page).toContain("taskfoldProject.unassigned");
    expect(page).toContain("draggable=");
    expect(page).toContain("taskfold-project__kanban");
    expect(page).toContain("taskfold-project__project-toolbar");
    expect(page).toContain("taskfold-project__language-select");
    expect(page).toContain('name="projectMode"');
    expect(page).toContain('name="workspacePath"');
    expect(page).not.toContain('name="initialMilestoneTitle"');
    expect(page).not.toContain("taskfold-project__sidebar");
    expect(page).toContain("?disabled=${controller.state.busy || !controller.connected}");
  });

  it("keeps every locale bundle registered and loadable", () => {
    const locales = path.join(root, "ui/src/i18n/locales");
    const registry = fs.readFileSync(path.join(root, "ui/src/i18n/lib/registry.ts"), "utf8");
    const translate = fs.readFileSync(path.join(root, "ui/src/i18n/lib/translate.ts"), "utf8");
    // en-agents.ts is a fragment en.ts pulls in, not a locale of its own.
    const files = fs
      .readdirSync(locales)
      .filter((name) => name.endsWith(".ts") && name !== "en-agents.ts");

    expect(files.length).toBeGreaterThan(20);
    for (const name of ["zh-CN.ts", "zh-TW.ts", "en.ts"]) {
      expect(files).toContain(name);
    }
    // en is the eager fallback bundle; every other locale ships only via the
    // registry's dynamic imports, so one nothing imports would silently vanish.
    expect(translate).toContain('import { en } from "../locales/en.ts"');
    for (const name of files.filter((name) => name !== "en.ts")) {
      expect(registry).toContain(`import("../locales/${name}")`);
    }
  });
});
