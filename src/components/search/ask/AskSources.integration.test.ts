import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AskSources } from "./AskSources";

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
vi.mock("@/components/common/AuthWall", () => ({
  RequireAuth: ({ children }: { children: ReactNode }) => children,
}));

const catalogue = {
  verified_groups: ["B26"],
  sources: [
    {
      chat_id: "-1001",
      title: "Private group chat",
      group_code: "B26",
      forum: false,
      default_mode: "store",
      topics: [],
      has_stored_messages: true,
    },
  ],
};

function button(text: string) {
  const found = [...document.body.querySelectorAll("button")].find(
    (item) => item.textContent === text,
  );
  expect(found, `Button ${text}`).toBeDefined();
  return found!;
}

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 60));
  });
}

function closeTopDialog() {
  const dialogs = document.body.querySelectorAll('[role="dialog"]');
  const close =
    dialogs[dialogs.length - 1].querySelector<HTMLButtonElement>("button")!;
  act(() => close.click());
}

describe("Sources shared-client and modal lifecycle", () => {
  let root: Root;
  let container: HTMLDivElement;
  let client: QueryClient;
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    transport.mockReset().mockImplementation(async (request: Request) => {
      if (request.url.endsWith("/sources/requests")) {
        return Response.json({ verified_groups: ["B26"], requests: [] });
      }
      return Response.json(catalogue);
    });
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
            createElement(AskSources),
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

  it("fetches only on open with shared auth and never reveals cached sources on reopen", async () => {
    expect(transport).not.toHaveBeenCalled();
    act(() => button("Sources").click());
    await settle();
    expect(document.body.textContent).toContain("Private group chat");
    const request = transport.mock.calls[0][0] as Request;
    expect(request.url).toBe("http://localhost/search/sources");
    expect(request.headers.get("authorization")).toBe("Bearer fixture-token");
    expect(transport).toHaveBeenCalledTimes(1);
    closeTopDialog();
    await settle();
    expect(document.body.textContent).not.toContain("Private group chat");
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    let finish!: (response: Response) => void;
    transport.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    );
    act(() => button("Sources").click());
    await settle();
    expect(document.body.textContent).toContain("Loading sources");
    expect(document.body.textContent).not.toContain("Private group chat");
    await act(async () =>
      finish(Response.json({ detail: "unavailable" }, { status: 503 })),
    );
    await settle();
    expect(document.body.textContent).toContain("Could not load sources.");
    expect(document.body.textContent).not.toContain("Private group chat");
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it("opens the real proposal form and closes only the nested modal", async () => {
    act(() => button("Sources").click());
    await settle();
    act(() => button("Propose a chat").click());
    await settle();
    expect(document.body.querySelectorAll('[role="dialog"]')).toHaveLength(2);
    expect(
      document.body.querySelector('input[name="invite_link"]'),
    ).not.toBeNull();
    expect((transport.mock.calls[1][0] as Request).url).toBe(
      "http://localhost/search/sources/requests",
    );
    closeTopDialog();
    await settle();
    expect(document.body.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    expect(document.body.querySelector('input[name="invite_link"]')).toBeNull();
    expect(document.body.textContent).toContain("Private group chat");
    closeTopDialog();
    await settle();
    expect(document.body.querySelectorAll('[role="dialog"]')).toHaveLength(0);
  });
});
