import type { searchTypes } from "@/api/search";
import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AskResult } from "./AskResult";

const api = vi.hoisted(() => ({
  signup: vi.fn(),
  mutation: vi.fn(),
  remember: vi.fn(),
  headers: vi.fn(),
  invalidate: vi.fn(),
}));
vi.mock("@/api/search", () => ({
  $search: {
    useMutation: (...args: unknown[]) => {
      api.mutation(...args);
      return { mutateAsync: api.signup };
    },
    queryOptions: (...args: unknown[]) => ({ queryKey: args }),
  },
}));
vi.mock("@/app/query-client", () => ({
  queryClient: { invalidateQueries: api.invalidate },
}));
vi.mock("./ask-session", () => ({
  rememberSignup: api.remember,
  sportHeaders: api.headers,
  decideApproval: vi.fn(),
  rememberFeedback: vi.fn(),
}));

const offer = {
  id: "offer-1",
  service: "sport",
  title: "Volleyball",
  starts_at: "2099-11-12T18:00:00+03:00",
  ends_at: "2099-11-12T19:30:00+03:00",
  location: "Sports complex",
  source_url: "https://innohassle.ru/sport",
  external_url: null,
  status: "available",
  all_day: false,
  expires_at: "2099-11-12T17:00:00+03:00",
  message: null,
} as searchTypes.SchemaSignupOffer;
const response: searchTypes.SchemaAskResponses = {
  chat_id: "chat-1",
  query: "Recommend a training",
  answer: "An evening training fits your schedule.",
  search_responses: [],
  calendar_events: [],
  messages: [],
  signup_offers: [offer],
  attachments: [],
};

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  api.signup.mockReset();
  api.headers.mockReset().mockResolvedValue({ "X-Sport-Token": "sport-test" });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
function render(props: Partial<Parameters<typeof AskResult>[0]> = {}) {
  const i18n = setupI18n({ locale: "en", messages: { en: {} } });
  act(() => {
    root.render(
      createElement(
        I18nProvider,
        { i18n },
        createElement(AskResult, { response, isLast: true, ...props }),
      ),
    );
  });
}

it("shows the exact signup target and posts only its offer ID on explicit click", async () => {
  render();
  expect(container.textContent).toContain("Volleyball");
  expect(container.textContent).toContain("2099");
  expect(container.textContent).toContain("18:00");
  expect(container.textContent).toContain("19:30");
  expect(container.textContent).toContain("Sports complex");
  const button = container.querySelector("button")!;
  expect(button?.textContent).toBe("Sign up");
  expect(api.signup).not.toHaveBeenCalled();
  api.signup.mockResolvedValue({ ...offer, status: "confirmed" });
  await act(async () => button.click());
  expect(api.mutation).toHaveBeenCalledWith(
    "post",
    "/ask/{chat_id}/signup/{offer_id}",
    expect.objectContaining({ retry: false }),
  );
  expect(api.signup).toHaveBeenCalledExactlyOnceWith({
    params: { path: { chat_id: "chat-1", offer_id: "offer-1" } },
    headers: { "X-Sport-Token": "sport-test" },
  });
  expect(container.textContent).toContain("You are signed up");
  expect(api.remember).toHaveBeenLastCalledWith("chat-1", {
    ...offer,
    status: "confirmed",
  });
});

it("blocks double clicks before credentials resolve and keeps an uncertain result after network loss", async () => {
  let release!: (headers: Record<string, string>) => void;
  api.headers.mockReturnValue(
    new Promise((resolve) => {
      release = resolve;
    }),
  );
  api.signup.mockRejectedValue(new TypeError("Connection lost"));
  render();
  const button = container.querySelector("button")!;
  act(() => {
    button.click();
    button.click();
  });
  expect(api.headers).toHaveBeenCalledTimes(1);
  expect(container.textContent).toContain("Signing up");
  expect(api.remember).toHaveBeenCalledWith(
    "chat-1",
    expect.objectContaining({
      id: offer.id,
      status: "unknown",
    }),
  );
  await act(async () => release({ "X-Sport-Token": "sport-test" }));
  expect(api.signup).toHaveBeenCalledTimes(1);
  expect(container.textContent).toContain("Registration outcome is unknown");
  expect(container.textContent).toContain(
    "Check the service before trying again",
  );
  expect(container.querySelector("button")).toBeNull();
  expect(container.querySelector("a")?.href).toBe(offer.source_url);
  expect(api.remember).toHaveBeenLastCalledWith(
    "chat-1",
    expect.objectContaining({
      id: offer.id,
      status: "unknown",
    }),
  );
});

