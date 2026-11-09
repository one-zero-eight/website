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
  sources: [],
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

const roomOffer = {
  ...offer,
  service: "rooms",
  title: "Meeting room 301",
  location: "University, floor 3",
  booking_title: null,
} as unknown as searchTypes.SchemaSignupOffer;

const musicWindow = {
  starts_at: "2099-11-12T06:00:00Z",
  ends_at: "2099-11-12T09:00:00Z",
  latest_start_at: "2099-11-12T08:00:00Z",
  max_duration_minutes: 90,
  duration_minutes: null as number | null,
  step_minutes: 30,
};
const musicOffer = {
  ...offer,
  service: "music",
  title: "Music Room",
  starts_at: "2099-11-12T06:00:00Z",
  ends_at: "2099-11-12T09:00:00Z",
  location: "Dormitory 1",
  music_window: {
    starts_at: "2099-11-12T06:00:00Z",
    ends_at: "2099-11-12T09:00:00Z",
    latest_start_at: "2099-11-12T08:00:00Z",
    max_duration_minutes: 90,
    duration_minutes: null,
    step_minutes: 30,
  },
} as unknown as searchTypes.SchemaSignupOffer;

it("constrains music choices to grid, quota, latest start and the window end without selecting a default", () => {
  render({ response: { ...response, signup_offers: [musicOffer] } });
  act(() => container.querySelector<HTMLButtonElement>("li button")!.click());
  const [start, duration] = container.querySelectorAll("select");
  const values = (select: HTMLSelectElement) =>
    Array.from(select.options, (option) => option.value);
  expect(values(start)).toEqual([
    "",
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
  ]);
  expect(values(duration)).toEqual(["", "30", "60", "90"]);
  changeInput(start, "11:00");
  expect(values(duration)).toEqual(["", "30", "60"]);
  expect(duration.value).toBe("");
  changeInput(duration, "60");
  changeInput(start, "09:00");
  changeInput(duration, "90");
  expect(values(start)).toEqual(["", "09:00", "09:30", "10:00", "10:30"]);
  expect(api.signup).not.toHaveBeenCalled();
});

it("prefills only an explicitly requested music duration and still asks for a start", () => {
  const fixed = {
    ...musicOffer,
    music_window: { ...musicWindow, duration_minutes: 60 },
  } as unknown as searchTypes.SchemaSignupOffer;
  render({ response: { ...response, signup_offers: [fixed] } });
  act(() => container.querySelector<HTMLButtonElement>("li button")!.click());
  const [start, duration] = container.querySelectorAll("select");
  expect(start.value).toBe("");
  expect(duration.value).toBe("60");
  expect(Array.from(duration.options, (option) => option.value)).toEqual([
    "",
    "60",
  ]);
  act(() => container.querySelector<HTMLButtonElement>("li button")!.click());
  expect(api.signup).not.toHaveBeenCalled();
  expect(api.remember).not.toHaveBeenCalled();
});

it("keeps a music window actionable after its beginning but offers only future grid starts", () => {
  const now = vi
    .spyOn(Date, "now")
    .mockReturnValue(Date.parse("2099-11-12T09:45:00+03:00"));
  try {
    render({ response: { ...response, signup_offers: [musicOffer] } });
    expect(container.querySelector("li button")?.textContent).toBe(
      "Choose time",
    );
    act(() => container.querySelector<HTMLButtonElement>("li button")!.click());
    const [start] = container.querySelectorAll("select");
    expect(Array.from(start.options, (option) => option.value)).toEqual([
      "",
      "10:00",
      "10:30",
      "11:00",
    ]);
  } finally {
    now.mockRestore();
  }
});

