import { beforeAll, describe, expect, it, vi } from "vitest";

type TemplateLike = {
  strings: TemplateStringsArray;
  values: unknown[];
};

let createFlowboardProjectUiState: typeof import("../ui/src/pages/projects/project-view.ts")["createFlowboardProjectUiState"];
let renderFlowboardProjects: typeof import("../ui/src/pages/projects/project-view.ts")["renderFlowboardProjects"];
let i18n: typeof import("../ui/src/i18n/index.ts")["i18n"];

function templateText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(templateText).join("");
  }
  if (
    value &&
    typeof value === "object" &&
    Array.isArray((value as Partial<TemplateLike>).strings) &&
    Array.isArray((value as Partial<TemplateLike>).values)
  ) {
    const template = value as TemplateLike;
    return `${template.strings.join("")}${template.values.map(templateText).join("")}`;
  }
  return "";
}

beforeAll(async () => {
  class HTMLElementShim {}
  Object.assign(globalThis, {
    HTMLElement: HTMLElementShim,
    customElements: {
      define() {},
      get() {
        return undefined;
      },
    },
  });
  ({ createFlowboardProjectUiState, renderFlowboardProjects } = await import(
    "../ui/src/pages/projects/project-view.ts"
  ));
  ({ i18n } = await import("../ui/src/i18n/index.ts"));
});

function createController(setLocale = vi.fn()) {
  return {
    state: createFlowboardProjectUiState(),
    connected: true,
    locale: "en",
    requestUpdate: vi.fn(),
    refresh: vi.fn(),
    setLocale,
  };
}

describe("Flowboard project language selector", () => {
  it("renders English and Simplified Chinese beside the project actions", async () => {
    await i18n.setLocale("en", { persist: false });
    const controller = createController();
    const view = templateText(renderFlowboardProjects(controller as never));

    expect(view).toContain("flowboard-project__language-select");
    expect(view).toContain('value="zh-CN"');
    expect(view).toContain('value="en"');
    expect(view).toContain("Simplified Chinese");
    expect(view).toContain("New project");
  });

  it("binds selector changes and the loading disabled state", () => {
    const setLocale = vi.fn();
    const controller = createController(setLocale);
    controller.state.languageSwitching = true;
    const view = templateText(renderFlowboardProjects(controller as never));

    expect(view).toContain("@change=");
    expect(view).toContain("?disabled=");
    expect(controller.state.languageSwitching).toBe(true);
    expect(setLocale).not.toHaveBeenCalled();
  });
});
