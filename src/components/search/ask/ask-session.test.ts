import type { searchTypes } from "@/api/search";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  post: vi.fn(),
  history: vi.fn(),
  invalidate: vi.fn(),
}));
vi.mock("@/api/accounts", () => ({ accountsFetch: { GET: vi.fn() } }));
vi.mock("@/api/helpers/sport-access-token.ts", () => ({
  getMySportAccessToken: () => null,
  setMySportAccessToken: vi.fn(),
}));
vi.mock("@/api/search", () => ({
  searchFetch: { POST: api.post },
  $search: { queryOptions: (...args: unknown[]) => ({ queryKey: args }) },
}));
vi.mock("@/app/query-client", () => ({
  queryClient: { fetchQuery: api.history, invalidateQueries: api.invalidate },
}));
const info = {
  id: "file-1",
  filename: "notes.txt",
  media_type: "text/plain",
  size_bytes: 5,
  pages: 1,
} satisfies searchTypes.SchemaAttachmentInfo;
const answer = {
  query: "Read it",
  answer: "Hello",
  chat_id: "chat-1",
  search_responses: [],
  calendar_events: [],
  messages: [],
  attachments: [info],
} satisfies searchTypes.SchemaAskResponses;
function stream(events: [string, unknown][]) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const [name, data] of events)
        controller.enqueue(
          new TextEncoder().encode(
            `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`,
          ),
        );
      controller.close();
    },
  });
}