it.each([
  null,
  { ...musicWindow, starts_at: "bad" },
  { ...musicWindow, starts_at: "2099-11-12T09:00:00" },
  { ...musicWindow, starts_at: "2099-11-12T06:15:00Z" },
  { ...musicWindow, ends_at: "2099-11-12T09:00:01Z" },
  { ...musicWindow, ends_at: "2099-11-13T09:00:00Z" },
  { ...musicWindow, latest_start_at: "2099-11-12T05:00:00Z" },
  { ...musicWindow, latest_start_at: "2099-11-12T09:00:00Z" },
  { ...musicWindow, max_duration_minutes: 0 },
  { ...musicWindow, max_duration_minutes: 29 },
  { ...musicWindow, max_duration_minutes: -1 },
  { ...musicWindow, duration_minutes: 120 },
  { ...musicWindow, step_minutes: 15 },
])(
  "does not expose booking controls for malformed music metadata: %j",
  (music_window) => {
    render({
      response: {
        ...response,
        signup_offers: [
          {
            ...musicOffer,
            music_window,
          } as unknown as searchTypes.SchemaSignupOffer,
        ],
      },
    });
    expect(container.textContent).toContain("Booking unavailable");
    expect(container.querySelector("li button")).toBeNull();
    expect(api.remember).not.toHaveBeenCalled();
    expect(api.signup).not.toHaveBeenCalled();
  },
);

it.each([null, "2099-11-12T18:00:00", "bad"])(
  "blocks malformed fixed room intervals: %s",
  (ends_at) => {
    render({
      response: { ...response, signup_offers: [{ ...roomOffer, ends_at }] },
    });
    expect(container.querySelector("li button")).toBeNull();
    expect(api.signup).not.toHaveBeenCalled();
  },
);

it("refuses a music start that passes after selection without marking a write attempted", async () => {
  const now = vi
    .spyOn(Date, "now")
    .mockReturnValue(Date.parse("2099-11-12T09:45:00+03:00"));
  try {
    render({ response: { ...response, signup_offers: [musicOffer] } });
    act(() => container.querySelector<HTMLButtonElement>("li button")!.click());
    const [start, duration] = container.querySelectorAll("select");
    changeInput(start, "10:00");
    changeInput(duration, "60");
    now.mockReturnValue(Date.parse("2099-11-12T10:00:00+03:00"));
    await act(async () =>
      container.querySelector<HTMLButtonElement>("li button")!.click(),
    );
    expect(api.signup).not.toHaveBeenCalled();
    expect(api.remember).not.toHaveBeenCalled();
    expect(container.textContent).toContain(
      "Choose a future time within the available window.",
    );
    expect(container.querySelector<HTMLSelectElement>("select")!.value).toBe(
      "",
    );
  } finally {
    now.mockRestore();
  }
});

it.each(["expires_at", "latest_start_at"])(
  "expires music by %s rather than window start",
  (field) => {
    const expired = "2000-01-01T00:00:00Z";
    const item =
      field === "expires_at"
        ? { ...musicOffer, expires_at: expired }
        : {
            ...musicOffer,
            starts_at: "2000-01-01T00:00:00Z",
            ends_at: "2000-01-01T03:00:00Z",
            music_window: {
              ...musicWindow,
              starts_at: "2000-01-01T00:00:00Z",
              ends_at: "2000-01-01T03:00:00Z",
              latest_start_at: "2000-01-01T02:00:00Z",
            },
          };
    render({
      response: {
        ...response,
        signup_offers: [item as unknown as searchTypes.SchemaSignupOffer],
      },
    });
    expect(container.querySelector("li button")).toBeNull();
    expect(container.textContent).toContain(
      "This offer has expired. Ask for current availability.",
    );
  },
);

