import { $search, type searchTypes } from "@/api/search";
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
  renderOffer(offer);
});
function renderOffer(item: searchTypes.SchemaSignupOffer) {
  act(() =>
    root.render(
      createElement(
        QueryClientProvider,
        { client },
        createElement(
          I18nProvider,
          { i18n: setupI18n({ locale: "en", messages: { en: {} } }) },
          createElement(AskSignupOffers, { chatId: "chat-1", offers: [item] }),
        ),
      ),
    ),
  );
}
afterEach(() => {
  act(() => root.unmount());
  client.clear();
  vi.unstubAllGlobals();
});

it.each(["sport", "events"])(
  "uses the real API client with a bodyless %s offer-only POST",
  async (service) => {
    renderOffer({ ...offer, service } as searchTypes.SchemaSignupOffer);
    api.fetch.mockResolvedValue(
      new Response(JSON.stringify({ ...offer, service, status: "confirmed" }), {
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
    expect(request.headers.get("X-Sport-Token")).toBe(
      service === "sport" ? "test-sport" : null,
    );
    expect(await request.text()).toBe("");
    expect(container.textContent).toContain("You are signed up");
  },
);

it.each([
  ["rooms", false],
  ["rooms", true],
  ["music", false],
  ["music", true],
] as const)(
  "sends the explicit %s selection once through the real transport (lost reply: %s)",
  async (service, lostReply) => {
    const item = {
      ...offer,
      service,
      booking_title: service === "rooms" ? "Thesis rehearsal" : null,
      music_window:
        service === "music"
          ? {
              starts_at: offer.starts_at,
              ends_at: offer.ends_at,
              latest_start_at: "2099-11-12T19:00:00+03:00",
              max_duration_minutes: 90,
              duration_minutes: null,
              step_minutes: 30,
            }
          : null,
    } as unknown as searchTypes.SchemaSignupOffer;
    renderOffer(item);
    if (service === "music") {
      act(() => container.querySelector("button")!.click());
      expect(api.fetch).not.toHaveBeenCalled();
      const [start, duration] = container.querySelectorAll("select");
      act(() => {
        start.value = "18:30";
        start.dispatchEvent(new Event("change", { bubbles: true }));
      });
      act(() => {
        duration.value = "60";
        duration.dispatchEvent(new Event("change", { bubbles: true }));
      });
    }
    const snapshot =
      service === "music"
        ? {
            starts_at: "2099-11-12T18:30:00+03:00",
            ends_at: "2099-11-12T19:30:00+03:00",
          }
        : { booking_title: "Thesis rehearsal" };
    api.fetch.mockImplementation(() => {
      expect(api.remember).toHaveBeenCalledWith(
        "chat-1",
        expect.objectContaining({ ...snapshot, status: "unknown" }),
      );
      return lostReply
        ? Promise.reject(new TypeError("Disconnected after booking"))
        : Promise.resolve(
            new Response(
              JSON.stringify({ ...item, ...snapshot, status: "confirmed" }),
              { headers: { "Content-Type": "application/json" } },
            ),
          );
    });
    await act(async () => {
      const button = container.querySelector("button")!;
      button.click();
      button.click();
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    expect(api.fetch).toHaveBeenCalledTimes(1);
    const request = api.fetch.mock.calls[0][0] as Request;
    expect(request.url).toBe(
      "https://search.test/ask/chat-1/signup/opaque-offer-1",
    );
    expect(request.method).toBe("POST");
    expect(request.headers.get("X-Sport-Token")).toBeNull();
    expect(await request.json()).toEqual(
      service === "music"
        ? { time_from: "18:30", time_to: "19:30" }
        : { booking_title: "Thesis rehearsal" },
    );
    expect(container.textContent).toContain(
      lostReply ? "Booking outcome is unknown" : "Booked",
    );
    expect(api.remember).toHaveBeenLastCalledWith(
      "chat-1",
      expect.objectContaining({
        ...snapshot,
        status: lostReply ? "unknown" : "confirmed",
      }),
    );
    expect(container.querySelector("button")).toBeNull();
  },
);

it.each([
  {},
  { ...offer, status: "available" },
  { ...offer, id: "wrong-offer", status: "confirmed" },
])(
  "keeps malformed receipts uncertain rather than restoring an action: %j",
  async (receipt) => {
    api.fetch.mockResolvedValue(
      new Response(JSON.stringify(receipt), {
        headers: { "Content-Type": "application/json" },
      }),
    );
    await act(async () => container.querySelector("button")!.click());
    expect(api.fetch).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("Registration outcome is unknown");
    expect(container.textContent).toContain("Volleyball");
    expect(container.querySelector("button")).toBeNull();
    expect(api.remember).toHaveBeenLastCalledWith(
      "chat-1",
      expect.objectContaining({ id: offer.id, status: "unknown" }),
    );
  },
);

it("proves that the real client would retry without the action-specific override", async () => {
  let completion!: Promise<unknown>;
  function RetryControl() {
    const mutation = $search.useMutation(
      "post",
      "/ask/{chat_id}/signup/{offer_id}",
    );
    return createElement(
      "button",
      {
        type: "button",
        onClick: () => {
          completion = mutation
            .mutateAsync({
              params: { path: { chat_id: "chat-1", offer_id: offer.id } },
            })
            .catch(() => undefined);
        },
      },
      "Control",
    );
  }
  api.fetch.mockRejectedValue(new TypeError("Lost reply"));
  act(() =>
    root.render(
      createElement(
        QueryClientProvider,
        { client },
        createElement(RetryControl),
      ),
    ),
  );
  await act(async () => {
    container.querySelector("button")!.click();
    await completion;
  });
  expect(api.fetch).toHaveBeenCalledTimes(4);
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
