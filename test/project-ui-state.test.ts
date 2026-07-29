import { beforeAll, describe, expect, it } from "vitest";

let createFlowboardProjectUiState: typeof import("../ui/src/pages/projects/project-view.ts")["createFlowboardProjectUiState"];

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
  ({ createFlowboardProjectUiState } = await import("../ui/src/pages/projects/project-view.ts"));
});

describe("Flowboard M2 project UI state", () => {
  it("starts at the project overview with Unassigned-capable board state", () => {
    expect(createFlowboardProjectUiState()).toMatchObject({
      screen: "overview",
      selectedProjectId: null,
      project: null,
      modal: null,
      draggedCardId: null,
      showArchivedProjects: false,
      showHiddenDocuments: false,
    });
  });
});
