import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");

describe("imported Workboard UI host", () => {
  it("uses the upstream page and live refresh instead of cards.list polling", () => {
    const main = fs.readFileSync(path.join(root, "ui/src/main.ts"), "utf8");
    const page = fs.readFileSync(path.join(root, "ui/src/pages/workboard/view.ts"), "utf8");

    expect(main).toContain('from "./pages/workboard/view.ts"');
    expect(main).toContain("flowboard.changes.wait");
    expect(main).not.toMatch(/setInterval\s*\(/);
    expect(page).toContain('from "../../lib/workboard/index.ts"');
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