it("shows the server's refusal without changing the original answer or retrying", async () => {
  api.signup.mockResolvedValue({
    ...offer,
    status: "refused",
    message: "This training overlaps your class.",
  });
  render();
  await act(async () => container.querySelector("button")!.click());
  expect(container.textContent).toContain("Could not sign up");
  expect(container.textContent).toContain("This training overlaps your class.");
  expect(container.textContent).toContain(response.answer);
  expect(container.querySelector("button")).toBeNull();
  expect(api.signup).toHaveBeenCalledTimes(1);
});

it("opens external registration without a signup request or a success claim", () => {
  render({
    response: {
      ...response,
      signup_offers: [
        { ...offer, external_url: "https://example.org/register" },
      ],
    },
  });
  const registration = Array.from(container.querySelectorAll("a")).find(
    (link) => link.textContent === "Open registration",
  );
  expect(registration?.href).toBe("https://example.org/register");
  expect(registration?.rel).toContain("noopener");
  expect(container.querySelector("button")).toBeNull();
  expect(container.textContent).not.toContain("You are signed up");
  expect(api.signup).not.toHaveBeenCalled();
});

it("shows the all-day meaning instead of the source's display clocks before consent", () => {
  render({
    response: { ...response, signup_offers: [{ ...offer, all_day: true }] },
  });
  expect(container.textContent).toContain("Nov 12, 2099");
  expect(container.textContent).toContain("All day");
  expect(container.textContent).not.toContain("18:00");
  expect(container.textContent).not.toContain("19:30");
  expect(container.querySelector("button")?.textContent).toBe("Sign up");
  expect(api.signup).not.toHaveBeenCalled();
});

it("shows inclusive all-day dates in Moscow while preserving the exclusive end", () => {
  render({
    response: {
      ...response,
      signup_offers: [
        {
          ...offer,
          all_day: true,
          starts_at: "2099-11-11T21:00:00Z",
          ends_at: "2099-11-14T21:00:00Z",
        },
      ],
    },
  });
  expect(container.textContent).toContain("Nov 12, 2099");
  expect(container.textContent).toContain("Nov 14, 2099");
  expect(container.textContent).not.toContain("Nov 15");
  expect(container.textContent).not.toContain("00:00");
  expect(container.textContent).toContain("All day");
});

it.each([
  { expires_at: "2000-01-01T00:00:00Z" },
  { starts_at: "2000-01-01T00:00:00Z" },
  { starts_at: "bad" },
  { ends_at: "2099-11-12T17:00:00+03:00" },
])("does not post expired or malformed event offers: %j", (change) => {
  render({
    response: { ...response, signup_offers: [{ ...offer, ...change }] },
  });
  const button = container.querySelector("button");
  expect(button === null || button.disabled).toBe(true);
  if (button) act(() => button.click());
  expect(api.signup).not.toHaveBeenCalled();
});

it.each(["expires_at", "starts_at"] as const)(
  "shows expiry feedback when %s passes after rendering",
  async (field) => {
    const now = Date.parse("2099-11-12T12:00:00Z");
    const clock = vi.spyOn(Date, "now").mockReturnValue(now);
    try {
      render({
        response: {
          ...response,
          signup_offers: [
            { ...offer, [field]: new Date(now + 1000).toISOString() },
          ],
        },
      });
      const button = container.querySelector("button")!;
      expect(button.textContent).toBe("Sign up");
      clock.mockReturnValue(now + 1000);
      await act(async () => button.click());
      expect(container.textContent).toContain(
        "This offer has expired. Ask for current events.",
      );
      expect(container.querySelector("button")).toBeNull();
      expect(api.headers).not.toHaveBeenCalled();
      expect(api.signup).not.toHaveBeenCalled();
      expect(api.remember).not.toHaveBeenCalled();
    } finally {
      clock.mockRestore();
    }
  },
);

it("does not allow signup while the chat is generating an answer", () => {
  render({ isPending: true });
  expect(container.querySelector("button")!.disabled).toBe(true);
});

it("preserves known receipts in reopened history and hides actions on failed answers", () => {
  render({
    response: {
      ...response,
      signup_offers: [
        { ...offer, status: "confirmed" } as searchTypes.SchemaSignupOffer,
      ],
    },
    isLast: false,
  });
  expect(container.textContent).toContain("You are signed up");
  expect(container.querySelector("button")).toBeNull();
  render({ hasError: true });
  expect(container.textContent).not.toContain("Volleyball");
  expect(api.signup).not.toHaveBeenCalled();
});