it.each([roomOffer, musicOffer])(
  "uses booking status labels for $service and keeps the chosen interval",
  async (item) => {
    const selected = {
      ...item,
      starts_at: "2099-11-12T10:00:00+03:00",
      ends_at: "2099-11-12T11:00:00+03:00",
      booking_title: item.service === "rooms" ? "Thesis rehearsal" : null,
    } as unknown as searchTypes.SchemaSignupOffer;
    for (const [status, label] of [
      ["confirmed", "Booked"],
      ["refused", "Could not book"],
      ["unknown", "Booking outcome is unknown"],
    ]) {
      render({
        response: {
          ...response,
          signup_offers: [
            { ...selected, status } as searchTypes.SchemaSignupOffer,
          ],
        },
      });
      expect(container.textContent).toContain(label);
      expect(container.textContent).toContain("10:00–11:00");
      expect(container.textContent).not.toContain("Available window");
      if (item.service === "rooms")
        expect(container.textContent).toContain("Thesis rehearsal");
      expect(container.querySelector("li button")).toBeNull();
    }
  },
);

it("keeps pending booking controls disabled and shows Booking without a second confirmation", async () => {
  let release!: (result: searchTypes.SchemaSignupOffer) => void;
  api.signup.mockReturnValue(
    new Promise((resolve) => {
      release = resolve;
    }),
  );
  const item = {
    ...roomOffer,
    booking_title: "Seminar",
  } as unknown as searchTypes.SchemaSignupOffer;
  render({
    response: {
      ...response,
      signup_offers: [item, { ...musicOffer, id: "music-2" }],
    },
  });
  expect(container.querySelector<HTMLInputElement>("input")!.value).toBe(
    "Seminar",
  );
  act(() => container.querySelector<HTMLButtonElement>("li button")!.click());
  expect(container.textContent).toContain("Booking…");
  expect(
    container.querySelector<HTMLButtonElement>("li button")!.disabled,
  ).toBe(true);
  expect(api.signup).toHaveBeenCalledTimes(1);
  await act(async () =>
    release({ ...item, status: "confirmed" } as searchTypes.SchemaSignupOffer),
  );
  expect(container.textContent).toContain("Booked");
});

it("contains expanded booking controls within full-width responsive chat rows", () => {
  render({
    response: { ...response, answer: "Options:", signup_offers: [musicOffer] },
  });
  act(() => container.querySelector<HTMLButtonElement>("li button")!.click());
  const row = container.querySelector("li")!;
  const controls = row.querySelector("select")!.closest("div")!;
  expect(container.firstElementChild?.classList.contains("w-full")).toBe(true);
  expect(row.classList.contains("grid-cols-1")).toBe(true);
  expect(controls.classList.contains("min-w-0")).toBe(true);
  expect(controls.className).toContain("@min-[28rem]/signup:grid-cols-2");
  const actionCell = row.children[1];
  expect(actionCell.className).toContain("@min-[28rem]/signup:col-span-2");
  expect(actionCell.className).not.toContain("max-w-48");
  expect(actionCell.contains(row.querySelector("button"))).toBe(true);
});

it.each([roomOffer, musicOffer])(
  "disables $service choices while generating or awaiting approval",
  (item) => {
    for (const props of [
      { isPending: true },
      {
        response: {
          ...response,
          approval: { id: "approval-1", actions: [] },
          signup_offers: [item],
        },
      },
    ]) {
      render({ response: { ...response, signup_offers: [item] }, ...props });
      const button = container.querySelector<HTMLButtonElement>("li button")!;
      expect(button.disabled).toBe(true);
      act(() => button.click());
      expect(api.signup).not.toHaveBeenCalled();
    }
  },
);

it.each([false, true])(
  "shows the authoritative music receipt, including a competing selection: %s",
  async (competing) => {
    const receipt = {
      ...musicOffer,
      status: "confirmed",
      starts_at: competing
        ? "2099-11-12T09:00:00+03:00"
        : "2099-11-12T10:00:00+03:00",
      ends_at: competing
        ? "2099-11-12T09:30:00+03:00"
        : "2099-11-12T11:00:00+03:00",
      music_window: { ...musicWindow, max_duration_minutes: 60 },
    };
    api.signup.mockResolvedValue(receipt);
    render({ response: { ...response, signup_offers: [musicOffer] } });
    act(() => container.querySelector<HTMLButtonElement>("li button")!.click());
    const [start, duration] = container.querySelectorAll("select");
    changeInput(start, "10:00");
    changeInput(duration, "60");
    await act(async () =>
      container.querySelector<HTMLButtonElement>("li button")!.click(),
    );
    expect(container.textContent).toContain("Booked");
    expect(container.textContent).toContain(
      competing ? "09:00–09:30" : "10:00–11:00",
    );
    if (competing) expect(container.textContent).not.toContain("10:00–11:00");
    expect(api.remember).toHaveBeenLastCalledWith("chat-1", receipt);
    expect(api.signup).toHaveBeenCalledTimes(1);
    expect(container.querySelector("li button")).toBeNull();
  },
);

