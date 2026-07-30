import { describe, expect, it } from "vitest";
import { isValidTaskfoldBoardId } from "../src/contract/index.js";

describe("taskfold board IDs", () => {
  it("accepts the persisted board namespace format", () => {
    expect(isValidTaskfoldBoardId("default")).toBe(true);
    expect(isValidTaskfoldBoardId("release_2026.07")).toBe(true);
  });

  it("rejects unsafe board identifiers", () => {
    expect(isValidTaskfoldBoardId("../native")).toBe(false);
    expect(isValidTaskfoldBoardId("UPPERCASE")).toBe(false);
  });
});
