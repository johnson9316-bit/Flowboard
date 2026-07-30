import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { TranslationMap } from "../ui/src/i18n/lib/types.ts";
import {
  resolveInitialTaskfoldLocale,
  type TaskfoldLocale,
} from "../ui/src/i18n/lib/translate.ts";

type TestI18nManager = {
  initialize(hostLocale?: unknown): Promise<boolean>;
  getLocale(): TaskfoldLocale;
  setLocale(locale: TaskfoldLocale): Promise<boolean>;
};

type TestI18nApi = {
  createI18nManager(
    loadLocaleTranslation: (locale: TaskfoldLocale) => Promise<TranslationMap | null>,
  ): TestI18nManager;
};

const LOCALE_STORAGE_KEY = "taskfold.i18n.locale";
const LEGACY_LOCALE_STORAGE_KEY = "flowboard.i18n.locale";
const TEST_I18N_API = Symbol.for("openclaw.i18nManagerTestApi");

class MemoryStorage {
  private readonly entries = new Map<string, string>();

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.entries.set(key, value);
  }
}

const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
let storage: MemoryStorage;

function createManager(
  loader: (locale: TaskfoldLocale) => Promise<TranslationMap | null>,
): TestI18nManager {
  const api = (globalThis as Record<PropertyKey, unknown>)[TEST_I18N_API] as TestI18nApi;
  return api.createI18nManager(loader);
}

beforeEach(() => {
  storage = new MemoryStorage();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
});

afterEach(() => {
  if (originalLocalStorage) {
    Object.defineProperty(globalThis, "localStorage", originalLocalStorage);
  } else {
    Reflect.deleteProperty(globalThis, "localStorage");
  }
});

describe("Taskfold i18n", () => {
  it("prefers a saved Taskfold language, then the one-time host locale, then browser locale", () => {
    expect(
      resolveInitialTaskfoldLocale({
        storedLocale: "en",
        hostLocale: "zh-CN",
        browserLocale: "zh-CN",
      }),
    ).toBe("en");
    expect(
      resolveInitialTaskfoldLocale({
        hostLocale: "zh-TW",
        browserLocale: "en-US",
      }),
    ).toBe("zh-CN");
    expect(resolveInitialTaskfoldLocale({ browserLocale: "zh-CN" })).toBe("zh-CN");
    expect(resolveInitialTaskfoldLocale({ browserLocale: "ja-JP" })).toBe("en");
  });

  it("persists the first successful host-derived locale as Taskfold's independent preference", async () => {
    const manager = createManager(async (locale) =>
      locale === "zh-CN" ? { taskfoldProject: { title: "项目" } } : null,
    );

    await expect(manager.initialize("zh-CN")).resolves.toBe(true);
    expect(manager.getLocale()).toBe("zh-CN");
    expect(storage.getItem(LOCALE_STORAGE_KEY)).toBe("zh-CN");
  });

  it("carries an existing Flowboard language preference into Taskfold once", async () => {
    storage.setItem(LEGACY_LOCALE_STORAGE_KEY, "zh-CN");
    const manager = createManager(async (locale) =>
      locale === "zh-CN" ? { taskfoldProject: { title: "项目" } } : null,
    );

    await expect(manager.initialize("en")).resolves.toBe(true);
    expect(manager.getLocale()).toBe("zh-CN");
    expect(storage.getItem(LOCALE_STORAGE_KEY)).toBe("zh-CN");
  });

  it("keeps the current language and preference when a language chunk cannot load", async () => {
    const manager = createManager(async () => null);

    await expect(manager.setLocale("zh-CN")).resolves.toBe(false);
    expect(manager.getLocale()).toBe("en");
    expect(storage.getItem(LOCALE_STORAGE_KEY)).toBeNull();
  });

  it("keeps only the latest asynchronous selection", async () => {
    let resolveChinese: ((value: TranslationMap | null) => void) | undefined;
    const manager = createManager(
      async (locale) =>
        await new Promise<TranslationMap | null>((resolve) => {
          if (locale === "zh-CN") {
            resolveChinese = resolve;
          } else {
            resolve(null);
          }
        }),
    );

    const chinese = manager.setLocale("zh-CN");
    await expect(manager.setLocale("en")).resolves.toBe(true);
    resolveChinese?.({ taskfoldProject: { title: "项目" } });

    await expect(chinese).resolves.toBe(false);
    expect(manager.getLocale()).toBe("en");
    expect(storage.getItem(LOCALE_STORAGE_KEY)).toBe("en");
  });
});
