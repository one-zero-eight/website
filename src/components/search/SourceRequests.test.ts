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
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >(`[name="${name}"]`)!;
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : element instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
  act(() => {
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(
      element,
      value,
    );
    element.dispatchEvent(
      new Event(element instanceof HTMLSelectElement ? "change" : "input", {
        bubbles: true,
      }),
    );
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
            : { requests: [], verified_groups: ["B24-DS-01"] },
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
  ["t.me/universityinnopolis", "https://t.me/universityinnopolis"],
  ["https://t.me/universityinnopolis", "https://t.me/universityinnopolis"],
  ["  t.me/UniversityInnopolis  ", "https://t.me/universityinnopolis"],
  ["https://t.me/publicchat", "https://t.me/publicchat"],
  ["t.me/ab_cd", "https://t.me/ab_cd"],
  [`t.me/${"a".repeat(32)}`, `https://t.me/${"a".repeat(32)}`],
  ["t.me/+valid_Invite-1234", "https://t.me/+valid_Invite-1234"],
  [
    "t.me/joinchat/valid_Invite-1234",
    "https://t.me/joinchat/valid_Invite-1234",
  ],
])("submits a Telegram source link %s", async (link, normalized) => {
  await open();
  input("invite_link", link);
  expect(button("Submit request").disabled).toBe(true);
  act(() =>
    document.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(),
  );
  expect(button("Submit request").disabled).toBe(false);
  await act(async () => button("Submit request").click());
  await settle();
  const posts = api.fetch.mock.calls.filter(([req]) => req.method === "POST");
  expect(posts).toHaveLength(1);
  expect(await posts[0][0].json()).toEqual({
    invite_link: normalized,
    group_code: "B24-DS-01",
    comment: "",
    consent: true,
  });
});
it.each([
  "https://evil.test/+invite",
  "",
  "https://t.me/+invite?leak=yes",
  "http://t.me/+valid_Invite-1234",
  "https://t.me/+short",
  `https://t.me/+${"a".repeat(15)}`,
  `https://t.me/+${"a".repeat(129)}`,
  "https://t.me/+valid_Invite-1234/",
  "https://t.me/+valid_Invite-1234?key=value",
  "http://t.me/universityinnopolis",
  "https://t.me/universityinnopolis/123",
  "t.me/universityinnopolis?start=123",
  "https://t.me/universityinnopolis#fragment",
  "https://t.me/universityinnopolis/",
  "https://t.me@evil.test/universityinnopolis",
  "https://evil.test@t.me/universityinnopolis",
  "https://t.me.evil.test/universityinnopolis",
  "https://t.me:443/universityinnopolis",
  "https://t.me/%75niversityinnopolis",
  "https://t.me/university-innopolis",
  "https://t.me/universityиннополис",
  "https://t.me/12345",
  "https://t.me/abcd",
  `https://t.me/${"a".repeat(33)}`,
  "https://t.me/_publicchat",
  "https://t.me/publicchat_",
  ...[
    "joinchat",
    "share",
    "proxy",
    "socks",
    "login",
    "confirmphone",
    "setlanguage",
    "addstickers",
    "addemoji",
    "addtheme",
    "bg",
    "invoice",
    "giftcode",
    "addlist",
    "boost",
    "contact",
    "Login",
  ].map((path) => `t.me/${path}`),
])("rejects malformed Telegram links %s", async (invite) => {
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
  input("group_code", "B24-DS-01");
  act(() =>
    document.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(),
  );
  expect(button("Submit request").disabled).toBe(false);
});
it("enforces backend field limits while allowing inclusive boundaries", async () => {
  await open();
  expect(
    document.querySelector<HTMLInputElement>('[name="invite_link"]')!.maxLength,
  ).toBe(160);
  input("invite_link", `https://t.me/+${"a".repeat(128)}`);
  input("comment", "a".repeat(2000));
  act(() =>
    document.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(),
  );
  expect(button("Submit request").disabled).toBe(false);
  input("comment", "a".repeat(2001));
  expect(button("Submit request").disabled).toBe(true);
  expect(document.body.textContent).toContain(
    "Comment must be 2000 characters or fewer",
  );
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
  expect(document.body.textContent).toContain("Submitting your request");
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
          : { requests: [request], verified_groups: ["B24-DS-01"] },
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
      verified_groups: [],
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
      verified_groups: [],
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
    Promise.resolve(response({ requests: [], verified_groups: [] })),
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
      verified_groups: [],
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
it("prefills the only verified study group and preserves an explicit selection on refetch", async () => {
  expect(api.fetch).not.toHaveBeenCalled();
  await open();
  expect(
    document.querySelector<HTMLSelectElement>('[name="group_code"]')!.value,
  ).toBe("B24-DS-01");
  api.fetch.mockImplementation(() =>
    Promise.resolve(response({ requests: [], verified_groups: ["B24-DS-01"] })),
  );
  input("group_code", "B24-DS-01");
  await act(async () => client.invalidateQueries());
  await settle();
  expect(
    document.querySelector<HTMLSelectElement>('[name="group_code"]')!.value,
  ).toBe("B24-DS-01");
});
it("offers multiple verified groups without selecting one automatically", async () => {
  api.fetch.mockResolvedValue(
    response({ requests: [], verified_groups: ["B24-DS-01", "M26-SE-01"] }),
  );
  await open();

  const groupSelect = document.querySelector<HTMLSelectElement>(
    '[name="group_code"]',
  )!;
  expect(groupSelect.value).toBe("");
  expect([...groupSelect.options].map((option) => option.value)).toEqual([
    "",
    "B24-DS-01",
    "M26-SE-01",
  ]);
  expect(button("Submit request").disabled).toBe(true);
  input("group_code", "M26-SE-01");
  expect(button("Submit request").disabled).toBe(true);
});
it("does not allow manual group proposals when no verified groups are returned", async () => {
  api.fetch.mockResolvedValue(response({ requests: [], verified_groups: [] }));
  await open();

  expect(
    document.querySelector<HTMLSelectElement>('[name="group_code"]')!.options,
  ).toHaveLength(1);
  expect(document.body.textContent).toContain(
    "No verified study groups are available",
  );
  input("group_code", "M26-SE-01");
  expect(button("Submit request").disabled).toBe(true);
});
it("keeps own-group submission unavailable when group lookup fails but offers all users", async () => {
  api.fetch.mockImplementationOnce(() =>
    Promise.resolve(response({ detail: "unavailable" }, 503)),
  );
  await open();
  await settle();
  expect(document.body.textContent).toContain("Could not load your requests");
  expect(document.body.textContent).toContain(
    "Your study groups could not be verified",
  );
  expect(button("Submit request").disabled).toBe(true);
  input("audience", "all");
  input("invite_link", "https://t.me/+privateInvite1234");
  act(() =>
    document.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(),
  );
  expect(button("Submit request").disabled).toBe(false);
});
it("requires explicit admin consent and sends only the proposed source payload", async () => {
  await open();
  input("invite_link", "  https://t.me/joinchat/privateInvite1234  ");
  input("group_code", "B24-DS-01");
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

it("submits all-audience requests without verified groups after explicit selection", async () => {
  api.fetch.mockResolvedValue(response({ requests: [], verified_groups: [] }));
  await open();

  const audience =
    document.querySelector<HTMLSelectElement>('[name="audience"]')!;
  expect(audience.value).toBe("own");
  expect([...audience.options].map((option) => option.textContent)).toEqual([
    "My verified study group",
    "All cAtIx users",
  ]);
  act(() => {
    audience.value = "all";
    audience.dispatchEvent(new Event("change", { bubbles: true }));
  });
  input("invite_link", "t.me/universityinnopolis");
  act(() =>
    document.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(),
  );
  expect(document.body.textContent).toContain(
    "visible to all cAtIx users, including people who are not members of your study group",
  );
  expect(button("Submit request").disabled).toBe(false);
  await act(async () => button("Submit request").click());
  await settle();
  const post = api.fetch.mock.calls.find(([req]) => req.method === "POST")![0];
  expect(await post.json()).toEqual({
    invite_link: "https://t.me/universityinnopolis",
    group_code: "all",
    comment: "",
    consent: true,
  });
});

it("limits own-audience submissions to a selected verified group", async () => {
  api.fetch.mockResolvedValue(
    response({ requests: [], verified_groups: ["B24-DS-01", "M26-SE-01"] }),
  );
  await open();
  const groupSelect = document.querySelector<HTMLSelectElement>(
    '[name="group_code"]',
  )!;
  expect([...groupSelect.options].map((option) => option.value)).toEqual([
    "",
    "B24-DS-01",
    "M26-SE-01",
  ]);
  expect(groupSelect.value).toBe("");
  act(() => {
    groupSelect.value = "M26-SE-01";
    groupSelect.dispatchEvent(new Event("change", { bubbles: true }));
  });
  input("invite_link", "https://t.me/+privateInvite1234");
  act(() =>
    document.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(),
  );
  expect(button("Submit request").disabled).toBe(false);
  await act(async () => button("Submit request").click());
  const post = api.fetch.mock.calls.find(([req]) => req.method === "POST")![0];
  expect((await post.json()).group_code).toBe("M26-SE-01");
});

it("explains the exact inactive submission reason and resets consent when audience changes", async () => {
  api.fetch.mockResolvedValue(
    response({ requests: [], verified_groups: ["B24-DS-01", "M26-SE-01"] }),
  );
  await open();
  expect(document.body.textContent).toContain(
    "Enter a valid Telegram chat, channel or invite link",
  );
  expect(document.body.textContent).toContain(
    "Choose one of your verified study groups",
  );
  expect(document.body.textContent).toContain(
    "Confirm the chat administrator's consent",
  );
  input("invite_link", "https://t.me/+privateInvite1234");
  act(() =>
    document.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(),
  );
  const audience =
    document.querySelector<HTMLSelectElement>('[name="audience"]')!;
  act(() => {
    audience.value = "all";
    audience.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(
    document.querySelector<HTMLInputElement>('input[type="checkbox"]')!.checked,
  ).toBe(false);
  expect(document.body.textContent).toContain("visible to all cAtIx users");
  input("audience", "own");
  expect(
    document.querySelector<HTMLInputElement>('input[type="checkbox"]')!.checked,
  ).toBe(false);
  input("group_code", "B24-DS-01");
  act(() =>
    document.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(),
  );
  input("group_code", "M26-SE-01");
  expect(
    document.querySelector<HTMLInputElement>('input[type="checkbox"]')!.checked,
  ).toBe(false);
});

it("labels all-audience requests instead of showing the raw all group code", async () => {
  api.fetch.mockResolvedValue(
    response({
      requests: [{ ...request, group_code: "all", title: null }],
      verified_groups: [],
    }),
  );
  await open();
  expect(
    [...document.querySelectorAll("ul li p")]
      .slice(0, 2)
      .map((item) => item.textContent),
  ).toEqual(["All cAtIx users", "All cAtIx users"]);
});

it("does not widen an own-group request when refetch removes its verified group", async () => {
  api.fetch.mockResolvedValue(
    response({ requests: [], verified_groups: ["B24-DS-01", "M26-SE-01"] }),
  );
  await open();
  input("group_code", "B24-DS-01");
  input("invite_link", "https://t.me/+privateInvite1234");
  act(() =>
    document.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(),
  );
  expect(button("Submit request").disabled).toBe(false);

  api.fetch.mockImplementation((req: Request) =>
    Promise.resolve(
      req.method === "POST"
        ? response(request, 201)
        : response({ requests: [], verified_groups: ["M26-SE-01"] }),
    ),
  );
  await act(async () => button("Refresh requests").click());
  await settle();
  expect(
    document.querySelector<HTMLSelectElement>('[name="group_code"]')!.value,
  ).toBe("");
  expect(
    document.querySelector<HTMLInputElement>('input[type="checkbox"]')!.checked,
  ).toBe(false);
  expect(button("Submit request").disabled).toBe(true);
  expect(
    api.fetch.mock.calls.filter(([req]) => req.method === "POST"),
  ).toHaveLength(0);
});

it("explains a 403 as a verified-group mismatch and asks the user to reload groups", async () => {
  await open();
  input("invite_link", "https://t.me/+privateInvite1234");
  act(() =>
    document.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(),
  );
  api.fetch.mockImplementationOnce(() =>
    Promise.resolve(response({ detail: "do not show this" }, 403)),
  );
  await act(async () => button("Submit request").click());
  await settle();
  expect(document.body.textContent).toContain(
    "Your selected study group is no longer verified. Refresh your requests",
  );
  expect(document.body.textContent).not.toContain("do not show this");
});
