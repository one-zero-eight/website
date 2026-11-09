import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AskChatList } from "./AskChatList";

const transport = vi.hoisted(() => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  return fetch;
});
vi.mock("@/api/search/links.ts", () => ({
  SEARCH_API_URL: "http://localhost/search",
}));
vi.mock("@/api/helpers/access-token.ts", () => ({
  getMyAccessToken: () => "fixture-token",
  invalidateMyAccessToken: vi.fn(),
}));
vi.mock("./ask-session", () => ({
  useAskSession: () => ({ chatId: null }),
  openChat: vi.fn(),
  forgetChat: vi.fn(),
}));
vi.mock("@/components/toast", () => ({
  useToast: () => ({ showError: vi.fn() }),
}));

describe("chat list recovery", () => {
  let client: QueryClient;
  let root: Root;
  let container: HTMLDivElement;
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    transport
      .mockReset()
      .mockResolvedValueOnce(
        Response.json({ detail: "Unavailable" }, { status: 503 }),
      );
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() =>
      root.render(
        createElement(
          QueryClientProvider,
          { client },
          createElement(
            I18nProvider,
            { i18n: setupI18n({ locale: "en", messages: { en: {} } }) },
            createElement(AskChatList),
          ),
        ),
      ),
    );
  });
  afterEach(() => {
    act(() => root.unmount());
    client.clear();
    container.remove();
    vi.unstubAllGlobals();
  });

  it.each([false, true])(
    "recovers after a repeated failure to an empty list: %s",
    async (empty) => {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 30));
      });
      expect(container.textContent).toContain("Error 503: Unavailable");
      let finish!: (response: Response) => void;
      transport.mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          }),
      );
      const retry = container.querySelector<HTMLButtonElement>("button")!;
      act(() => retry.click());
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 30));
      });
      expect(retry.disabled).toBe(true);
      expect(retry.querySelector(".loading-spinner")).not.toBeNull();
      act(() => retry.click());
      expect(transport).toHaveBeenCalledTimes(2);
      await act(async () =>
        finish(Response.json({ detail: "Still unavailable" }, { status: 503 })),
      );
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 30));
      });
      expect(container.textContent).toContain("Still unavailable");
      expect(
        container.querySelector<HTMLButtonElement>("button")!.disabled,
      ).toBe(false);
      transport.mockResolvedValueOnce(
        Response.json(
          empty
            ? []
            : [
                {
                  chat_id: "chat-1",
                  title: "Exam rules",
                  created_at: "2026-01-01",
                  updated_at: "2026-01-01",
                },
              ],
        ),
      );
      act(() => container.querySelector<HTMLButtonElement>("button")!.click());
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 30));
      });
      expect(container.textContent).toContain(
        empty ? "No chats yet" : "Exam rules",
      );
      expect(container.textContent).not.toContain("Unavailable");
      expect(transport).toHaveBeenCalledTimes(3);
    },
  );
});
