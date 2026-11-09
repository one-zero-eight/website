import type { searchTypes } from "@/api/search";
import { i18n as appI18n, setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AskPage } from "./AskPage";
import {
  askQuestion,
  decideApproval,
  openChat,
  setDraftQuery,
  startNewChat,
} from "./ask-session";

const api = vi.hoisted(() => ({
  history: vi.fn(),
  download: vi.fn(),
  query: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  post: vi.fn(),
}));
vi.mock("./AskChatList", () => ({ AskChatList: () => null }));
vi.mock("./AskResult", () => ({ AskResult: () => null }));
vi.mock("@/components/search/SourceRequests", () => ({
  SourceRequests: () => "Propose a chat",
}));
vi.mock("./AskSources", () => ({
  AskSources: () => createElement("button", { type: "button" }, "Sources"),
}));
vi.mock("@/api/accounts", () => ({ accountsFetch: {} }));
vi.mock("@/api/helpers/sport-access-token.ts", () => ({
  getMySportAccessToken: () => null,
}));
vi.mock("@/api/search", () => ({
  searchFetch: { POST: api.post },
  $search: {
    queryOptions: (...args: unknown[]) => ({ queryKey: args }),
    useMutation: (method: string) => ({
      mutateAsync: method === "post" ? api.upload : api.remove,
    }),
    useQuery: (...args: unknown[]) => {
      api.query(...args);
      return { refetch: api.download, isFetching: false, error: null };
    },
  },
}));
vi.mock("@/app/query-client", () => ({
  queryClient: { fetchQuery: api.history, invalidateQueries: vi.fn() },
}));
const info = {
  id: "file-1",
  filename: "private.pdf",
  media_type: "application/pdf",
  size_bytes: 2048,
  pages: 2,
} satisfies searchTypes.SchemaAttachmentInfo;
const answer = {
  query: "Read it",
  answer: "Hello",
  chat_id: "chat-1",
  search_responses: [],
  calendar_events: [],
  signup_offers: [],
  messages: [],
  attachments: [info],
} satisfies searchTypes.SchemaAskResponses;

