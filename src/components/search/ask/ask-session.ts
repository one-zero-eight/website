import { accountsFetch } from "@/api/accounts";
import { checkIsTokenExpired } from "@/api/helpers/access-token.ts";
import {
  getMySportAccessToken,
  setMySportAccessToken,
} from "@/api/helpers/sport-access-token.ts";
import { $search, searchFetch, searchTypes } from "@/api/search";
import {
  AskDecisionDecision,
  AskResponsesFeedbackAnyOf0 as AskResponseFeedback,
} from "@/api/search/types";
import { queryClient } from "@/app/query-client";
import { useSyncExternalStore } from "react";

export type DraftAttachment = {
  info: searchTypes.SchemaAttachmentInfo;
  // Once sent, the attachment belongs to the chat and must not be deleted as a draft.
  bound?: boolean;
};

export type AskMessage =
  | {
      role: "user";
      content: string;
      attachments?: searchTypes.SchemaAttachmentInfo[];
    }
  | { role: "assistant"; response: searchTypes.SchemaAskResponses };

export const askAnswerReadyEvent = "catix-answer-ready";
export type AskAnswerReady = { chatId: string | null; needsApproval: boolean };

function announceAnswer(response: searchTypes.SchemaAskResponses) {
  window.dispatchEvent(
    new CustomEvent<AskAnswerReady>(askAnswerReadyEvent, {
      detail: {
        chatId: session.chatId,
        needsApproval: !!response.approval,
      },
    }),
  );
}

type AskSession = {
  messages: AskMessage[];
  chatId: string | null;
  draftQuery: string;
  draftAttachments: DraftAttachment[];
  composerId: number;
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
  | { name: "chat"; data: { chat_id: string } }
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

type SignupReceipt = {
  chatId: string;
  offerId: string;
  status: searchTypes.SchemaSignupOffer["status"];
  message?: string | null;
  expiresAt: number;
};

const saved: Pick<AskSession, "messages" | "chatId"> &
  Partial<Pick<AskSession, "draftQuery" | "draftAttachments">> & {
    signupReceipts?: SignupReceipt[];
  } = JSON.parse(
  sessionStorage.getItem(STORAGE_KEY) ??
    JSON.stringify({ messages: [], chatId: null }),
);
let signupReceipts = saved.signupReceipts ?? [];

let session: AskSession = {
  ...saved,
  draftQuery: saved.draftQuery ?? "",
  draftAttachments: saved.draftAttachments ?? [],
  composerId: 0,
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
  persist();
  listeners.forEach((listener) => listener());
}

function persist() {
  // Bound receipt lifetime to the actionable interval and this tab. Evicting a still-live
  // receipt just to cap the count could re-enable an uncertain write.
  signupReceipts = signupReceipts.filter(
    (receipt) => receipt.expiresAt > Date.now(),
  );
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      messages: session.messages,
      chatId: session.chatId,
      draftQuery: session.draftQuery,
      draftAttachments: session.draftAttachments,
      signupReceipts,
    }),
  );
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

export function setDraftQuery(draftQuery: string) {
  update({ draftQuery });
}

export function setDraftAttachments(
  draftAttachments: DraftAttachment[],
  composerId = session.composerId,
) {
  if (composerId !== session.composerId) return;
  update({ draftAttachments });
}

function parseEvent(block: string): AskStreamEvent | undefined {
  const name = block.match(/^event: (.+)$/m)?.[1];
  const data = block.match(/^data: (.+)$/m)?.[1];
  if (!name || !data) return undefined;
  return { name, data: JSON.parse(data) } as AskStreamEvent;
}

// The user's InNoHassle Sport token goes with a question: with it the assistant reads their sport hours and trainings and
// checks them in to a training once they confirm it. It lives a day, so an expired one is fetched again. Without it the
// assistant answers without their sport.
export async function sportHeaders(): Promise<Record<string, string>> {
  let token = getMySportAccessToken();
  if (token && checkIsTokenExpired(token, new Date()) === true) {
    const { data } = await accountsFetch
      .GET("/tokens/generate-my-sport-token")
      .catch(() => ({ data: undefined }));
    token = data?.access_token ?? null;
    if (token) setMySportAccessToken(token);
  }
  return token ? { "X-Sport-Token": token } : {};
}

