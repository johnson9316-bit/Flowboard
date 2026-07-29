import { describe, expect, it } from "vitest";
import {
  hostLocaleFromSettings,
  isControlUiSettingsKey,
  resolveFlowboardLocale,
} from "../ui/src/host-context.ts";

describe("Flowboard host context", () => {
  it("limits the embedded M2 UI to Chinese and English", () => {
    expect(resolveFlowboardLocale("zh-CN")).toBe("zh-CN");
    expect(resolveFlowboardLocale("zh-TW")).toBe("zh-CN");
    expect(resolveFlowboardLocale("ja-JP")).toBe("en");
    expect(resolveFlowboardLocale("")).toBeNull();
  });

  it("reads the Control UI locale from its browser-local settings payload", () => {
    expect(hostLocaleFromSettings({ locale: "zh-CN" })).toBe("zh-CN");
    expect(hostLocaleFromSettings({ locale: "de" })).toBe("en");
    expect(hostLocaleFromSettings({})).toBeNull();
  });

  it("identifies only Control UI settings storage keys", () => {
    expect(isControlUiSettingsKey("openclaw.control.settings.v1")).toBe(true);
    expect(isControlUiSettingsKey("openclaw.control.settings.v1:local")).toBe(true);
    expect(isControlUiSettingsKey("flowboard.i18n.locale")).toBe(false);
  });
});