describe("AskPage attachment history", () => {
  let root: Root;
  let container: HTMLDivElement;
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    appI18n.loadAndActivate({ locale: "en", messages: {} });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:private");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    api.history
      .mockReset()
      .mockResolvedValue({ answers: [answer], waiting: null });
    api.query.mockClear();
    api.download.mockReset();
    api.upload.mockReset();
    api.post.mockReset();
    startNewChat();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    const i18n = setupI18n({ locale: "en", messages: { en: {} } });
    act(() =>
      root.render(
        createElement(
          I18nProvider,
          { i18n },
          createElement(AskPage, { askQuery: "" }),
        ),
      ),
    );
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  it("retries history from the error UI while keeping the user's draft", async () => {
    api.history.mockRejectedValueOnce(new Error("History unavailable"));
    await act(async () => openChat("chat-1"));
    const textarea = container.querySelector("textarea")!;
    const setValue = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )!.set!;
    act(() => {
      setValue.call(textarea, "Keep my draft");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    });
    let finish!: (value: { answers: (typeof answer)[] }) => void;
    api.history.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const retry = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Retry",
    )!;
    act(() => retry.click());
    expect(container.textContent).not.toContain("History unavailable");
    expect(container.querySelector(".skeleton")).not.toBeNull();
    expect(
      Array.from(container.querySelectorAll("button")).some(
        (button) => button.textContent === "Retry",
      ),
    ).toBe(false);
    await act(async () => finish({ answers: [answer] }));
    expect(container.textContent).toContain("Read it");
    expect(container.querySelector("textarea")).toBe(textarea);
    expect(textarea.value).toBe("Keep my draft");
    expect(api.history).toHaveBeenCalledTimes(2);
  });

  it.each([
    {
      status: 403,
      body: { detail: "Forbidden" },
      expected: "Error 403: Forbidden",
    },
    {
      status: 422,
      body: {
        detail: [
          { msg: "Value error, Query is required" },
          { msg: "File is too large" },
        ],
      },
      expected: "Query is required; File is too large",
    },
    { status: 503, body: undefined, expected: "Error 503" },
    {
      status: 200,
      body: undefined,
      expected: "The server returned no answer stream.",
    },
    { status: null, body: undefined, expected: "Network error: Offline" },
  ])(
    "shows request failure $expected and restores the draft without resending",
    async ({ status, body, expected }) => {
      if (status === null)
        api.post.mockRejectedValueOnce(new TypeError("Offline"));
      else
        api.post.mockResolvedValueOnce({
          response: new Response(null, { status }),
          error: body,
        });
      await act(async () => askQuestion("Read it", [info]));
      expect(container.textContent).toContain(
        "Could not complete the request.",
      );
      expect(container.textContent).toContain(expected);
      expect(container.textContent).toContain(
        "Your draft is below. You can edit it and send it again.",
      );
      expect(container.querySelector("textarea")!.value).toBe("Read it");
      expect(container.textContent).toContain("private.pdf");
      expect(api.post).toHaveBeenCalledOnce();
    },
  );

  it("reports an incomplete stream and keeps bound files available for manual retry", async () => {
    api.post.mockResolvedValueOnce({
      response: new Response(),
      data: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              'event: chat\ndata: {"chat_id":"chat-1"}\n\nevent: answer\ndata: {"text":"Partial"}\n\n',
            ),
          );
          controller.close();
        },
      }),
    });
    await act(async () => askQuestion("Read it", [info]));
    expect(container.textContent).toContain(
      "The connection ended before the response was complete.",
    );
    expect(container.querySelector("textarea")!.value).toBe("Read it");
    expect(
      JSON.parse(sessionStorage.getItem("search-ask-session")!)
        .draftAttachments,
    ).toEqual([{ info, bound: true }]);
    expect(api.post).toHaveBeenCalledOnce();
  });

  it.each([403, 422, 503, null])(
    "warns of an uncertain action result after decision failure %s",
    async (status) => {
      api.history.mockResolvedValueOnce({
        answers: [],
        waiting: { ...answer, approval: { id: "approval-1", actions: [] } },
      });
      await act(async () => openChat("chat-1"));
      act(() => setDraftQuery("An unrelated draft"));
      if (status === null)
        api.post.mockRejectedValueOnce(new TypeError("Offline"));
      else
        api.post.mockResolvedValueOnce({
          response: new Response(null, { status }),
          error:
            status === 403
              ? { detail: "Forbidden" }
              : status === 422
                ? { detail: [{ msg: "Invalid decision" }] }
                : undefined,
        });
      await act(async () => decideApproval("approve"));
      expect(container.textContent).toContain(
        "The action result could not be confirmed. Check the service before trying again.",
      );
      expect(container.textContent).toContain(
        status === null
          ? "Network error: Offline"
          : status === 403
            ? "Error 403: Forbidden"
            : status === 422
              ? "Invalid decision"
              : "Error 503",
      );
      expect(container.textContent).not.toContain("Your draft is below.");
      expect(container.querySelector("textarea")!.value).toBe(
        "An unrelated draft",
      );
      expect(api.post).toHaveBeenCalledOnce();
    },
  );

  it("opens a notification deep link and consumes it so later chat choices stay put", async () => {
    const handled = vi.fn();
    await act(async () =>
      root.render(
        createElement(
          I18nProvider,
          {
            i18n: setupI18n({ locale: "en", messages: { en: {} } }),
          },
          createElement(AskPage, {
            askQuery: "",
            askChat: "notified-chat",
            onChatLinkHandled: handled,
          }),
        ),
      ),
    );
    expect(api.history).toHaveBeenCalledWith({
      queryKey: [
        "get",
        "/ask/chats/{chat_id}",
        { params: { path: { chat_id: "notified-chat" } } },
      ],
    });
    expect(handled).toHaveBeenCalled();
  });
  it("does not interrupt an ongoing answer when its own chat notification opens", async () => {
    await act(async () => openChat("chat-1"));
    let finish!: () => void;
    api.post.mockResolvedValueOnce({
      response: new Response(),
      data: new ReadableStream<Uint8Array>({
        start(controller) {
          finish = () => controller.close();
        },
      }),
    });
    let pending!: Promise<void>;
    await act(async () => {
      pending = askQuestion("Continue");
    });
    const signal = api.post.mock.calls[0][1].signal;
    api.history.mockClear();
    await act(async () =>
      root.render(
        createElement(
          I18nProvider,
          {
            i18n: setupI18n({ locale: "en", messages: { en: {} } }),
          },
          createElement(AskPage, {
            askQuery: "",
            askChat: "chat-1",
            onChatLinkHandled: vi.fn(),
          }),
        ),
      ),
    );
    expect(signal.aborted).toBe(false);
    expect(api.history).not.toHaveBeenCalled();
    await act(async () => {
      finish();
      await pending;
    });
  });
  it("does not create a private blob URL after the attachment leaves the page", async () => {
    await act(async () => openChat("chat-1"));
    let finish!: (result: { data: Blob; error: null }) => void;
    api.download.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          'button[title="Download attachment"]',
        )!
        .click(),
    );
    act(() => startNewChat());
    await act(async () => finish({ data: new Blob(["pdf"]), error: null }));
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
  it("shows a private download error without losing the filename", async () => {
    await act(async () => openChat("chat-1"));
    api.download.mockResolvedValueOnce({
      data: undefined,
      error: new Error("Download unavailable"),
    });
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          'button[title="Download attachment"]',
        )!
        .click(),
    );
    expect(container.textContent).toContain("Download unavailable");
    expect(container.textContent).toContain("private.pdf");
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
  it("does not attach an old upload to a newly opened chat", async () => {
    let finish!: (value: typeof info) => void;
    api.upload.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    api.remove.mockResolvedValue(null);
    const input =
      container.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, "files", {
      value: [new File(["pdf"], "private.pdf")],
    });
    await act(async () =>
      input.dispatchEvent(new Event("change", { bubbles: true })),
    );
    api.history.mockResolvedValueOnce({ answers: [], waiting: null });
    await act(async () => openChat("another-chat"));
    await act(async () => finish(info));
    expect(container.textContent).not.toContain("private.pdf");
    expect(api.remove).toHaveBeenCalledWith({
      params: { path: { attachment_id: info.id } },
    });
    expect(
      container.querySelector<HTMLButtonElement>('button[title="Send"]')!
        .disabled,
    ).toBe(true);
  });
  it("sends a file-only question with neutral wording and attachment IDs", async () => {
    api.upload.mockResolvedValueOnce(info);
    const input =
      container.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, "files", {
      value: [new File(["pdf"], "private.pdf")],
      configurable: true,
    });
    await act(async () =>
      input.dispatchEvent(new Event("change", { bubbles: true })),
    );
    expect(container.textContent).toContain("private.pdf");
    const button = container.querySelector<HTMLButtonElement>(
      'button[title="Send"]',
    )!;
    expect(button.disabled).toBe(false);
    api.post.mockResolvedValueOnce({
      response: new Response(),
      data: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              `event: done\ndata: ${JSON.stringify(answer)}\n\n`,
            ),
          );
          controller.close();
        },
      }),
    });
    await act(async () => button.click());
    expect(api.post.mock.calls[0][1].body).toEqual({
      query: "What is in the attached file?",
      chat_id: null,
      attachment_ids: [info.id],
    });
  });
  it.each(["done", "error", "cancelled"])(
    "renders Markdown before completion and clears activity on %s",
    async (outcome) => {
      const longText = "AAMkADAx".repeat(100);
      const text = `**Rules**\n\n- [Original document](https://example.org/rules)\n- ${longText}`;
      let controller!: ReadableStreamDefaultController<Uint8Array>;
      api.post.mockResolvedValueOnce({
        response: new Response(),
        data: new ReadableStream<Uint8Array>({
          start(value) {
            controller = value;
          },
        }),
      });
      let pending!: Promise<void>;
      await act(async () => {
        pending = askQuestion("Find rules");
      });
      expect(container.textContent).toContain("Sending request");
      await act(async () =>
        controller.enqueue(
          new TextEncoder().encode(
            `event: answer\ndata: ${JSON.stringify({ text })}\n\n`,
          ),
        ),
      );
      expect(container.querySelector("strong")?.textContent).toBe("Rules");
      expect(
        Array.from(container.querySelectorAll("li"), (li) => li.textContent),
      ).toEqual(["Original document", longText]);
      const link = container.querySelector<HTMLAnchorElement>(
        'a[href="https://example.org/rules"]',
      )!;
      expect(link.textContent).toBe("Original document");
      expect(link.target).toBe("_blank");
      expect(container.textContent).toContain("Receiving answer");
      await act(async () =>
        controller.enqueue(
          new TextEncoder().encode(
            'event: status\ndata: {"text":"Checking university rules"}\n\n',
          ),
        ),
      );
      expect(container.textContent).toContain("Checking university rules");
      expect(container.textContent).toContain(longText);
      expect(
        container.querySelector('a[href="https://example.org/rules"]')
          ?.textContent,
      ).toBe("Original document");
      await act(async () => {
        controller.enqueue(
          new TextEncoder().encode(
            `event: ${outcome}\ndata: ${JSON.stringify(outcome === "done" ? { ...answer, answer: text } : { detail: "Stopped" })}\n\n`,
          ),
        );
        controller.close();
        await pending;
      });
      expect(container.textContent).not.toContain("Checking university rules");
      expect(container.querySelector('button[title="Stop"]')).toBeNull();
      expect(container.querySelector('button[title="Send"]')).not.toBeNull();
    },
  );

  it("shows private history files with size and pages, downloading only on request", async () => {
    await act(async () => openChat("chat-1"));
    expect(container.textContent).toContain("private.pdf");
    expect(container.textContent).toContain("2,048 bytes");
    expect(container.textContent).toContain("2 pages");
    expect(api.download).not.toHaveBeenCalled();
    api.download.mockResolvedValueOnce({
      data: new Blob(["pdf"]),
      error: null,
    });
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          'button[title="Download attachment"]',
        )!
        .click(),
    );
    expect(api.query).toHaveBeenCalledWith(
      "get",
      "/ask/attachments/{attachment_id}/content",
      expect.objectContaining({
        params: { path: { attachment_id: info.id } },
        parseAs: "blob",
      }),
      expect.objectContaining({ enabled: false, gcTime: 0 }),
    );
    expect(api.download).toHaveBeenCalledOnce();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce();
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(container.querySelector('a[href*="token"]')).toBeNull();
  });
});
