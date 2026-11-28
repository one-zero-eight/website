import { afterEach, describe, expect, it, vi } from "vitest";
import { handleAskNotificationClick } from "@/service-worker/worker/ask-notifications.ts";

function createServiceWorkerScope(clients: unknown[] = []) {
  const openWindow = vi.fn();
  const matchAll = vi.fn().mockResolvedValue(clients);
  vi.stubGlobal("self", {
    location: { origin: "https://example.test" },
    clients: { matchAll, openWindow },
  });

  return {
    click(notification: { data: unknown; close: () => void }) {
      const waitUntil = vi.fn();
      handleAskNotificationClick({ notification, waitUntil } as never);
      return waitUntil.mock.calls[0]?.[0] as Promise<void> | undefined;
    },
    matchAll,
    openWindow,
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("ask notification service worker click handling", () => {
  it("ignores notifications that are not cAtIx answers", async () => {
    const { click, matchAll, openWindow } = createServiceWorkerScope();
    const close = vi.fn();

    const handling = click({
      data: { kind: "other", chatId: "chat-1" },
      close,
    });
    await handling;

    expect(close).not.toHaveBeenCalled();
    expect(matchAll).not.toHaveBeenCalled();
    expect(openWindow).not.toHaveBeenCalled();
  });

  it("messages and focuses a focused same-origin client without navigating it", async () => {
    const focusedClient = {
      url: "https://example.test/search/ask?chat=active",
      focused: true,
      postMessage: vi.fn(),
      focus: vi.fn().mockResolvedValue(undefined),
      navigate: vi.fn(),
    };
    const visibleClient = {
      url: "https://example.test/search/ask",
      focused: false,
      postMessage: vi.fn(),
      focus: vi.fn(),
    };
    const { click, matchAll, openWindow } = createServiceWorkerScope([
      visibleClient,
      focusedClient,
    ]);
    const close = vi.fn();

    const handling = click({
      data: { kind: "catix-answer", chatId: "chat 1" },
      close,
    });
    await handling;

    expect(close).toHaveBeenCalledOnce();
    expect(matchAll).toHaveBeenCalledWith({
      type: "window",
      includeUncontrolled: true,
    });
    expect(focusedClient.postMessage).toHaveBeenCalledWith({
      type: "catix-open-chat",
      chatId: "chat 1",
    });
    expect(focusedClient.focus).toHaveBeenCalledOnce();
    expect(focusedClient.navigate).not.toHaveBeenCalled();
    expect(visibleClient.postMessage).not.toHaveBeenCalled();
    expect(openWindow).not.toHaveBeenCalled();
  });

  it("uses a visible same-origin client when no client is focused", async () => {
    const visibleClient = {
      url: "https://example.test/search/ask",
      focused: false,
      visibilityState: "visible",
      postMessage: vi.fn(),
      focus: vi.fn().mockResolvedValue(undefined),
    };
    const hiddenClient = {
      url: "https://example.test/search/ask?chat=background",
      focused: false,
      visibilityState: "hidden",
      postMessage: vi.fn(),
      focus: vi.fn(),
    };
    const { click, openWindow } = createServiceWorkerScope([
      hiddenClient,
      visibleClient,
    ]);

    await click({
      data: { kind: "catix-answer", chatId: null },
      close: vi.fn(),
    });

    expect(visibleClient.postMessage).toHaveBeenCalledWith({
      type: "catix-open-chat",
      chatId: null,
    });
    expect(visibleClient.focus).toHaveBeenCalledOnce();
    expect(hiddenClient.postMessage).not.toHaveBeenCalled();
    expect(openWindow).not.toHaveBeenCalled();
  });

  it("opens an encoded same-origin ask URL when there is no client", async () => {
    const { click, openWindow } = createServiceWorkerScope();
    const chatId = "chat /?&雪";

    await click({ data: { kind: "catix-answer", chatId }, close: vi.fn() });

    const openedUrl = new URL(openWindow.mock.calls[0][0] as string);
    expect(openedUrl.origin).toBe("https://example.test");
    expect(openedUrl.pathname).toBe("/search/ask");
    expect(openedUrl.searchParams.get("chat")).toBe(chatId);
  });

  it("reuses a hidden window rather than opening a duplicate tab", async () => {
    const hiddenClient = {
      url: "https://example.test/dashboard",
      focused: false,
      visibilityState: "hidden",
      postMessage: vi.fn(),
      focus: vi.fn().mockResolvedValue(undefined),
    };
    const { click, openWindow } = createServiceWorkerScope([hiddenClient]);
    await click({
      data: { kind: "catix-answer", chatId: "chat-1" },
      close: vi.fn(),
    });
    expect(hiddenClient.postMessage).toHaveBeenCalledWith({
      type: "catix-open-chat",
      chatId: "chat-1",
    });
    expect(hiddenClient.focus).toHaveBeenCalledOnce();
    expect(openWindow).not.toHaveBeenCalled();
  });

  it("does not select cross-origin clients", async () => {
    const crossOriginClient = {
      url: "https://attacker.test/search/ask",
      focused: true,
      postMessage: vi.fn(),
      focus: vi.fn(),
    };
    const { click, openWindow } = createServiceWorkerScope([crossOriginClient]);

    await click({
      data: { kind: "catix-answer", chatId: null },
      close: vi.fn(),
    });

    expect(crossOriginClient.postMessage).not.toHaveBeenCalled();
    expect(crossOriginClient.focus).not.toHaveBeenCalled();
    expect(openWindow).toHaveBeenCalledWith("https://example.test/search/ask");
  });

  it("rejects malformed chat IDs without using notification data as a destination", async () => {
    const { click, matchAll, openWindow } = createServiceWorkerScope();
    const close = vi.fn();

    await click({
      data: { kind: "catix-answer", chatId: { url: "https://attacker.test" } },
      close,
    });

    expect(close).toHaveBeenCalledOnce();
    expect(matchAll).not.toHaveBeenCalled();
    expect(openWindow).not.toHaveBeenCalled();
  });
});
