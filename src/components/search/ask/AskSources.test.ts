import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AskSources } from "./AskSources";

const query = vi.hoisted(() => vi.fn());
vi.mock("@/api/search", () => ({ $search: { useQuery: query } }));
vi.mock("@/components/common/AuthWall", () => ({
  RequireAuth: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/components/search/SourceRequests", () => ({
  SourceRequests: () =>
    createElement("button", { type: "button" }, "Propose a chat"),
}));

const sources = {
  verified_groups: ["B24-DS-01", "M26-SE-02"],
  sources: [
    {
      chat_id: "-1001",
      title: "Study forum",
      group_code: "B24-DS-01",
      forum: true,
      default_mode: "search",
      topics: [
        { topic_id: "1", title: "General", mode: "search" },
        { topic_id: "42", title: "Announcements", mode: "store" },
      ],
      has_stored_messages: true,
    },
    {
      chat_id: "-1002",
      title: "Common chat",
      group_code: "all",
      forum: false,
      default_mode: "off",
      topics: [],
      has_stored_messages: true,
    },
  ],
};

function render() {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const i18n = setupI18n({ locale: "en", messages: { en: {} } });
  act(() =>
    root.render(
      createElement(I18nProvider, { i18n }, createElement(AskSources)),
    ),
  );
  return { container, root };
}

describe("AskSources", () => {
  let rendered: ReturnType<typeof render>;
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    query.mockReset().mockReturnValue({
      data: undefined,
      isPending: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    });
    rendered = render();
  });
  afterEach(() => {
    act(() => rendered.root.unmount());
    rendered.container.remove();
    vi.unstubAllGlobals();
  });

  it("loads and shows verified groups, source modes, forum topics, and stored-history notes", () => {
    query.mockReturnValue({
      data: sources,
      isPending: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    });
    act(() =>
      rendered.root.render(
        createElement(
          I18nProvider,
          { i18n: setupI18n({ locale: "en", messages: { en: {} } }) },
          createElement(AskSources),
        ),
      ),
    );
    act(() =>
      rendered.container.querySelector<HTMLButtonElement>("button")!.click(),
    );
    expect(document.body.textContent).toContain("B24-DS-01");
    expect(document.body.textContent).toContain("M26-SE-02");
    expect(document.body.textContent).toContain("Study forum");
    expect(document.body.textContent).toContain("Searching on request");
    expect(document.body.textContent).toContain("Announcements");
    expect(document.body.textContent).toContain("Saving messages");
    expect(document.body.textContent).toContain("Disabled");
    expect(document.body.textContent).toContain(
      "Saved message history remains searchable",
    );
    expect(document.body.textContent).toContain("Propose a chat");
    expect(document.body.textContent!.indexOf("Propose a chat")).toBeLessThan(
      document.body.textContent!.indexOf("Verified study groups"),
    );
    expect(query).toHaveBeenCalledWith(
      "get",
      "/sources",
      undefined,
      expect.objectContaining({
        gcTime: 0,
        staleTime: 0,
        refetchOnMount: "always",
      }),
    );
  });

  it("explains unknown group verification and restricts the panel to common sources", () => {
    query.mockReturnValue({
      data: { verified_groups: [], sources: [] },
      isPending: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    });
    act(() =>
      rendered.root.render(
        createElement(
          I18nProvider,
          { i18n: setupI18n({ locale: "en", messages: { en: {} } }) },
          createElement(AskSources),
        ),
      ),
    );
    act(() =>
      rendered.container.querySelector<HTMLButtonElement>("button")!.click(),
    );
    expect(document.body.textContent).toContain(
      "Study group verification is unavailable",
    );
    expect(document.body.textContent).toContain(
      "Common sources are still available",
    );
  });

  it("shows an error without cached source data and allows retry", () => {
    const refetch = vi.fn();
    query.mockReturnValue({
      data: sources,
      isPending: false,
      isFetching: false,
      isError: true,
      refetch,
    });
    act(() =>
      rendered.root.render(
        createElement(
          I18nProvider,
          { i18n: setupI18n({ locale: "en", messages: { en: {} } }) },
          createElement(AskSources),
        ),
      ),
    );
    act(() =>
      rendered.container.querySelector<HTMLButtonElement>("button")!.click(),
    );
    expect(document.body.textContent).toContain("Could not load sources.");
    expect(document.body.textContent).not.toContain("Study forum");
    const retryButton = [...document.body.querySelectorAll("button")].find(
      (button) => button.textContent === "Retry",
    );
    act(() => retryButton?.click());
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("does not show previously cached sources while refreshing or after an error", () => {
    const refetch = vi.fn();
    query.mockReturnValue({
      data: sources,
      isPending: false,
      isFetching: true,
      isError: false,
      refetch,
    });
    act(() =>
      rendered.root.render(
        createElement(
          I18nProvider,
          { i18n: setupI18n({ locale: "en", messages: { en: {} } }) },
          createElement(AskSources),
        ),
      ),
    );
    act(() =>
      rendered.container.querySelector<HTMLButtonElement>("button")!.click(),
    );
    expect(document.body.textContent).toContain("Loading sources");
    expect(document.body.textContent).not.toContain("Study forum");
  });
});
