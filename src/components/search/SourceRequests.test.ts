import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SourceRequests } from "./SourceRequests";

const api = vi.hoisted(() => ({
  fetch: vi.fn(),
  me: { id: "user-1" } as { id: string } | null,
}));
vi.mock("@/api/accounts/user.ts", () => ({ useMe: () => ({ me: api.me }) }));
vi.mock("@/components/common/SignInButton.tsx", () => ({
  SignInButton: () => "Sign in",
}));
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
let root: Root;
let container: HTMLDivElement;
let client: QueryClient;
const request = {
  id: "request-1",
  group_code: "B24-DS-01",
  comment: "",
  status: "pending",
  message: null,
  title: null,
  created_at: "2026-11-08T10:00:00Z",
};
function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
function button(text: string) {
  const result = [...document.querySelectorAll("button")].find(
    (element) => element.textContent?.trim() === text,
  );
  expect(result, `button ${text}`).toBeDefined();
  return result!;
}
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}
async function open() {
  await act(async () => button("Propose a Telegram chat").click());
  await settle();
}
function input(name: string, value: string) {
  const element = document.querySelector<
    HTMLInputElement | HTMLTextAreaElement
  >(`[name="${name}"]`)!;
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  act(() => {
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(
      element,
      value,
    );
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  api.me = { id: "user-1" };
  api.fetch
    .mockReset()
    .mockImplementation((req: Request) =>
      Promise.resolve(
        response(
          req.method === "POST"
            ? request
            : { requests: [], verified_group: "B24-DS-01" },
          req.method === "POST" ? 201 : 200,
        ),
      ),
    );
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: 3, retryDelay: 0 },
    },
  });
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
          createElement(SourceRequests),
        ),
      ),
    ),
  );
});
afterEach(() => {
  vi.useRealTimers();
  act(() => root.unmount());
  client.clear();
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it.each([
  "https://t.me/publicchat",
  "https://evil.test/+invite",
  "",
  "https://t.me/+invite?leak=yes",
  "t.me/+valid_Invite-1234",
  "t.me/joinchat/valid_Invite-1234",
  "http://t.me/+valid_Invite-1234",
  "https://t.me/+short",
  `https://t.me/+${"a".repeat(15)}`,
  `https://t.me/+${"a".repeat(129)}`,
  "https://t.me/+valid_Invite-1234/",
  "https://t.me/+valid_Invite-1234?key=value",
])("rejects non-private or malformed invite %s", async (invite) => {
  await open();
  input("invite_link", invite);
  act(() =>
    document.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(),
  );
  expect(button("Submit request").disabled).toBe(true);
  await act(async () => button("Submit request").click());
  expect(
    api.fetch.mock.calls.filter(([req]) => req.method === "POST"),
  ).toHaveLength(0);
  input("invite_link", "https://t.me/joinchat/valid_Invite-1234");
  expect(button("Submit request").disabled).toBe(false);
  input("group_code", "all");
  expect(button("Submit request").disabled).toBe(true);
  input("group_code", "");
  expect(button("Submit request").disabled).toBe(true);
});
it.each([
  "all",
  "ALL",
  "",
  " B24 DS 01 ",
  "-B24",
  "Б24",
  "B24/DS",
  "a".repeat(41),
])("rejects invalid study group %s", async (group) => {
  await open();
  input("invite_link", "https://t.me/+privateInvite1234");
  act(() =>
    document.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(),
  );
  input("group_code", group);
  expect(button("Submit request").disabled).toBe(true);
  await act(async () => button("Submit request").click());
  expect(
    api.fetch.mock.calls.filter(([req]) => req.method === "POST"),
  ).toHaveLength(0);
  input("group_code", "b24.ds_01-1");
  expect(button("Submit request").disabled).toBe(false);
});
it("enforces backend field limits while allowing inclusive boundaries", async () => {
  await open();
  for (const [name, maxLength] of [
    ["invite_link", 160],
    ["group_code", 40],
    ["comment", 2000],
  ] as const) {
    expect(
      document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
        `[name="${name}"]`,
      )!.maxLength,
    ).toBe(maxLength);
  }
  input("invite_link", `https://t.me/+${"a".repeat(128)}`);
  input("group_code", "a".repeat(40));
  input("comment", "a".repeat(2000));
  act(() =>
    document.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(),
  );
  expect(button("Submit request").disabled).toBe(false);
  input("comment", "a".repeat(2001));
  expect(button("Submit request").disabled).toBe(true);
  await act(async () => button("Submit request").click());
  expect(
    api.fetch.mock.calls.filter(([req]) => req.method === "POST"),
  ).toHaveLength(0);
  input("comment", "");
  expect(button("Submit request").disabled).toBe(false);
});
it("disables duplicate submissions while pending and keeps the form after a server refusal", async () => {
  await open();
  input("invite_link", "https://t.me/+privateInvite1234");
  act(() =>
    document.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(),
  );
  let finish!: (value: Response) => void;
  api.fetch.mockImplementationOnce(
    () =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
  );
  await act(async () => button("Submit request").click());
  await settle();
  expect(button("Submit request").disabled).toBe(true);
  await act(async () => button("Submit request").click());
  expect(
    api.fetch.mock.calls.filter(([req]) => req.method === "POST"),
  ).toHaveLength(1);
  await act(async () =>
    finish(response({ detail: "privateInvite must not be echoed" }, 422)),
  );
  await settle();
  expect(document.body.textContent).toContain("Could not submit the request");
  expect(document.body.textContent).not.toContain("privateInvite");
  expect(document.body.textContent).not.toContain("Request submitted");
  expect(
    document.querySelector<HTMLInputElement>('[name="invite_link"]')!.value,
  ).toBe("https://t.me/+privateInvite1234");
  expect(button("Submit request").disabled).toBe(false);
  expect(
    api.fetch.mock.calls.filter(([req]) => req.method === "POST"),
  ).toHaveLength(1);
});
it.each([
  [
    409,
    "This invitation already has a rejected or failed request. Refresh your requests and contact a cAtIx administrator for review, or use a new invitation.",
  ],
  [
    429,
    "You have reached the daily limit for new requests. Wait 24 hours before submitting a new invitation. You can still refresh your existing requests.",
  ],
])(
  "explains HTTP %s without exposing private details or encouraging an immediate retry",
  async (status, explanation) => {
    await open();
    input("invite_link", "https://t.me/+privateInvite1234");
    act(() =>
      document
        .querySelector<HTMLInputElement>('input[type="checkbox"]')!
        .click(),
    );
    api.fetch.mockImplementationOnce(() =>
      Promise.resolve(
        response(
          { detail: "https://t.me/+privateInvite1234 secret backend detail" },
          status,
        ),
      ),
    );
    await act(async () => button("Submit request").click());
    await settle();
    expect(document.querySelector(".text-error")!.textContent).toBe(
      explanation,
    );
    expect(document.body.textContent).not.toMatch(
      /privateInvite1234|secret backend detail|then retry/,
    );
    expect(document.querySelector(".text-success")).toBeNull();
    expect(
      api.fetch.mock.calls.filter(([req]) => req.method === "POST"),
    ).toHaveLength(1);
    expect(
      document.querySelector<HTMLInputElement>('[name="invite_link"]')!.value,
    ).toBe("https://t.me/+privateInvite1234");
  },
);
it("refreshes the request list after a confirmed submission without exposing the invite", async () => {
  await open();
  input("invite_link", "https://t.me/+privateInvite1234");
  act(() =>
    document.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(),
  );
  api.fetch.mockImplementation((req: Request) =>
    Promise.resolve(
      response(
        req.method === "POST"
          ? request
          : { requests: [request], verified_group: "B24-DS-01" },
        req.method === "POST" ? 201 : 200,
      ),
    ),
  );
  await act(async () => button("Submit request").click());
  await settle();
  expect(document.body.textContent).toContain("Request saved. Current status:");
  expect(document.body.textContent).toContain(
    "Awaiting cAtIx administrator approval",
  );
  expect(
    document.querySelector<HTMLInputElement>('[name="invite_link"]')!.value,
  ).toBe("");
  expect(
    document.querySelector<HTMLInputElement>('input[type="checkbox"]')!.checked,
  ).toBe(false);
  expect(
    api.fetch.mock.calls.filter(([req]) => req.method === "GET"),
  ).toHaveLength(2);
});
it.each([
  ["connected", "Source enabled; message history may still be loading"],
  ["approved", "Approved; queued to join"],
  ["waiting_join", "Waiting for Telegram membership confirmation"],
])(
  "shows the actual %s outcome when a POST returns an existing request",
  async (status, label) => {
    await open();
    input("invite_link", "https://t.me/+privateInvite1234");
    act(() =>
      document
        .querySelector<HTMLInputElement>('input[type="checkbox"]')!
        .click(),
    );
    api.fetch.mockImplementationOnce(() =>
      Promise.resolve(response({ ...request, status }, 201)),
    );
    await act(async () => button("Submit request").click());
    await settle();
    const success = document.querySelector(".text-success")!;
    expect(success.textContent).toContain("Request saved. Current status:");
    expect(success.textContent).toContain(label);
    expect(success.textContent).not.toMatch(
      /not been joined|submitted for review|Awaiting cAtIx/,
    );
    expect(success.textContent).not.toContain("privateInvite1234");
  },
);
it.each([
  ["approved", "Approved; queued to join"],
  ["joining", "Joining Telegram chat"],
  ["waiting_join", "Waiting for Telegram membership confirmation"],
  ["connected", "Source enabled; message history may still be loading"],
  ["failed", "Connection failed"],
  ["rejected", "Request rejected"],
])("shows %s status and refreshes on demand", async (status, label) => {
  api.fetch.mockResolvedValue(
    response({
      requests: [
        { ...request, status, title: "Group chat", message: "Review note" },
      ],
      verified_group: null,
    }),
  );
  await open();
  expect(document.body.textContent).toContain(label);
  expect(document.body.textContent).toContain("Group chat");
  expect(document.body.textContent).toContain("Review note");
  expect(document.querySelector("time")!.dateTime).toBe(request.created_at);
  api.fetch.mockResolvedValue(
    response({
      requests: [{ ...request, status: "connected" }],
      verified_group: null,
    }),
  );
  await act(async () => button("Refresh requests").click());
  await settle();
  expect(document.body.textContent).toContain(
    "Source enabled; message history may still be loading",
  );
});
it("shows loading and a retryable list error instead of a false empty state", async () => {
  let finish!: (value: Response) => void;
  api.fetch.mockImplementationOnce(
    () =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
  );
  await open();
  expect(document.body.textContent).toContain("Loading requests");
  expect(document.querySelector(".skeleton")).not.toBeNull();
  await act(async () => finish(response({ detail: "unavailable" }, 503)));
  await settle();
  expect(document.body.textContent).toContain("Could not load your requests");
  expect(document.body.textContent).not.toContain("No requests yet");
  api.fetch.mockImplementation(() =>
    Promise.resolve(response({ requests: [], verified_group: null })),
  );
  await act(async () => button("Refresh requests").click());
  await settle();
  expect(document.body.textContent).toContain("No requests yet");
  expect(document.body.textContent).not.toContain(
    "Could not load your requests",
  );
});
it("polls only while the modal is open and refetches when reopened", async () => {
  vi.useFakeTimers();
  await act(async () => button("Propose a Telegram chat").click());
  await act(async () => {
    await vi.advanceTimersByTimeAsync(100);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(15_000);
  });
  expect(
    api.fetch.mock.calls.filter(([req]) => req.method === "GET"),
  ).toHaveLength(2);
  const close = document.querySelector<HTMLButtonElement>(
    '[role="dialog"] button',
  )!;
  act(() => close.click());
  await act(async () => {
    await vi.advanceTimersByTimeAsync(30_000);
  });
  expect(
    api.fetch.mock.calls.filter(([req]) => req.method === "GET"),
  ).toHaveLength(2);
  vi.useRealTimers();
  await open();
  expect(
    api.fetch.mock.calls.filter(([req]) => req.method === "GET"),
  ).toHaveLength(3);
});
it("does not expose private invite links in request titles or messages", async () => {
  api.fetch.mockResolvedValue(
    response({
      requests: [
        {
          ...request,
          title: "https://t.me/+secretHash",
          message: "See t.me/joinchat/otherSecret",
          invite_link: "https://t.me/+hiddenField",
        },
      ],
      verified_group: null,
    }),
  );
  await open();
  expect(document.querySelector("ul")!.textContent).not.toMatch(
    /secretHash|otherSecret|hiddenField|t\.me/,
  );
});
it("explains group-based visibility and that submission does not join Telegram", async () => {
  await open();
  expect(document.body.textContent).toContain(
    "Study group verification is not proof of Telegram chat membership",
  );
  expect(document.body.textContent).toContain(
    "Submitting a request does not join the chat",
  );
});
it("signed-out users see the auth wall without querying or submitting", async () => {
  api.me = null;
  await open();
  expect(document.body.textContent).toContain("Sign in to get access");
  expect(document.querySelector('[name="invite_link"]')).toBeNull();
  expect(api.fetch).not.toHaveBeenCalled();
});
it("prefills the verified study group but lets the user propose another", async () => {
  expect(api.fetch).not.toHaveBeenCalled();
  await open();
  expect(
    document.querySelector<HTMLInputElement>('[name="group_code"]')!.value,
  ).toBe("B24-DS-01");
  input("group_code", "M26-SE-01");
  await act(async () => client.invalidateQueries());
  await settle();
  expect(
    document.querySelector<HTMLInputElement>('[name="group_code"]')!.value,
  ).toBe("M26-SE-01");
});
it("requires explicit admin consent and sends only the proposed source payload", async () => {
  await open();
  input("invite_link", "  https://t.me/joinchat/privateInvite1234  ");
  input("group_code", " B24-DS-01 ");
  input("comment", "Please add our chat");
  expect(button("Submit request").disabled).toBe(true);
  await act(async () => button("Submit request").click());
  expect(
    api.fetch.mock.calls.filter(([req]) => req.method === "POST"),
  ).toHaveLength(0);
  act(() =>
    document.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(),
  );
  await act(async () => button("Submit request").click());
  await settle();
  const posts = api.fetch.mock.calls.filter(([req]) => req.method === "POST");
  expect(posts).toHaveLength(1);
  expect(posts[0][0].url).toBe("https://search.test/sources/requests");
  expect(await posts[0][0].json()).toEqual({
    invite_link: "https://t.me/joinchat/privateInvite1234",
    group_code: "B24-DS-01",
    comment: "Please add our chat",
    consent: true,
  });
});