it.each([false, true])(
  "shows the authoritative room subject, including a competing selection: %s",
  async (competing) => {
    const receipt = {
      ...roomOffer,
      status: "confirmed",
      booking_title: competing ? "Already booked subject" : "Attempted subject",
    };
    api.signup.mockResolvedValue(receipt);
    render({ response: { ...response, signup_offers: [roomOffer] } });
    changeInput(
      container.querySelector<HTMLInputElement>("li input")!,
      "Attempted subject",
    );
    await act(async () =>
      container.querySelector<HTMLButtonElement>("li button")!.click(),
    );
    expect(container.textContent).toContain("Booked");
    expect(container.textContent).toContain(receipt.booking_title);
    if (competing)
      expect(container.textContent).not.toContain("Attempted subject");
    expect(api.remember).toHaveBeenLastCalledWith("chat-1", receipt);
    expect(api.signup).toHaveBeenCalledTimes(1);
  },
);

it.each([
  ["rooms", { booking_title: null }],
  ["rooms", { booking_title: "   " }],
  ["rooms", { booking_title: "a".repeat(101) }],
  ["rooms", { starts_at: undefined }],
  ["rooms", { ends_at: null }],
  ["rooms", { ends_at: "2099-11-12T19:30:00" }],
  ["rooms", { service: "events" }],
  ["music", { starts_at: undefined }],
  ["music", { ends_at: null }],
  ["music", { music_window: null }],
  ["music", { starts_at: "2099-11-12T10:15:00+03:00" }],
  ["music", { starts_at: musicOffer.starts_at, ends_at: musicOffer.ends_at }],
  ["music", { ends_at: "2099-11-12T13:00:00+03:00" }],
] as const)(
  "keeps a malformed %s booking receipt unknown: %j",
  async (service, malformed) => {
    const item = service === "rooms" ? roomOffer : musicOffer;
    const selected =
      service === "rooms"
        ? { booking_title: "Attempted subject" }
        : {
            starts_at: "2099-11-12T10:00:00+03:00",
            ends_at: "2099-11-12T11:00:00+03:00",
          };
    api.signup.mockResolvedValue({
      ...item,
      ...selected,
      status: "confirmed",
      ...malformed,
    });
    render({ response: { ...response, signup_offers: [item] } });
    if (service === "music") {
      act(() =>
        container.querySelector<HTMLButtonElement>("li button")!.click(),
      );
      const [start, duration] = container.querySelectorAll("select");
      changeInput(start, "10:00");
      changeInput(duration, "60");
    } else {
      changeInput(
        container.querySelector<HTMLInputElement>("li input")!,
        "Attempted subject",
      );
    }
    await act(async () =>
      container.querySelector<HTMLButtonElement>("li button")!.click(),
    );
    expect(container.textContent).toContain("Booking outcome is unknown");
    expect(container.textContent).not.toContain("Booked");
    expect(api.remember).toHaveBeenLastCalledWith(
      "chat-1",
      expect.objectContaining({
        ...item,
        ...selected,
        status: "unknown",
        message: expect.stringContaining("Do not repeat an uncertain booking"),
      }),
    );
    expect(api.signup).toHaveBeenCalledTimes(1);
    expect(container.querySelector("li button")).toBeNull();
  },
);

