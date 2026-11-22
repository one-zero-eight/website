import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AskAnnouncements, AskAnnouncementsItem } from "./AskAnnouncements";
import { ANNOUNCEMENTS_SEEN_KEY } from "./ask-announcements";

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
vi.mock("@/components/toast", () => ({
  useToast: () => ({ showError: vi.fn() }),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: unknown }) => children,
}));

const announcement = (id: number) => ({
  id,
  kind: "announcement",
  subject: `Subject ${id}`,
  summary: "Summary",
  starts_at: "2026-11-08T23:30:00+03:00",
  ends_at: null,
  end_suggested: false,
  all_day: false,
  room: null,
  found_at: "2026-11-01T10:00:00+03:00",
  source: {
    chat_title: "Chat",
    link: null,
    sent_at: "2026-11-01T09:00:00+03:00",
    sender_name: null,
    text: "Text",
  },
});

describe("announcements chat", () => {
  let client: QueryClient;
  let root: Root;
  let container: HTMLDivElement;
  const render = (component: typeof AskAnnouncements, props = {}) =>
    act(() =>
      root.render(
        createElement(
          QueryClientProvider,
          { client },
          createElement(
            I18nProvider,
            { i18n: setupI18n({ locale: "en", messages: { en: {} } }) },
            createElement(component as never, props),
          ),
        ),
      ),
    );
  const settle = () =>
    act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
    });

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    localStorage.clear();
    transport.mockReset().mockImplementation((request: Request) =>
      Promise.resolve(
        request.method === "POST"
          ? Response.json({
              change_id: 5,
              action: "added",
              title: "Анонс: X",
            })
          : Response.json([5, 6, 7].map(announcement)),
      ),
    );
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    client.clear();
    container.remove();
    vi.unstubAllGlobals();
  });

  it("counts unread items until the chat is opened", async () => {
    render(AskAnnouncementsItem as never, { isOpen: false, onOpen: vi.fn() });
    await settle();
    expect(container.querySelector(".badge")?.textContent).toBe("3");

    render(AskAnnouncements);
    await settle();
    expect(localStorage.getItem(ANNOUNCEMENTS_SEEN_KEY)).toBe("7");

    render(AskAnnouncementsItem as never, { isOpen: false, onOpen: vi.fn() });
    await settle();
    expect(container.querySelector(".badge")).toBeNull();
  });

  it("applies an announcement to the calendar", async () => {
    render(AskAnnouncements);
    await settle();
    const button = [...container.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Add to my calendar"),
    );
    await act(async () => button?.click());
    await settle();
    const post = transport.mock.calls
      .map(([request]) => request as Request)
      .find((request) => request.method === "POST");
    expect(post?.url).toBe("http://localhost/search/announcements/5/calendar");
    expect(container.textContent).toContain(
      "✅ Added to your calendar: Анонс: X",
    );
  });
});