// The final answer, or undefined when the question was cancelled
async function streamAnswer(
  query: string,
  chatId: string | null,
  attachments: searchTypes.SchemaAttachmentInfo[],
  signal: AbortSignal,
): Promise<searchTypes.SchemaAskResponses | undefined> {
  const { data: stream, error: requestError } = await searchFetch.POST(
    "/ask/stream",
    {
      body: {
        query,
        chat_id: chatId,
        attachment_ids: attachments.map((file) => file.id),
      },
      headers: await sportHeaders(),
      parseAs: "stream",
      signal,
    },
  );
  if (requestError || !stream) {
    throw new Error("Failed to start the answer");
  }
  return readAnswer(stream, signal);
}

// The answer to the question that waited for the user's decision on what the assistant was about to do for them
async function streamDecision(
  chatId: string,
  decision: searchTypes.SchemaAskDecision,
  signal: AbortSignal,
): Promise<searchTypes.SchemaAskResponses | undefined> {
  const { data: stream, error: requestError } = await searchFetch.POST(
    "/ask/{chat_id}/decision/stream",
    {
      params: { path: { chat_id: chatId } },
      body: decision,
      headers: await sportHeaders(),
      parseAs: "stream",
      signal,
    },
  );
  if (requestError || !stream) {
    const detail = (requestError as { detail?: unknown } | undefined)?.detail;
    throw new Error(
      typeof detail === "string" ? detail : "Failed to send the decision",
    );
  }
  return readAnswer(stream, signal);
}

async function readAnswer(
  stream: ReadableStream<BufferSource>,
  signal: AbortSignal,
): Promise<searchTypes.SchemaAskResponses | undefined> {
  const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (signal.aborted) return undefined;
    if (done) break;
    buffer += value;

    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";
    for (const block of blocks) {
      const event = parseEvent(block);
      if (event?.name === "chat") {
        update({
          chatId: event.data.chat_id,
          draftAttachments:
            session.messages.at(-1)?.role === "user"
              ? session.draftAttachments.map((attachment) => ({
                  ...attachment,
                  bound: true,
                }))
              : session.draftAttachments,
        });
        // The chat and its files already exist even if generation fails or is cancelled.
        queryClient.invalidateQueries({
          queryKey: $search.queryOptions("get", "/ask/chats").queryKey,
        });
      } else if (event?.name === "cancelled") {
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

export async function askQuestion(
  query: string,
  attachments: searchTypes.SchemaAttachmentInfo[] = session.draftAttachments.map(
    (attachment) => attachment.info,
  ),
) {
  abortController?.abort();
  const controller = new AbortController();
  abortController = controller;

  // A question left without an answer (it failed) is not in the chat: the assistant does not remember it either
  const answered =
    session.messages.at(-1)?.role === "user"
      ? session.messages.slice(0, -1)
      : session.messages;
  update({
    messages: [...answered, { role: "user", content: query, attachments }],
    draftQuery: "",
    draftAttachments: attachments.map((info) => ({
      info,
      bound: session.draftAttachments.some(
        (draft) => draft.info.id === info.id && draft.bound,
      ),
    })),
    answerText: "",
    status: "",
    error: null,
    isPending: true,
  });

  try {
    const response = await streamAnswer(
      query,
      session.chatId,
      attachments,
      controller.signal,
    );
    if (!controller.signal.aborted && !response) {
      cancelQuestion();
      return;
    }
    if (response && !controller.signal.aborted) {
      update({
        messages: [...session.messages, { role: "assistant", response }],
        chatId: response.chat_id ?? null,
        draftAttachments: [],
      });
      announceAnswer(response);
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
      update({
        isPending: false,
        draftQuery: session.error
          ? session.draftQuery || query
          : session.draftQuery,
      });
    }
  }
}

// The user's decision on what the assistant is about to do for them (the `approval` of the last answer): it is done only
// when approved. The answer that waited for the decision takes the place of the approval
export async function decideApproval(decision: "approve" | "reject") {
  const last = session.messages.at(-1);
  const chatId = session.chatId;
  if (!chatId || last?.role !== "assistant" || !last.response.approval) return;
  abortController?.abort();
  const controller = new AbortController();
  abortController = controller;
  update({ answerText: "", status: "", error: null, isPending: true });

  try {
    const response = await streamDecision(
      chatId,
      {
        decision: AskDecisionDecision[decision],
        approval_id: last.response.approval.id,
      },
      controller.signal,
    );
    if (response && !controller.signal.aborted && session.chatId === chatId) {
      update({
        messages: [
          ...session.messages.slice(0, -1),
          { role: "assistant", response },
        ],
      });
      announceAnswer(response);
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
    draftQuery: session.draftQuery || question,
  });
  return question;
}

// A new conversation: the assistant does not see the earlier questions any more
export function startNewChat() {
  cancelQuestion();
  update({
    messages: [],
    chatId: null,
    composerId: session.composerId + 1,
    draftQuery: "",
    draftAttachments: [],
    answerText: "",
    status: "",
    error: null,
    isOpening: false,
    openingError: null,
  });
}

// A chat the user deleted: when it is the open one, a new conversation starts in its place
export function forgetChat(chatId: string) {
  signupReceipts = signupReceipts.filter(
    (receipt) => receipt.chatId !== chatId,
  );
  if (session.chatId === chatId) startNewChat();
  else persist();
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
    composerId: session.composerId + 1,
    draftQuery: "",
    draftAttachments: [],
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
      // The question that waits for the user's decision comes last, with what it waits for
      messages: [
        ...history.answers,
        ...(history.waiting ? [history.waiting] : []),
      ].flatMap((response): AskMessage[] => [
        {
          role: "user",
          content: response.query,
          attachments: response.attachments ?? [],
        },
        {
          role: "assistant",
          response: restoreSignupReceipts(chatId, response),
        },
      ]),
    });
  } catch (e) {
    if (session.chatId !== chatId) return;
    update({ isOpening: false, openingError: e });
  }
}

