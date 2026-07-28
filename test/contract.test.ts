import { describe, expect, it } from "vitest";
import { isValidFlowboardBoardId } from "../src/contract/index.js";

describe("flowboard board IDs", () => {
  it("accepts the persisted board namespace format", () => {
    expect(isValidFlowboardBoardId("default")).toBe(true);
    expect(isValidFlowboardBoardId("release_2026.07")).toBe(true);
  });

  it("rejects unsafe board identifiers", () => {
    expect(isValidFlowboardBoardId("../native")).toBe(false);
    expect(isValidFlowboardBoardId("UPPERCASE")).toBe(false);
  });
});
