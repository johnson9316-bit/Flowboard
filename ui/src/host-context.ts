import type { Locale } from "./i18n/index.ts";

export type TaskfoldLocale = Extract<Locale, "en" | "zh-CN">;

const CONTROL_UI_SETTINGS_PREFIX = "openclaw.control.settings.v1";
const CONTROL_UI_THEME_VARIABLES = [
  "--bg",
  "--bg-accent",
  "--bg-elevated",
  "--bg-hover",
  "--bg-muted",
  "--bg-content",
  "--panel",
  "--panel-strong",
  "--panel-hover",
  "--text",
  "--text-strong",
  "--muted",
  "--muted-strong",
  "--border",
  "--border-strong",
  "--border-hover",
  "--input",
  "--ring",
  "--accent",
  "--accent-hover",
  "--accent-muted",
  "--accent-subtle",
  "--accent-foreground",
  "--accent-glow",
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--danger",
  "--danger-muted",
  "--danger-subtle",
  "--destructive",
  "--destructive-foreground",
  "--font-body",
  "--font-display",
  "--control-ui-text-scale",
] as const;

export function resolveTaskfoldLocale(value: unknown): TaskfoldLocale | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  return value.trim().toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

export function hostLocaleFromSettings(value: unknown): TaskfoldLocale | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return resolveTaskfoldLocale((value as Record<string, unknown>).locale);
}

export function isControlUiSettingsKey(key: string | null): boolean {
  return typeof key === "string" && key.startsWith(CONTROL_UI_SETTINGS_PREFIX);
}

function readHostLocale(storage: Storage): TaskfoldLocale | null {
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!isControlUiSettingsKey(key)) {
        continue;
      }
      const raw = key ? storage.getItem(key) : null;
      if (!raw) {
        continue;
      }
      try {
        const locale = hostLocaleFromSettings(JSON.parse(raw));
        if (locale) {
          return locale;
        }
      } catch {
        // Ignore malformed or stale browser-local settings.
      }
    }
  } catch {
    // Sandboxed or privacy-restricted embeds cannot access the parent storage.
  }
  return null;
}

function parentWindow(): Window | null {
  if (typeof window === "undefined" || window.parent === window) {
    return null;
  }
  return window.parent;
}

function parentDocument(hostWindow: Window): Document | null {
  try {
    return hostWindow.document;
  } catch {
    return null;
  }
}

function parentStorage(hostWindow: Window): Storage | null {
  try {
    return hostWindow.localStorage;
  } catch {
    return null;
  }
}

function syncTheme(hostDocument: Document): void {
  if (typeof document === "undefined") {
    return;
  }
  const hostRoot = hostDocument.documentElement;
  const targetRoot = document.documentElement;
  const styles = hostDocument.defaultView?.getComputedStyle(hostRoot);
  if (!styles) {
    return;
  }

  for (const attribute of ["data-theme", "data-theme-mode"] as const) {
    const value = hostRoot.getAttribute(attribute);
    if (value) {
      targetRoot.setAttribute(attribute, value);
    } else {
      targetRoot.removeAttribute(attribute);
    }
  }

  for (const variable of CONTROL_UI_THEME_VARIABLES) {
    const value = styles.getPropertyValue(variable).trim();
    if (value) {
      targetRoot.style.setProperty(variable, value);
    } else {
      targetRoot.style.removeProperty(variable);
    }
  }

  const colorScheme = styles.colorScheme.trim();
  if (colorScheme && colorScheme !== "normal") {
    targetRoot.style.colorScheme = colorScheme;
  } else {
    targetRoot.style.removeProperty("color-scheme");
  }
}

export function readInitialTaskfoldHostLocale(): TaskfoldLocale | null {
  const hostWindow = parentWindow();
  if (!hostWindow) {
    return null;
  }
  const hostDocument = parentDocument(hostWindow);
  if (!hostDocument) {
    return null;
  }
  const storage = parentStorage(hostWindow);
  return (
    (storage ? readHostLocale(storage) : null) ??
    resolveTaskfoldLocale(hostDocument.documentElement.lang)
  );
}

export function startTaskfoldThemeSync(): () => void {
  const hostWindow = parentWindow();
  if (!hostWindow) {
    return () => {};
  }
  const hostDocument = parentDocument(hostWindow);
  if (!hostDocument) {
    return () => {};
  }

  const sync = () => {
    syncTheme(hostDocument);
  };

  sync();

  const observer =
    typeof MutationObserver === "undefined"
      ? null
      : new MutationObserver(() => {
          sync();
        });
  observer?.observe(hostDocument.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme", "data-theme-mode", "style"],
  });

  return () => {
    observer?.disconnect();
  };
}
