import { beforeAll, describe, expect, it } from "vitest";

let createFlowboardProjectUiState: typeof import("../ui/src/pages/projects/project-view.ts")["createFlowboardProjectUiState"];
let reorderVisibleItemIds: typeof import("../ui/src/pages/projects/project-view.ts")["reorderVisibleItemIds"];

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
  ({ createFlowboardProjectUiState, reorderVisibleItemIds } = await import(
    "../ui/src/pages/projects/project-view.ts"
  ));
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

  it("reorders only visible entries while preserving hidden entries in the full request", () => {
    const allItems = [{ id: "first" }, { id: "hidden" }, { id: "last" }];
    const visibleItems = [allItems[0]!, allItems[2]!];

    expect(reorderVisibleItemIds(allItems, visibleItems, "last", -1)).toEqual([
      "last",
      "hidden",
      "first",
    ]);
    expect(reorderVisibleItemIds(allItems, visibleItems, "first", -1)).toBeUndefined();
  });
});
