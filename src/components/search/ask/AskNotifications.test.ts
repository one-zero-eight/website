import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AskNotifications } from "./AskNotifications";

const app = vi.hoisted(() => ({
  pathname: "/search/ask",
  navigate: vi.fn(),
  showToast: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => app.navigate,
  useLocation: () => app.pathname,
}));
vi.mock("@/components/toast", () => ({
  useToast: () => ({ showToast: app.showToast }),
}));
vi.mock("./ask-session", () => ({ askAnswerReadyEvent: "catix-answer-ready" }));

const close = vi.fn();
const nativeNotification = vi.fn(function (this: {
  onclick: (() => void) | null;
  close: typeof close;
}) {
  this.onclick = null;
  this.close = close;
});

async function complete(
  needsApproval = false,
  chatId: string | null = "chat-1",
) {
  await act(async () => {
    window.dispatchEvent(
      new CustomEvent("catix-answer-ready", {
        detail: { chatId, needsApproval },
      }),
    );
  });
}

describe("reply notifications", () => {
  let root: Root;
  let container: HTMLDivElement;
  let worker: EventTarget & { getRegistration: ReturnType<typeof vi.fn> };
  const showNotification = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("localStorage", sessionStorage);
    vi.stubGlobal("isSecureContext", true);
    vi.stubGlobal(
      "Notification",
      Object.assign(nativeNotification, {
        permission: "granted",
        requestPermission: vi.fn(),
      }),
    );
    nativeNotification.mockClear();
    close.mockClear();
    localStorage.clear();
    localStorage.setItem("catix-answer-notifications", "enabled");
    app.pathname = "/search/ask";
    app.navigate.mockReset().mockResolvedValue(undefined);
    app.showToast.mockReset();
    vi.spyOn(document, "hasFocus").mockReturnValue(true);
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    vi.spyOn(window, "focus").mockImplementation(() => {});
    showNotification.mockReset().mockResolvedValue(undefined);
    worker = Object.assign(new EventTarget(), {
      getRegistration: vi
        .fn()
        .mockResolvedValue({ active: {}, showNotification }),
    });
    vi.stubGlobal("navigator", { serviceWorker: worker });
    container = document.createElement("div");
    root = createRoot(container);
  });

  function mount() {
    const i18n = setupI18n({ locale: "en", messages: { en: {} } });
    act(() =>
      root.render(
        createElement(I18nProvider, { i18n }, createElement(AskNotifications)),
      ),
    );
  }

  afterEach(() => {
    act(() => root.unmount());
    vi.restoreAllMocks();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("shows a toast on another page with an action opening the completed chat", async () => {
    app.pathname = "/dashboard";
    mount();
    await complete();
    expect(app.showToast).toHaveBeenCalledOnce();
    const toast = app.showToast.mock.calls[0][0];
    expect(toast.title).toBe("cAtIx replied");
    expect(toast.action.label).toBe("Open chat");
    await act(async () => toast.action.onClick());
    expect(app.navigate).toHaveBeenCalledWith({
      to: "/search/ask",
      search: { chat: "chat-1" },
    });
    expect(showNotification).not.toHaveBeenCalled();
    expect(nativeNotification).not.toHaveBeenCalled();
  });
  it("does not interrupt the user reading the chat", async () => {
    mount();
    await complete();
    expect(app.showToast).not.toHaveBeenCalled();
    expect(showNotification).not.toHaveBeenCalled();
    expect(nativeNotification).not.toHaveBeenCalled();
  });
  it.each(["hidden", "unfocused"])(
    "shows a private system notification when %s",
    async (state) => {
      if (state === "hidden")
        vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
      else vi.spyOn(document, "hasFocus").mockReturnValue(false);
      mount();
      await complete();
      expect(showNotification).toHaveBeenCalledExactlyOnceWith(
        "cAtIx replied",
        expect.objectContaining({
          body: "Open the chat to read the reply.",
          tag: "catix-answer-chat-1",
          data: { kind: "catix-answer", chatId: "chat-1" },
        }),
      );
      expect(nativeNotification).not.toHaveBeenCalled();
      expect(app.showToast).not.toHaveBeenCalled();
      expect(Notification.requestPermission).not.toHaveBeenCalled();
    },
  );
  it("distinguishes confirmation from a completed action", async () => {
    vi.spyOn(document, "hasFocus").mockReturnValue(false);
    mount();
    await complete(true);
    expect(showNotification.mock.calls[0][0]).toBe(
      "cAtIx is waiting for confirmation",
    );
  });
  it("uses a desktop notification when no worker is active, focusing and opening its chat on click", async () => {
    worker.getRegistration.mockResolvedValueOnce(undefined);
    vi.spyOn(document, "hasFocus").mockReturnValue(false);
    mount();
    await complete();
    expect(nativeNotification).toHaveBeenCalledOnce();
    const notification = nativeNotification.mock.instances[0];
    await act(async () => notification.onclick?.());
    expect(window.focus).toHaveBeenCalledOnce();
    expect(app.navigate).toHaveBeenCalledWith({
      to: "/search/ask",
      search: { chat: "chat-1" },
    });
    expect(close).toHaveBeenCalledOnce();
  });
  it("handles worker clicks without reloading the page", async () => {
    mount();
    await act(async () => {
      worker.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "catix-open-chat", chatId: "chat-2" },
        }),
      );
    });
    expect(app.navigate).toHaveBeenCalledExactlyOnceWith({
      to: "/search/ask",
      search: { chat: "chat-2" },
    });
  });
  it.each([
    { type: "unrelated", chatId: "chat-1" },
    { type: "catix-open-chat", chatId: { url: "https://example.org" } },
    null,
  ])("ignores unrelated or invalid worker messages: %j", async (data) => {
    mount();
    await act(async () => {
      worker.dispatchEvent(new MessageEvent("message", { data }));
    });
    expect(app.navigate).not.toHaveBeenCalled();
  });
  it.each(["disabled", "denied", "default", "unsupported", "insecure"])(
    "does not show or request system notifications when %s",
    async (state) => {
      vi.spyOn(document, "hasFocus").mockReturnValue(false);
      if (state === "disabled")
        localStorage.removeItem("catix-answer-notifications");
      if (state === "denied" || state === "default")
        Object.assign(Notification, { permission: state });
      if (state === "unsupported") vi.stubGlobal("Notification", undefined);
      if (state === "insecure") vi.stubGlobal("isSecureContext", false);
      mount();
      await complete();
      expect(showNotification).not.toHaveBeenCalled();
      expect(nativeNotification).not.toHaveBeenCalled();
      expect(worker.getRegistration).not.toHaveBeenCalled();
    },
  );
  it("contains browser delivery failures without an unhandled rejection", async () => {
    vi.spyOn(document, "hasFocus").mockReturnValue(false);
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    showNotification.mockRejectedValueOnce(
      new Error("OS notifications unavailable"),
    );
    mount();
    await complete();
    expect(warning).toHaveBeenCalledOnce();
    expect(app.showToast).not.toHaveBeenCalled();
  });
  it.each(["focused", "disabled", "unmounted"])(
    "does not deliver a delayed notification after becoming %s",
    async (state) => {
      vi.spyOn(document, "hasFocus").mockReturnValue(false);
      let finish!: (registration: unknown) => void;
      worker.getRegistration.mockReturnValueOnce(
        new Promise((resolve) => {
          finish = resolve;
        }),
      );
      mount();
      await complete();
      if (state === "focused")
        vi.spyOn(document, "hasFocus").mockReturnValue(true);
      if (state === "disabled")
        localStorage.removeItem("catix-answer-notifications");
      if (state === "unmounted") act(() => root.render(null));
      await act(async () => finish({ active: {}, showNotification }));
      expect(showNotification).not.toHaveBeenCalled();
      expect(nativeNotification).not.toHaveBeenCalled();
    },
  );
});