describe("ask session attachments", () => {
  let session: typeof import("./ask-session");
  let snapshot: ReturnType<typeof session.useAskSession>;
  let root: Root;
  let container: HTMLDivElement;
  beforeEach(async () => {
    vi.resetModules();
    sessionStorage.clear();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    api.post.mockReset();
    api.history.mockReset();
    api.invalidate.mockReset();
    session = await import("./ask-session");
    function Probe() {
      snapshot = session.useAskSession();
      return null;
    }
    container = document.createElement("div");
    root = createRoot(container);
    act(() => root.render(createElement(Probe)));
  });
  afterEach(() => {
    act(() => root.unmount());
    vi.unstubAllGlobals();
  });
  it("does not bind an unsent draft when an approval stream identifies its chat", async () => {
    const waiting = { ...answer, approval: { id: "approval-1", actions: [] } };
    api.history.mockResolvedValueOnce({ answers: [], waiting });
    await act(async () => session.openChat("chat-1"));
    act(() => session.setDraftAttachments([{ info, bound: false }]));
    api.post.mockResolvedValueOnce({
      data: stream([
        ["chat", { chat_id: "chat-1" }],
        ["done", answer],
      ]),
    });
    await act(async () => session.decideApproval("approve"));
    expect(snapshot.draftAttachments).toEqual([{ info, bound: false }]);
  });
  it("restores attachments from answered and waiting history and keeps them after approval", async () => {
    const waiting = {
      ...answer,
      approval: {
        id: "approval-1",
        actions: [{ name: "call_api_tool", description: "Write" }],
      },
    };
    api.history.mockResolvedValueOnce({ answers: [answer], waiting });
    await act(async () => session.openChat("chat-1"));
    expect(
      snapshot.messages
        .filter((message) => message.role === "user")
        .map((message) => message.attachments),
    ).toEqual([[info], [info]]);
    api.post.mockResolvedValueOnce({ data: stream([["done", answer]]) });
    await act(async () => session.decideApproval("approve"));
    expect(snapshot.messages[2]).toEqual({
      role: "user",
      content: "Read it",
      attachments: [info],
    });
    expect(snapshot.messages[3]).toEqual({
      role: "assistant",
      response: answer,
    });
  });
  it("restores a cancelled question and retries with the same bound files and chat", async () => {
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    const pending = new ReadableStream<Uint8Array>({
      start(value) {
        controller = value;
        controller.enqueue(
          new TextEncoder().encode(
            'event: chat\ndata: {"chat_id":"chat-1"}\n\n',
          ),
        );
      },
    });
    api.post.mockResolvedValueOnce({ data: pending });
    let request!: Promise<void>;
    await act(async () => {
      request = session.askQuestion("Read it", [info]);
    });
    // Binding is persisted before generation finishes, so refresh even if it is cancelled next.
    expect(api.invalidate).toHaveBeenCalledWith({
      queryKey: ["get", "/ask/chats"],
    });
    act(() => session.cancelQuestion());
    expect(snapshot.draftQuery).toBe("Read it");
    expect(snapshot.draftAttachments).toEqual([{ info, bound: true }]);
    expect(snapshot.chatId).toBe("chat-1");
    expect(snapshot.messages).toEqual([]);
    await act(async () => {
      controller.close();
      await request;
    });
    api.post.mockResolvedValueOnce({ data: stream([["done", answer]]) });
    await act(async () => session.askQuestion(snapshot.draftQuery));
    expect(api.post.mock.calls[1][1].body.chat_id).toBe("chat-1");
    expect(api.post.mock.calls[1][1].body.attachment_ids).toEqual([info.id]);
  });
  it("ignores old stream events after switching to a new chat", async () => {
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    api.post.mockResolvedValueOnce({
      data: new ReadableStream<Uint8Array>({
        start(value) {
          controller = value;
        },
      }),
    });
    let request!: Promise<void>;
    await act(async () => {
      request = session.askQuestion("Read it", [info]);
    });
    act(() => session.startNewChat());
    await act(async () => {
      controller.enqueue(
        new TextEncoder().encode(
          `event: chat\ndata: {"chat_id":"old-chat"}\n\nevent: done\ndata: ${JSON.stringify(answer)}\n\n`,
        ),
      );
      controller.close();
      await request;
    });
    expect(snapshot.chatId).toBeNull();
    expect(snapshot.messages).toEqual([]);
    expect(snapshot.draftAttachments).toEqual([]);
    expect(snapshot.draftQuery).toBe("");
    expect(api.invalidate).not.toHaveBeenCalled();
  });
  it("retains the server chat and draft attachments after a streamed failure for retry", async () => {
    api.post.mockResolvedValueOnce({
      data: stream([
        ["chat", { chat_id: "chat-1" }],
        ["error", { detail: "Model unavailable" }],
      ]),
    });
    await act(async () => session.askQuestion("Read it", [info]));
    expect(snapshot.chatId).toBe("chat-1");
    expect(snapshot.draftAttachments).toEqual([{ info, bound: true }]);
    expect(snapshot.draftQuery).toBe("Read it");
    expect(snapshot.error?.message).toBe("Model unavailable");
    expect(api.invalidate).toHaveBeenCalledWith({
      queryKey: ["get", "/ask/chats"],
    });
    api.post.mockResolvedValueOnce({ data: stream([["done", answer]]) });
    await act(async () => session.askQuestion(snapshot.draftQuery));
    expect(api.post.mock.calls[1][1].body).toEqual({
      query: "Read it",
      chat_id: "chat-1",
      attachment_ids: [info.id],
    });
    expect(snapshot.draftAttachments).toEqual([]);
    expect(snapshot.messages).toHaveLength(2);
  });
  it("returns a server-cancelled question to the draft with its files", async () => {
    api.post.mockResolvedValueOnce({
      data: stream([
        ["chat", { chat_id: "chat-1" }],
        ["cancelled", { detail: "Cancelled" }],
      ]),
    });
    await act(async () => session.askQuestion("Read it", [info]));
    expect(snapshot.draftQuery).toBe("Read it");
    expect(snapshot.draftAttachments).toEqual([{ info, bound: true }]);
    expect(snapshot.messages).toEqual([]);
    expect(api.invalidate).toHaveBeenCalledWith({
      queryKey: ["get", "/ask/chats"],
    });
  });
  it("retains unbound attachments after a pre-stream failure", async () => {
    api.post.mockRejectedValueOnce(new TypeError("Offline"));
    await act(async () => session.askQuestion("Read it", [info]));
    expect(snapshot.draftAttachments).toEqual([{ info, bound: false }]);
    expect(snapshot.draftQuery).toBe("Read it");
    expect(snapshot.chatId).toBeNull();
  });
  it("sends attachment IDs and stores metadata on the user question", async () => {
    api.post.mockResolvedValueOnce({
      data: stream([
        ["chat", { chat_id: "chat-1" }],
        ["done", answer],
      ]),
    });
    await act(async () => session.askQuestion("Read it", [info]));
    expect(api.post.mock.calls[0][1].body).toEqual({
      query: "Read it",
      chat_id: null,
      attachment_ids: ["file-1"],
    });
    expect(snapshot.messages[0]).toEqual({
      role: "user",
      content: "Read it",
      attachments: [info],
    });
    const saved = JSON.parse(sessionStorage.getItem("search-ask-session")!);
    expect(saved.messages[0].attachments).toEqual([info]);
    expect(sessionStorage.getItem("search-ask-session")).not.toMatch(
      /blob:|data:/,
    );
  });
});
