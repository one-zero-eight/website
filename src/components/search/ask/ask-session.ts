import { $search, searchFetch, searchTypes } from "@/api/search";
import { AskResponsesFeedbackAnyOf0 as AskResponseFeedback } from "@/api/search/types";
import { queryClient } from "@/app/query-client";
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
  // A chat being opened from the list of the user's chats, and why it could not be
  isOpening: boolean;
  openingError: unknown;
};

type AskStreamEvent =
  | { name: "cancelled"; data: { detail: string } }
  | { name: "status"; data: { text: string } }
  | { name: "answer"; data: { text: string } }
  | { name: "done"; data: searchTypes.SchemaAskResponses }
  | { name: "error"; data: { detail: string } };

// The conversation with the assistant lives outside the page: going to another page and back keeps the questions and the
// answers, and an answer being written goes on meanwhile. The questions and the answers are kept in this tab
// (sessionStorage), so a reload keeps them too; an answer that was being written is lost with the page. The server keeps
// every chat of the user as well: one of them opens again from the list of chats (`openChat`)
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
  isOpening: false,
  openingError: null,
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

  // A question left without an answer (it failed) is not in the chat: the assistant does not remember it either
  const answered =
    session.messages.at(-1)?.role === "user"
      ? session.messages.slice(0, -1)
      : session.messages;
  update({
    messages: [...answered, { role: "user", content: query }],
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
      queryClient.invalidateQueries({
        queryKey: $search.queryOptions("get", "/ask/chats").queryKey,
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

// Closing the stream cancels the question on the server, even if it is still waiting in the queue. The question is not in
// the chat then (the assistant does not remember it either): it is given back, to be asked again or changed
export function cancelQuestion(): string {
  const last = session.messages.at(-1);
  const question =
    session.isPending && last?.role === "user" ? last.content : "";
  abortController?.abort();
  abortController = null;
  update({
    isPending: false,
    messages: question ? session.messages.slice(0, -1) : session.messages,
  });
  return question;
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
    isOpening: false,
    openingError: null,
  });
}

// A chat the user deleted: when it is the open one, a new conversation starts in its place
export function forgetChat(chatId: string) {
  if (session.chatId === chatId) startNewChat();
}

// One of the user's chats with its questions and answers, as the server keeps them, to go on with it
export async function openChat(chatId: string) {
  if (chatId === session.chatId && !session.isPending && !session.isOpening) {
    return;
  }
  cancelQuestion();
  update({
    messages: [],
    chatId,
    answerText: "",
    status: "",
    error: null,
    isOpening: true,
    openingError: null,
  });

  try {
    const history = await queryClient.fetchQuery(
      $search.queryOptions("get", "/ask/chats/{chat_id}", {
        params: { path: { chat_id: chatId } },
      }),
    );
    if (session.chatId !== chatId) return; // Another chat was opened meanwhile
    update({
      isOpening: false,
      messages: history.answers.flatMap((response): AskMessage[] => [
        { role: "user", content: response.query },
        { role: "assistant", response },
      ]),
    });
  } catch (e) {
    if (session.chatId !== chatId) return;
    update({ isOpening: false, openingError: e });
  }
}

// The user's vote on an answer: the answer shows it when the page opens again
export function rememberFeedback(
  askQueryId: string,
  feedback: "like" | "dislike",
  comment: string | null,
) {
  update({
    messages: session.messages.map((message) =>
      message.role === "assistant" &&
      message.response.ask_query_id === askQueryId
        ? {
            ...message,
            response: {
              ...message.response,
              feedback: AskResponseFeedback[feedback],
              feedback_comment: comment,
            },
          }
        : message,
    ),
  });
}
