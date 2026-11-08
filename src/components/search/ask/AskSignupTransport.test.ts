import type { searchTypes } from "@/api/search";
import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AskSignupOffers } from "./AskSignupOffers";

const api = vi.hoisted(() => ({ fetch: vi.fn(), remember: vi.fn() }));
vi.mock("@/api/search", async () => {
  const { default: createQueryClient } =
    await import("@/api/helpers/create-query-client");
  const { default: createFetchClient } =
    await import("@/api/helpers/create-fetch-client");
  return {
    $search: createQueryClient(
      createFetchClient({ baseUrl: "https://search.test", fetch: api.fetch }),
      "search",
    ),
  };
});
vi.mock("./ask-session", () => ({
  rememberSignup: api.remember,
  sportHeaders: async () => ({ "X-Sport-Token": "test-sport" }),
}));

const offer = {
  id: "opaque-offer-1",
  service: "sport",
  title: "Volleyball",
  starts_at: "2099-11-12T18:00:00+03:00",
  ends_at: "2099-11-12T19:30:00+03:00",
  expires_at: "2099-11-12T17:00:00+03:00",
  status: "available",
} as searchTypes.SchemaSignupOffer;
let root: Root;
let container: HTMLDivElement;
let client: QueryClient;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  api.fetch.mockReset();
  api.remember.mockReset();
  client = new QueryClient({
    defaultOptions: { mutations: { retry: 3, retryDelay: 0 } },
  });
  container = document.createElement("div");
  root = createRoot(container);
  act(() =>
    root.render(
      createElement(
        QueryClientProvider,
        { client },
        createElement(
          I18nProvider,
          { i18n: setupI18n({ locale: "en", messages: { en: {} } }) },
          createElement(AskSignupOffers, { chatId: "chat-1", offers: [offer] }),
        ),
      ),
    ),
  );
});
afterEach(() => {
  act(() => root.unmount());
  client.clear();
  vi.unstubAllGlobals();
});

it("uses the real API client with a bodyless offer-only POST and current Sport credentials", async () => {
  api.fetch.mockResolvedValue(
    new Response(JSON.stringify({ ...offer, status: "confirmed" }), {
      headers: { "Content-Type": "application/json" },
    }),
  );
  await act(async () => container.querySelector("button")!.click());
  expect(api.fetch).toHaveBeenCalledTimes(1);
  const request = api.fetch.mock.calls[0][0] as Request;
  expect(request.method).toBe("POST");
  expect(request.url).toBe(
    "https://search.test/ask/chat-1/signup/opaque-offer-1",
  );
  expect(request.headers.get("X-Sport-Token")).toBe("test-sport");
  expect(await request.text()).toBe("");
  expect(container.textContent).toContain("You are signed up");
});

it("does not retry a failed mutation even when the query client's defaults enable retries", async () => {
  api.fetch.mockRejectedValue(new TypeError("Disconnected after POST"));
  await act(async () => {
    container.querySelector("button")!.click();
    await new Promise((resolve) => setTimeout(resolve, 30));
  });
  expect(api.fetch).toHaveBeenCalledTimes(1);
  expect(container.textContent).toContain("Registration outcome is unknown");
  expect(container.querySelector("button")).toBeNull();
  expect(api.remember).toHaveBeenLastCalledWith(
    "chat-1",
    expect.objectContaining({ status: "unknown" }),
  );
});
