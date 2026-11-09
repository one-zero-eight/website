import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AskNotificationButton } from "./AskNotificationButton";
import { isAskNotificationsEnabled } from "./ask-notifications";

const KEY = "catix-answer-notifications";
let permission: NotificationPermission;
let requestPermission: ReturnType<typeof vi.fn>;
let storageData: Map<string, string>;
let root: Root;
let container: HTMLDivElement;

function setNotificationSupport(supported: boolean) {
  Object.defineProperty(window, "isSecureContext", {
    configurable: true,
    value: true,
  });
  if (supported) {
    class MockNotification {
      static get permission() {
        return permission;
      }
      static requestPermission = requestPermission;
    }
    vi.stubGlobal("Notification", MockNotification);
  } else {
    Reflect.deleteProperty(window, "Notification");
  }
}

function render() {
  const i18n = setupI18n({ locale: "en", messages: { en: {} } });
  act(() => {
    root.render(
      createElement(
        I18nProvider,
        { i18n },
        createElement(AskNotificationButton),
      ),
    );
  });
}

function button() {
  return container.querySelector<HTMLButtonElement>("button")!;
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  permission = "default";
  requestPermission = vi.fn().mockImplementation(async () => {
    permission = "granted";
    return "granted";
  });
  storageData = new Map();
  const storage = {
    clear: () => storageData.clear(),
    getItem: (key: string) => storageData.get(key) ?? null,
    key: (index: number) => [...storageData.keys()][index] ?? null,
    removeItem: (key: string) => storageData.delete(key),
    setItem: (key: string, value: string) =>
      storageData.set(key, String(value)),
    get length() {
      return storageData.size;
    },
  } as unknown as Storage;
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: storage,
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
  localStorage.clear();
  setNotificationSupport(true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("isAskNotificationsEnabled", () => {
  it("requires secure context, notification support, granted permission and saved opt-in", () => {
    permission = "granted";
    localStorage.setItem(KEY, "enabled");
    expect(isAskNotificationsEnabled()).toBe(true);
    localStorage.removeItem(KEY);
    expect(isAskNotificationsEnabled()).toBe(false);
    localStorage.setItem(KEY, "enabled");
    permission = "default";
    expect(isAskNotificationsEnabled()).toBe(false);
    permission = "granted";
    Object.defineProperty(window, "isSecureContext", { value: false });
    expect(isAskNotificationsEnabled()).toBe(false);
    Object.defineProperty(window, "isSecureContext", { value: true });
    setNotificationSupport(false);
    expect(isAskNotificationsEnabled()).toBe(false);
  });
});

describe("AskNotificationButton", () => {
  it("does not prompt on mount and remains opt-in even if permission is granted", () => {
    permission = "granted";
    render();
    expect(requestPermission).not.toHaveBeenCalled();
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(button().textContent).toContain("Notify me when cAtIx replies");
  });

  it("enables after the direct click permission grant and can be disabled without another prompt", async () => {
    render();
    await act(async () => button().click());
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(KEY)).toBe("enabled");
    expect(button().textContent).toContain("Notifications on");
    expect(button().title).toBe("Turn off reply notifications");
    await act(async () => button().click());
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });

  it("does not request again after denial and explains how to unblock notifications", async () => {
    permission = "denied";
    render();
    await act(async () => button().click());
    expect(requestPermission).not.toHaveBeenCalled();
    expect(container.textContent).toContain(
      "Notifications are blocked. Allow them in your browser settings.",
    );
    expect(button().title).toBe(
      "Notifications are blocked. Allow them in your browser settings.",
    );
  });

  it("does not opt in when the permission prompt is dismissed", async () => {
    requestPermission.mockResolvedValue("default");
    render();
    await act(async () => button().click());
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(button().textContent).not.toContain("Notifications on");
  });

  it("hides the control when notifications are unsupported", () => {
    setNotificationSupport(false);
    render();
    expect(container.querySelector("button")).toBeNull();
  });

  it("shows a nonfatal error if permission request rejects", async () => {
    requestPermission.mockRejectedValue(new Error("blocked"));
    render();
    await act(async () => button().click());
    expect(container.textContent).toContain(
      "Could not update notification settings. Please try again.",
    );
  });

  it("shows a nonfatal error if saving the opt-in fails", async () => {
    permission = "granted";
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    render();
    await act(async () => button().click());
    expect(container.textContent).toContain(
      "Could not update notification settings. Please try again.",
    );
  });

  it("reflects external storage changes", () => {
    permission = "granted";
    render();
    localStorage.setItem(KEY, "enabled");
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: KEY })));
    expect(button().textContent).toContain("Notifications on");
    localStorage.removeItem(KEY);
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: KEY })));
    expect(button().textContent).toContain("Notify me when cAtIx replies");
  });

  it("refreshes browser permission and saved preference on focus and visibility", () => {
    permission = "granted";
    render();
    localStorage.setItem(KEY, "enabled");
    act(() => window.dispatchEvent(new Event("focus")));
    expect(button().textContent).toContain("Notifications on");
    permission = "denied";
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(button().textContent).toContain("Notify me when cAtIx replies");
    expect(container.textContent).toContain(
      "Notifications are blocked. Allow them in your browser settings.",
    );
  });

  it("ignores rapid repeated clicks while permission is pending", async () => {
    let resolvePermission!: (value: NotificationPermission) => void;
    requestPermission.mockReturnValue(
      new Promise((resolve) => {
        resolvePermission = resolve;
      }),
    );
    render();
    act(() => {
      button().click();
      button().click();
    });
    expect(requestPermission).toHaveBeenCalledTimes(1);
    await act(async () => resolvePermission("granted"));
    expect(localStorage.getItem(KEY)).toBe("enabled");
  });

  it("reports storage failure while disabling without losing the enabled state", async () => {
    permission = "granted";
    localStorage.setItem(KEY, "enabled");
    vi.spyOn(window.localStorage, "removeItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    render();
    await act(async () => button().click());
    expect(container.textContent).toContain(
      "Could not update notification settings. Please try again.",
    );
    expect(button().textContent).toContain("Notifications on");
  });
});
