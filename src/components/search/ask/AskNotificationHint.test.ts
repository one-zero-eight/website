import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AskNotificationHint } from "./AskNotificationHint";
import { isAskNotificationsEnabled } from "./ask-notifications";

const KEY = "catix-answer-notifications";
const DISMISSED_KEY = "catix-answer-notifications-dismissed";
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
      createElement(I18nProvider, { i18n }, createElement(AskNotificationHint)),
    );
  });
}

function button(label: string) {
  return [...container.querySelectorAll("button")].find(
    (candidate) => candidate.textContent === label,
  )!;
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

describe("AskNotificationHint", () => {
  it("offers the notifications without prompting on mount", () => {
    render();
    expect(requestPermission).not.toHaveBeenCalled();
    expect(container.textContent).toContain(
      "Get a notification when catix replies?",
    );
  });

  it("enables after the direct click permission grant and closes", async () => {
    render();
    await act(async () => button("Enable").click());
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(KEY)).toBe("enabled");
    expect(container.textContent).toBe("");
  });

  it("opts in without another prompt when the permission is already granted", async () => {
    permission = "granted";
    render();
    await act(async () => button("Enable").click());
    expect(requestPermission).not.toHaveBeenCalled();
    expect(localStorage.getItem(KEY)).toBe("enabled");
  });

  it("keeps the hint when the permission prompt is dismissed", async () => {
    requestPermission.mockResolvedValue("default");
    render();
    await act(async () => button("Enable").click());
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(button("Enable")).toBeDefined();
  });

  it("closes without opting in when the permission is denied in the prompt", async () => {
    requestPermission.mockResolvedValue("denied");
    render();
    await act(async () => button("Enable").click());
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(container.textContent).toBe("");
  });

  it('snoozes after "Not now" and offers again an hour later', () => {
    render();
    act(() => button("Not now").click());
    expect(localStorage.getItem(DISMISSED_KEY)).not.toBeNull();
    expect(container.textContent).toBe("");
    act(() => root.unmount());
    root = createRoot(container);
    render();
    expect(container.textContent).toBe("");
    act(() => root.unmount());
    root = createRoot(container);
    const twoHoursMs = 2 * 60 * 60 * 1000;
    localStorage.setItem(DISMISSED_KEY, String(Date.now() - twoHoursMs));
    render();
    expect(container.textContent).toContain("Get a notification");
  });

  it.each([
    ["blocked", () => (permission = "denied")],
    [
      "already on",
      () => {
        permission = "granted";
        localStorage.setItem(KEY, "enabled");
      },
    ],
    ["unsupported", () => setNotificationSupport(false)],
  ])("is hidden when notifications are %s", (_name, arrange) => {
    arrange();
    render();
    expect(container.textContent).toBe("");
  });

  it("shows a nonfatal error if permission request rejects", async () => {
    requestPermission.mockRejectedValue(new Error("blocked"));
    render();
    await act(async () => button("Enable").click());
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
    await act(async () => button("Enable").click());
    expect(container.textContent).toContain(
      "Could not update notification settings. Please try again.",
    );
  });
});
