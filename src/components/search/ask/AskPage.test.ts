import type { searchTypes } from "@/api/search";
import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AskPage } from "./AskPage";
import { askQuestion, openChat, startNewChat } from "./ask-session";

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
  it("shows Sources in the top chat header and keeps notifications below the composer", () => {
    expect(container.textContent).toContain("Sources");
    expect(container.textContent).toContain("Chats");
    expect(container.querySelectorAll("button").length).toBeGreaterThan(2);
    expect(container.textContent).not.toContain("Propose a chat");
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
  it("wraps long words in user messages and streaming answers without truncating them", async () => {
    const text = "AAMkADAx".repeat(100);
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    api.post.mockResolvedValueOnce({
      data: new ReadableStream<Uint8Array>({
        start(streamController) {
          controller = streamController;
        },
      }),
    });
    let pending!: Promise<void>;
    await act(async () => {
      pending = askQuestion(text);
    });
    try {
      await act(async () => {
        controller.enqueue(
          new TextEncoder().encode(
            `event: answer\ndata: ${JSON.stringify({ text })}\n\n`,
          ),
        );
      });
      const userMessage = container.querySelector(".bg-primary")!;
      const streamingAnswer = container.querySelector("p.whitespace-pre-wrap")!;
      for (const element of [userMessage, streamingAnswer.parentElement!]) {
        expect(element.textContent).toBe(text);
        expect(element.classList.contains("min-w-0")).toBe(true);
        expect(element.classList.contains("wrap-anywhere")).toBe(true);
      }
      expect(
        streamingAnswer.parentElement!.classList.contains("max-w-full"),
      ).toBe(true);
    } finally {
      await act(async () => {
        controller.close();
        await pending;
      });
    }
  });

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