it("shows the exact selected interval from a refusal receipt", async () => {
  api.signup.mockResolvedValue({
    ...musicOffer,
    starts_at: "2099-11-12T10:00:00+03:00",
    ends_at: "2099-11-12T11:00:00+03:00",
    status: "refused",
    message: "Window is no longer available",
  });
  render({ response: { ...response, signup_offers: [musicOffer] } });
  act(() => container.querySelector<HTMLButtonElement>("li button")!.click());
  const [start, duration] = container.querySelectorAll("select");
  changeInput(start, "10:00");
  changeInput(duration, "60");
  await act(async () =>
    container.querySelector<HTMLButtonElement>("li button")!.click(),
  );
  expect(container.textContent).toContain("Could not book");
  expect(container.textContent).toContain("10:00–11:00");
  expect(container.textContent).not.toContain("09:00–12:00");
  expect(api.remember).toHaveBeenLastCalledWith(
    "chat-1",
    expect.objectContaining({
      starts_at: "2099-11-12T10:00:00+03:00",
      ends_at: "2099-11-12T11:00:00+03:00",
      status: "refused",
    }),
  );
});

it.each([
  [45, ["", "30"]],
  [240, ["", "30", "60", "90", "120", "150", "180"]],
] as const)(
  "caps grid durations by both quota %s and window length",
  (max_duration_minutes, expected) => {
    render({
      response: {
        ...response,
        signup_offers: [
          {
            ...musicOffer,
            music_window: { ...musicWindow, max_duration_minutes },
          } as unknown as searchTypes.SchemaSignupOffer,
        ],
      },
    });
    expect(container.querySelector("li button")?.textContent).toBe(
      "Choose time",
    );
    act(() => container.querySelector<HTMLButtonElement>("li button")!.click());
    const [, duration] = container.querySelectorAll("select");
    expect(Array.from(duration.options, (option) => option.value)).toEqual(
      expected,
    );
    expect(duration.value).toBe("");
  },
);

it("expires music when no future grid start remains before the latest-start cap", () => {
  const now = vi
    .spyOn(Date, "now")
    .mockReturnValue(Date.parse("2099-11-12T10:05:00+03:00"));
  try {
    render({
      response: {
        ...response,
        signup_offers: [
          {
            ...musicOffer,
            music_window: {
              ...musicWindow,
              latest_start_at: "2099-11-12T10:15:00+03:00",
            },
          } as unknown as searchTypes.SchemaSignupOffer,
        ],
      },
    });
    expect(container.querySelector("li button")).toBeNull();
    expect(container.textContent).toContain(
      "This offer has expired. Ask for current availability.",
    );
  } finally {
    now.mockRestore();
  }
});

it("validates music duration against the offered choices before recording any attempt", async () => {
  render({ response: { ...response, signup_offers: [musicOffer] } });
  act(() => container.querySelector<HTMLButtonElement>("li button")!.click());
  const [start, duration] = container.querySelectorAll("select");
  changeInput(start, "10:00");
  const invalid = document.createElement("option");
  invalid.value = "45";
  duration.append(invalid);
  changeInput(duration, "45");
  await act(async () =>
    container.querySelector<HTMLButtonElement>("li button")!.click(),
  );
  expect(api.signup).not.toHaveBeenCalled();
  expect(api.remember).not.toHaveBeenCalled();
  expect(container.textContent).toContain("Choose a start time and duration.");
});

