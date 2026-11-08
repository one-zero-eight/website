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
  signup_offers: [],
  attachments: [info],
} satisfies searchTypes.SchemaAskResponses;
const signupOffer = {
  id: "offer-1",
  service: "sport",
  title: "Volleyball",
  starts_at: "2099-11-12T18:00:00+03:00",
  ends_at: "2099-11-12T19:30:00+03:00",
  expires_at: "2099-11-12T17:00:00+03:00",
  status: "available",
} as searchTypes.SchemaSignupOffer;
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
  it("announces a completed answer after saving it, without private content", async () => {
    const completed = vi.fn((event: Event) => {
      const saved = JSON.parse(sessionStorage.getItem("search-ask-session")!);
      expect(saved.messages.at(-1)).toEqual({
        role: "assistant",
        response: answer,
      });
      expect((event as CustomEvent).detail).toEqual({
        chatId: "chat-1",
        needsApproval: false,
      });
    });
    window.addEventListener("catix-answer-ready", completed);
    try {
      api.post.mockResolvedValueOnce({ data: stream([["done", answer]]) });
      await act(async () => session.askQuestion("Read it"));
      expect(completed).toHaveBeenCalledOnce();
      expect(snapshot.error).toBeNull();
    } finally {
      window.removeEventListener("catix-answer-ready", completed);
    }
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
  it("announces approval requests and the answer after a decision, but not history", async () => {
    const completed = vi.fn();
    window.addEventListener("catix-answer-ready", completed);
    try {
      const waiting = {
        ...answer,
        approval: { id: "approval-1", actions: [] },
      };
      api.history.mockResolvedValueOnce({ answers: [], waiting });
      await act(async () => session.openChat("chat-1"));
      expect(completed).not.toHaveBeenCalled();
      api.post.mockResolvedValueOnce({ data: stream([["done", answer]]) });
      await act(async () => session.decideApproval("approve"));
      expect(completed).toHaveBeenCalledOnce();
      expect(completed.mock.calls[0][0].detail).toEqual({
        chatId: "chat-1",
        needsApproval: false,
      });
      api.post.mockResolvedValueOnce({ data: stream([["done", waiting]]) });
      await act(async () => session.askQuestion("Please do it"));
      expect(completed).toHaveBeenCalledTimes(2);
      expect(completed.mock.calls[1][0].detail).toEqual({
        chatId: "chat-1",
        needsApproval: true,
      });
    } finally {
      window.removeEventListener("catix-answer-ready", completed);
    }
  });
  it.each(["error", "cancelled", "disconnected", "aborted"])(
    "does not announce a %s stream",
    async (outcome) => {
      const completed = vi.fn();
      window.addEventListener("catix-answer-ready", completed);
      try {
        if (outcome === "aborted") {
          let finish!: (value: { data: ReadableStream<Uint8Array> }) => void;
          api.post.mockReturnValueOnce(
            new Promise((resolve) => {
              finish = resolve;
            }),
          );
          let pending!: Promise<void>;
          await act(async () => {
            pending = session.askQuestion("Read it");
          });
          act(() => session.startNewChat());
          await act(async () => {
            finish({ data: stream([["done", answer]]) });
            await pending;
          });
        } else {
          api.post.mockResolvedValueOnce({
            data: stream(
              outcome === "disconnected"
                ? []
                : [[outcome, { detail: "Stopped" }]],
            ),
          });
          await act(async () => session.askQuestion("Read it"));
        }
        expect(completed).not.toHaveBeenCalled();
      } finally {
        window.removeEventListener("catix-answer-ready", completed);
      }
    },
  );
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

  it("keeps an attempted signup unavailable across chat navigation and reload", async () => {
    const offer = signupOffer;
    api.history.mockResolvedValue({
      answers: [{ ...answer, signup_offers: [offer] }],
    });
    await act(async () => session.openChat("chat-1"));
    const unknown = {
      ...offer,
      status: "unknown",
      message: "Check the service",
    } as searchTypes.SchemaSignupOffer;
    act(() => session.rememberSignup("chat-1", unknown));
    await act(async () => session.openChat("chat-2"));
    expect(snapshot.messages[1]).toMatchObject({
      response: { signup_offers: [offer] },
    });
    await act(async () => session.openChat("chat-1"));
    expect(snapshot.messages[1]).toMatchObject({
      response: { signup_offers: [unknown] },
    });
    await act(async () => session.openChat("chat-2"));
    act(() => root.unmount());
    vi.resetModules();
    session = await import("./ask-session");
    root = createRoot(container);
    function ReloadedProbe() {
      snapshot = session.useAskSession();
      return null;
    }
    act(() => root.render(createElement(ReloadedProbe)));
    api.history.mockResolvedValueOnce({
      answers: [
        {
          ...answer,
          signup_offers: [
            { ...offer, title: "Updated title" },
            { ...offer, id: "offer-2" },
          ],
        },
      ],
    });
    await act(async () => session.openChat("chat-1"));
    expect(snapshot.messages[1]).toMatchObject({
      response: {
        signup_offers: [
          { ...unknown, title: "Updated title" },
          { ...offer, id: "offer-2" },
        ],
      },
    });
    expect(api.post).not.toHaveBeenCalled();
  });

  it.each(["confirmed", "refused"] as const)(
    "retains a late %s receipt without mutating another chat",
    async (status) => {
      const offer = signupOffer;
      api.history.mockResolvedValue({
        answers: [{ ...answer, signup_offers: [offer] }],
      });
      await act(async () => session.openChat("chat-1"));
      act(() =>
        session.rememberSignup("chat-1", {
          ...offer,
          status: "unknown",
        } as searchTypes.SchemaSignupOffer),
      );
      await act(async () => session.openChat("chat-2"));
      const otherMessages = snapshot.messages;
      const result = {
        ...offer,
        status,
        message: "Service receipt",
      } as searchTypes.SchemaSignupOffer;
      act(() => session.rememberSignup("chat-1", result));
      expect(snapshot.messages).toBe(otherMessages);
      expect(snapshot.chatId).toBe("chat-2");
      const saved = JSON.parse(sessionStorage.getItem("search-ask-session")!);
      expect(saved.signupReceipts).toContainEqual(
        expect.objectContaining({
          chatId: "chat-1",
          offerId: offer.id,
          status,
        }),
      );
      await act(async () => session.openChat("chat-1"));
      expect(snapshot.messages[1]).toMatchObject({
        response: { signup_offers: [result] },
      });
    },
  );

  it.each(["confirmed", "refused", "unknown"] as const)(
    "retains authoritative %s history instead of an older receipt",
    async (status) => {
      const offer = signupOffer;
      api.history.mockResolvedValue({
        answers: [{ ...answer, signup_offers: [offer] }],
      });
      await act(async () => session.openChat("chat-1"));
      act(() =>
        session.rememberSignup("chat-1", {
          ...offer,
          status: "unknown",
          message: "Local uncertainty",
        } as searchTypes.SchemaSignupOffer),
      );
      act(() => session.startNewChat());
      const authoritative = {
        ...offer,
        status,
        message: "Server receipt",
      } as searchTypes.SchemaSignupOffer;
      api.history.mockResolvedValueOnce({
        answers: [{ ...answer, signup_offers: [authoritative] }],
      });
      await act(async () => session.openChat("chat-1"));
      expect(snapshot.messages[1]).toMatchObject({
        response: { signup_offers: [authoritative] },
      });
      act(() => session.startNewChat());
      await act(async () => session.openChat("chat-1"));
      expect(snapshot.messages[1]).toMatchObject({
        response: { signup_offers: [authoritative] },
      });
    },
  );

  it("never evicts a still-actionable receipt to make room for newer attempts", async () => {
    const offer = signupOffer;
    api.history.mockResolvedValue({
      answers: [{ ...answer, signup_offers: [offer] }],
    });
    await act(async () => session.openChat("chat-1"));
    act(() =>
      session.rememberSignup("chat-1", {
        ...offer,
        status: "unknown",
      } as searchTypes.SchemaSignupOffer),
    );
    act(() => session.startNewChat());
    for (let index = 0; index < 200; index++) {
      session.rememberSignup("chat-2", {
        ...offer,
        id: `other-${index}`,
        status: "confirmed",
      } as searchTypes.SchemaSignupOffer);
    }
    await act(async () => session.openChat("chat-1"));
    expect(snapshot.messages[1]).toMatchObject({
      response: { signup_offers: [{ ...offer, status: "unknown" }] },
    });
  });

  it("removes only the deleted chat's signup receipts", async () => {
    const receipt = {
      ...signupOffer,
      status: "unknown",
    } as searchTypes.SchemaSignupOffer;
    session.rememberSignup("chat-1", receipt);
    session.rememberSignup("chat-2", receipt);
    api.history.mockResolvedValueOnce({ answers: [answer] });
    await act(async () => session.openChat("chat-2"));
    const messages = snapshot.messages;
    act(() => session.forgetChat("chat-1"));
    expect(snapshot.messages).toBe(messages);
    const saved = JSON.parse(sessionStorage.getItem("search-ask-session")!);
    expect(saved.signupReceipts).toEqual([
      expect.objectContaining({ chatId: "chat-2", offerId: receipt.id }),
    ]);
  });

  it("prunes receipts once their offers can no longer be attempted", () => {
    const clock = vi
      .spyOn(Date, "now")
      .mockReturnValue(Date.parse(signupOffer.expires_at) - 1);
    try {
      session.rememberSignup("chat-1", {
        ...signupOffer,
        status: "unknown",
      } as searchTypes.SchemaSignupOffer);
      expect(
        JSON.parse(sessionStorage.getItem("search-ask-session")!)
          .signupReceipts,
      ).toHaveLength(1);
      clock.mockReturnValue(Date.parse(signupOffer.expires_at));
      act(() => session.setDraftQuery("Next question"));
      expect(
        JSON.parse(sessionStorage.getItem("search-ask-session")!)
          .signupReceipts,
      ).toEqual([]);
    } finally {
      clock.mockRestore();
    }
  });

  it("persists a signup result on its original answer without adding a question", async () => {
    const offer = signupOffer;
    api.history.mockResolvedValueOnce({
      answers: [{ ...answer, signup_offers: [offer] }, answer],
    });
    await act(async () => session.openChat("chat-1"));
    const confirmed = {
      ...offer,
      status: "confirmed",
    } as searchTypes.SchemaSignupOffer;
    act(() => session.rememberSignup("chat-1", confirmed));
    expect(snapshot.messages).toHaveLength(4);
    expect(snapshot.messages[1]).toMatchObject({
      response: { signup_offers: [confirmed] },
    });
    expect(snapshot.messages[3]).toEqual({
      role: "assistant",
      response: answer,
    });
    const saved = JSON.parse(sessionStorage.getItem("search-ask-session")!);
    expect(saved.messages[1].response.signup_offers).toEqual([confirmed]);
    expect(api.post).not.toHaveBeenCalled();
    act(() => session.startNewChat());
    act(() => session.rememberSignup("chat-1", confirmed));
    expect(snapshot.messages).toEqual([]);
  });
});
