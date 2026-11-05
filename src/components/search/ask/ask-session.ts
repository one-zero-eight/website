import { searchFetch, searchTypes } from "@/api/search";
import { useSyncExternalStore } from "react";

export type AskMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; response: searchTypes.SchemaAskResponses };

type AskSession = {
  messages: AskMessage[];
  chatId: string | null;
  // The answer being written and what the assistant is doing meanwhile
  answerText: string;
  status: string;
  isPending: boolean;
  error: Error | null;
};

type AskStreamEvent =
  | { name: "cancelled"; data: { detail: string } }
  | { name: "status"; data: { text: string } }
  | { name: "answer"; data: { text: string } }
  | { name: "done"; data: searchTypes.SchemaAskResponses }
  | { name: "error"; data: { detail: string } };

// The conversation with the assistant lives outside the page: going to another page and back keeps the questions and the
// answers, and an answer being written goes on meanwhile. The questions and the answers are kept in this tab
// (sessionStorage), so a reload keeps them too; an answer that was being written is lost with the page
const STORAGE_KEY = "search-ask-session";

const saved: Pick<AskSession, "messages" | "chatId"> = JSON.parse(
  sessionStorage.getItem(STORAGE_KEY) ??
    JSON.stringify({ messages: [], chatId: null }),
);

let session: AskSession = {
  ...saved,
  answerText: "",
  status: "",
  isPending: false,
  error: null,
};
let abortController: AbortController | null = null;
const listeners = new Set<() => void>();

function update(patch: Partial<AskSession>) {
  session = { ...session, ...patch };
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ messages: session.messages, chatId: session.chatId }),
  );
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAskSession() {
  return useSyncExternalStore(subscribe, () => session);
}

function parseEvent(block: string): AskStreamEvent | undefined {
  const name = block.match(/^event: (.+)$/m)?.[1];
  const data = block.match(/^data: (.+)$/m)?.[1];
  if (!name || !data) return undefined;
  return { name, data: JSON.parse(data) } as AskStreamEvent;
}

// The final answer, or undefined when the question was cancelled
async function streamAnswer(
  query: string,
  chatId: string | null,
  signal: AbortSignal,
): Promise<searchTypes.SchemaAskResponses | undefined> {
  const { data: stream, error: requestError } = await searchFetch.POST(
    "/ask/stream",
    {
      body: { query, chat_id: chatId },
      parseAs: "stream",
      signal,
    },
  );
  if (requestError || !stream) {
    throw new Error("Failed to start the answer");
  }

  const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += value;

    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";
    for (const block of blocks) {
      const event = parseEvent(block);
      if (event?.name === "cancelled") {
        return undefined;
      } else if (event?.name === "status") {
        update({ status: event.data.text });
      } else if (event?.name === "answer") {
        update({ answerText: event.data.text });
      } else if (event?.name === "error") {
        throw new Error(event.data.detail);
      } else if (event?.name === "done") {
        return event.data;
      }
    }
  }
  throw new Error("The answer ended unexpectedly");
}

export async function askQuestion(query: string) {
  abortController?.abort();
  const controller = new AbortController();
  abortController = controller;

  update({
    messages: [...session.messages, { role: "user", content: query }],
    answerText: "",
    status: "",
    error: null,
    isPending: true,
  });

  try {
    const response = await streamAnswer(
      query,
      session.chatId,
      controller.signal,
    );
    if (response) {
      update({
        messages: [...session.messages, { role: "assistant", response }],
        chatId: response.chat_id ?? null,
      });
    }
  } catch (e) {
    if (!controller.signal.aborted) {
      update({ error: e instanceof Error ? e : new Error(String(e)) });
    }
  } finally {
    if (abortController === controller) {
      abortController = null;
      update({ isPending: false });
    }
  }
}

// Closing the stream cancels the question on the server, even if it is still waiting in the queue
export function cancelQuestion() {
  abortController?.abort();
  abortController = null;
  update({ isPending: false });
}

// A new conversation: the assistant does not see the earlier questions any more
export function startNewChat() {
  cancelQuestion();
  update({
    messages: [],
    chatId: null,
    answerText: "",
    status: "",
    error: null,
  });
}