it("requires explicit Music Room time and duration, then persists the selected Moscow interval before transport", async () => {
  api.signup.mockImplementation(() => {
    expect(api.remember).toHaveBeenCalledWith(
      "chat-1",
      expect.objectContaining({
        status: "unknown",
        starts_at: "2099-11-12T10:00:00+03:00",
        ends_at: "2099-11-12T11:00:00+03:00",
      }),
    );
    return Promise.reject(new TypeError("Lost reply"));
  });
  render({ response: { ...response, signup_offers: [musicOffer] } });
  expect(container.textContent).toContain("Available window");
  expect(container.textContent).toContain("09:00–12:00");
  expect(container.querySelector("li button")?.textContent).toBe("Choose time");
  act(() => container.querySelector<HTMLButtonElement>("li button")!.click());
  expect(api.signup).not.toHaveBeenCalled();
  expect(api.remember).not.toHaveBeenCalled();
  const [start, duration] = container.querySelectorAll("select");
  expect(start.value).toBe("");
  expect(duration.value).toBe("");
  const book = container.querySelector<HTMLButtonElement>("li button")!;
  expect(book.textContent).toBe("Book");
  await act(async () => book.click());
  expect(api.signup).not.toHaveBeenCalled();
  expect(api.remember).not.toHaveBeenCalled();
  expect(container.textContent).toContain("Choose a start time and duration.");
  changeInput(start, "10:00");
  expect(container.textContent).not.toContain(
    "Choose a start time and duration.",
  );
  expect(duration.value).toBe("");
  changeInput(duration, "60");
  expect(book.parentElement?.textContent).toContain(
    "Nov 12, 2099, 10:00–11:00 · MSK",
  );
  await act(async () => {
    book.click();
    book.click();
  });
  expect(api.signup).toHaveBeenCalledExactlyOnceWith({
    params: { path: { chat_id: "chat-1", offer_id: "offer-1" } },
    headers: {},
    body: { time_from: "10:00", time_to: "11:00" },
  });
  expect(container.textContent).toContain("Booking outcome is unknown");
  expect(container.textContent).toContain("10:00–11:00");
  expect(container.textContent).not.toContain("09:00–12:00");
  expect(container.textContent).not.toContain("Available window");
  expect(container.textContent).toContain("Check booking in the service");
  expect(container.querySelector("button")).toBeNull();
});