function restoreSignupReceipts(
  chatId: string,
  response: searchTypes.SchemaAskResponses,
): searchTypes.SchemaAskResponses {
  if (!response.signup_offers?.length) return response;
  return {
    ...response,
    signup_offers: response.signup_offers.map((offer) => {
      if (offer.status !== "available") {
        storeSignupReceipt(chatId, offer);
        return offer;
      }
      const receipt = signupReceipts.find(
        (item) => item.chatId === chatId && item.offerId === offer.id,
      );
      return receipt
        ? { ...offer, status: receipt.status, message: receipt.message }
        : offer;
    }),
  };
}

function storeSignupReceipt(
  chatId: string,
  offer: searchTypes.SchemaSignupOffer,
) {
  signupReceipts = signupReceipts.filter(
    (item) => item.chatId !== chatId || item.offerId !== offer.id,
  );
  signupReceipts.push({
    chatId,
    offerId: offer.id,
    status: offer.status,
    message: offer.message,
    expiresAt: Math.min(
      Date.parse(offer.expires_at),
      Date.parse(offer.starts_at),
    ),
  });
}

// Keep receipts even when the originating chat is no longer open.
export function rememberSignup(
  chatId: string,
  offer: searchTypes.SchemaSignupOffer,
) {
  storeSignupReceipt(chatId, offer);
  if (session.chatId !== chatId) {
    persist();
    return;
  }
  update({
    messages: session.messages.map((message) =>
      message.role === "assistant" &&
      message.response.signup_offers?.some((item) => item.id === offer.id)
        ? {
            ...message,
            response: {
              ...message.response,
              signup_offers: message.response.signup_offers.map((item) =>
                item.id === offer.id ? offer : item,
              ),
            },
          }
        : message,
    ),
  });
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