function changeInput(
  element: HTMLInputElement | HTMLSelectElement,
  value: string,
) {
  act(() => {
    const prototype =
      element instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
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

it.each(["a".repeat(101), "🎵".repeat(101)])(
  "rejects an oversized room subject before consuming the attempt: %s",
  async (title) => {
    render({ response: { ...response, signup_offers: [roomOffer] } });
    const input = container.querySelector<HTMLInputElement>("li input")!;
    const button = container.querySelector<HTMLButtonElement>("li button")!;
    changeInput(input, title);
    await act(async () => button.click());
    expect(api.remember).not.toHaveBeenCalled();
    expect(api.signup).not.toHaveBeenCalled();
    expect(input.value).toBe(title);
    expect(button.disabled).toBe(false);
    expect(container.textContent).toContain(
      "Booking subject must be 100 characters or fewer.",
    );

    const validTitle =
      title === "a".repeat(101) ? "a".repeat(100) : "🎵".repeat(100);
    changeInput(input, validTitle);
    api.signup.mockResolvedValue({
      ...roomOffer,
      booking_title: validTitle,
      status: "confirmed",
    });
    await act(async () => button.click());
    expect(api.signup).toHaveBeenCalledExactlyOnceWith({
      params: { path: { chat_id: "chat-1", offer_id: "offer-1" } },
      headers: {},
      body: { booking_title: validTitle },
    });
    expect(container.textContent).toContain("Booked");
  },
);

it("requires a room subject inline and books only the exact supplied title", async () => {
  render({ response: { ...response, signup_offers: [roomOffer] } });
  expect(container.textContent).toContain("Meeting room 301");
  expect(container.textContent).toContain("University, floor 3");
  const button = container.querySelector<HTMLButtonElement>("li button")!;
  expect(button.textContent).toBe("Book");
  await act(async () => button.click());
  expect(api.signup).not.toHaveBeenCalled();
  expect(api.remember).not.toHaveBeenCalled();
  expect(container.textContent).toContain("Enter a booking subject.");
  const input = container.querySelector("li input")! as HTMLInputElement;
  expect(input.value).toBe("");
  expect(input.required).toBe(true);
  changeInput(input, "Thesis rehearsal");
  expect(container.textContent).not.toContain("Enter a booking subject.");
  api.signup.mockResolvedValue({
    ...roomOffer,
    booking_title: "Thesis rehearsal",
    status: "confirmed",
  });
  await act(async () => button.click());
  expect(api.signup).toHaveBeenCalledExactlyOnceWith({
    params: { path: { chat_id: "chat-1", offer_id: "offer-1" } },
    headers: {},
    body: { booking_title: "Thesis rehearsal" },
  });
  expect(api.remember).toHaveBeenNthCalledWith(
    1,
    "chat-1",
    expect.objectContaining({
      booking_title: "Thesis rehearsal",
      status: "unknown",
    }),
  );
  expect(container.textContent).toContain("Booked");
  expect(api.headers).not.toHaveBeenCalled();
});

it("groups offers by Moscow date with compact intervals and separate titles and actions", () => {
  render({
    response: {
      ...response,
      signup_offers: [
        offer,
        {
          ...offer,
          id: "offer-2",
          title: "Football",
          starts_at: "2099-11-12T17:00:00Z",
          ends_at: "2099-11-12T18:30:00Z",
        },
        {
          ...offer,
          id: "offer-3",
          title: "Basketball",
          starts_at: "2099-11-12T21:00:00Z",
          ends_at: "2099-11-12T22:30:00Z",
        },
      ],
    },
  });
  expect(
    Array.from(container.querySelectorAll("h3"), (el) => el.textContent),
  ).toEqual(["Nov 12, 2099 · MSK", "Nov 13, 2099 · MSK"]);
  const rows = container.querySelectorAll("li");
  expect(rows).toHaveLength(3);
  expect(rows[0].querySelector("h4")?.textContent).toBe("Volleyball");
  expect(rows[0].textContent).toContain("18:00–19:30");
  expect(rows[1].textContent).toContain("20:00–21:30");
  expect(rows[2].textContent).toContain("00:00–01:30");
  expect(rows[0].textContent).not.toContain("2099");
  expect(rows[0].querySelector("button")?.classList.contains("btn")).toBe(true);
  act(() => rows[0].querySelector("h4")!.click());
  expect(api.signup).not.toHaveBeenCalled();
});

it("gives signup lists the chat width even when the answer is short", () => {
  render({ response: { ...response, answer: "Options:" } });
  expect(container.firstElementChild?.classList.contains("w-full")).toBe(true);
  expect(container.firstElementChild?.classList.contains("min-w-0")).toBe(true);
  render({ response: { ...response, answer: "Hello", signup_offers: [] } });
  expect(container.firstElementChild?.classList.contains("w-full")).toBe(false);
});

it("replaces the action in place with one confirmation, without repeating the server receipt", async () => {
  render();
  const row = container.querySelector("li");
  api.signup.mockResolvedValue({
    ...offer,
    status: "confirmed",
    message: "Запись подтверждена в сервисе.",
  });
  await act(async () => container.querySelector("button")!.click());
  expect(container.querySelector("li")).toBe(row);
  expect(row?.textContent).toContain("You are signed up");
  expect(row?.textContent).not.toContain("Запись подтверждена в сервисе.");
  expect(row?.querySelector("button")).toBeNull();
});

it("keeps both full dates for overnight offers", () => {
  render({
    response: {
      ...response,
      signup_offers: [
        {
          ...offer,
          starts_at: "2099-12-31T23:30:00+03:00",
          ends_at: "2100-01-01T01:00:00+03:00",
        },
      ],
    },
  });
  const row = container.querySelector("li")!;
  expect(row.textContent).toContain("Dec 31, 2099, 23:30 – Jan 1, 2100, 01:00");
});

it("does not invent an end time when it is unknown", () => {
  render({
    response: { ...response, signup_offers: [{ ...offer, ends_at: null }] },
  });
  const details = container.querySelector("li p")!;
  expect(details.textContent).toBe("18:00 · Sports complex");
});

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
