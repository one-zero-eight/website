import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
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
  SignupOfferStatus,
} from "@/api/search/types";
import { queryClient } from "@/app/query-client";
import { validBookingReceipt } from "./ask-booking";
import {
  AssistantUnavailableError,
  parseSearchCommand,
  searchInChat,
} from "./ask-search";
import { type AskStatus, isAskStatus } from "./ask-mood";
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
  | { role: "assistant"; response: searchTypes.SchemaAskResponses }
  // The results of the search API, for the search command and for a question the assistant could not take
  | {
      role: "search";
      query: string;
      results: searchTypes.SchemaSearchResponse[];
    };

// A search kept in the chat as the cards of the search API
function searchMessage(response: searchTypes.SchemaAskResponses): AskMessage {
  return {
    role: "search",
    query: response.search!.searched_for,
    results: response.search!.responses,
  };
}

export const askAnswerReadyEvent = "catix-answer-ready";
export type AskAnswerReady = { chatId: string | null; needsApproval: boolean };

function announceAnswer(response: searchTypes.SchemaAskResponses) {
  window.dispatchEvent(
    new CustomEvent<AskAnswerReady>(askAnswerReadyEvent, {
      detail: {
        chatId: response.chat_id ?? null,
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
  // Questions written while an answer is being written: each is asked when the answer before it is ready
  queue: string[];
  // The answer being written and what the assistant is doing meanwhile
  answerText: string;
  status: AskStatus | null;
  isPending: boolean;
  error: Error | null;
  // The language model did not answer the last question: the page says so until it does
  assistantUnavailable: boolean;
  // A chat being opened from the list of the user's chats, and why it could not be
  isOpening: boolean;
  openingError: unknown;
};

type AskStreamEvent =
  | { name: "chat"; data: { chat_id: string } }
  | { name: "cancelled"; data: { detail: string } }
  | { name: "status"; data: { phase: string } }
  | {
      name: "guardrail";
      data: { category: string; paused_until?: string | null };
    }
  | { name: "answer"; data: { text: string } }
  | { name: "done"; data: searchTypes.SchemaAskResponses }
  | { name: "error"; data: { detail: string; code?: "llm_unavailable" } };

// The conversation with the assistant lives outside the page: going to another page and back keeps the questions and the
// answers, and an answer being written goes on meanwhile. The questions and the answers are kept in this tab
// (sessionStorage), so a reload keeps them too; an answer that was being written is finished on the server, and the reloaded page follows it (`resumeAnswer`). The server keeps
// every chat of the user as well: one of them opens again from the list of chats (`openChat`)
const STORAGE_KEY = "search-ask-session";

type SignupReceipt = Pick<
  searchTypes.SchemaSignupOffer,
  "starts_at" | "ends_at" | "booking_title"
> & {
  chatId: string;
  offerId: string;
  status: searchTypes.SchemaSignupOffer["status"];
  message?: string | null;
  expiresAt: number;
};

const saved: Pick<AskSession, "messages" | "chatId"> &
  Partial<Pick<AskSession, "draftAttachments">> & {
    signupReceipts?: SignupReceipt[];
  } = JSON.parse(
  sessionStorage.getItem(STORAGE_KEY) ??
    JSON.stringify({ messages: [], chatId: null }),
);
let signupReceipts = saved.signupReceipts ?? [];
// The unsent text of the chats the user left, by chat (the new chat has no id yet). Unlike the conversation it is kept
// in localStorage: it outlives the tab
const DRAFTS_STORAGE_KEY = "search-ask-drafts";
const NEW_CHAT_DRAFT_KEY = "new";
let drafts: Record<string, string> = JSON.parse(
  localStorage.getItem(DRAFTS_STORAGE_KEY) ?? "{}",
);

let session: AskSession = {
  ...saved,
  draftQuery: takeDraft(saved.chatId),
  draftAttachments: saved.draftAttachments ?? [],
  composerId: 0,
  queue: [],
  answerText: "",
  status: null,
  isPending: false,
  error: null,
  assistantUnavailable: false,
  isOpening: false,
  openingError: null,
};
let abortController: AbortController | null = null;
// The chat whose answer the page waits for without its stream (the page was reloaded, or the chat was opened from the list)
let following: string | null = null;
// Questions stopped before the server named their chat: stopped on the server once the `chat` event names it
const stopOnChat = new WeakMap<AbortSignal, AbortController>();
const FOLLOW_INTERVAL_MS = 3000;
// The answers of the chats the user left meanwhile: they are written on the server (the chat list shows them), the page
// does not follow them any more
const detached = new WeakSet<AbortSignal>();
const listeners = new Set<() => void>();

function update(patch: Partial<AskSession>) {
  session = { ...session, ...patch };
  persist();
  listeners.forEach((listener) => listener());
}

function updateIfShown(signal: AbortSignal, patch: Partial<AskSession>) {
  if (!detached.has(signal)) update(patch);
}

// The pause belongs to the user, not to the chat the answer was in: the page reads it from the query of GET /ask/pause, and the
// latest end wins (the history of an old chat must not shorten a newer pause)
function rememberPause(until: string | null | undefined) {
  if (!until) return;
  const { queryKey } = $search.queryOptions("get", "/ask/pause");
  const known = queryClient.getQueryData(queryKey)?.paused_until;
  if (known && Date.parse(known) >= Date.parse(until)) return;
  queryClient.setQueryData(queryKey, { paused_until: until });
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
      draftAttachments: session.draftAttachments,
      signupReceipts,
    }),
  );
  localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(draftsWithCurrent()));
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

// The question waits for the answer in progress; the draft box is free for the next one
export function enqueueQuestion(query: string) {
  update({ queue: [...session.queue, query], draftQuery: "" });
}

export function dequeueQuestion(index: number) {
  update({ queue: session.queue.filter((_, i) => i !== index) });
}

// Asks the first of the waiting questions, after an answer that went well
function askNextQueued() {
  const [next, ...rest] = session.queue;
  if (next === undefined || session.error) return;
  update({ queue: rest });
  void askQuestion(next);
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
  const {
    data: stream,
    error: requestError,
    response,
  } = await searchFetch.POST("/ask/stream", {
    body: {
      query,
      chat_id: chatId,
      attachment_ids: attachments.map((file) => file.id),
    },
    headers: await sportHeaders(),
    parseAs: "stream",
    signal,
  });
  if (!response.ok) {
    throw new Error(
      formatApiErrorMessage({
        body: requestError,
        httpCode: response.status,
        response,
      }),
    );
  }
  if (!stream) {
    throw new Error(i18n._(msg`The server returned no answer stream.`));
  }
  return readAnswer(stream, signal);
}

// The answer to the question that waited for the user's decision on what the assistant was about to do for them
async function streamDecision(
  chatId: string,
  decision: searchTypes.SchemaAskDecision,
  signal: AbortSignal,
): Promise<searchTypes.SchemaAskResponses | undefined> {
  const {
    data: stream,
    error: requestError,
    response,
  } = await searchFetch.POST("/ask/{chat_id}/decision/stream", {
    params: { path: { chat_id: chatId } },
    body: decision,
    headers: await sportHeaders(),
    parseAs: "stream",
    signal,
  });
  if (!response.ok) {
    throw new Error(
      formatApiErrorMessage({
        body: requestError,
        httpCode: response.status,
        response,
      }),
    );
  }
  if (!stream) {
    throw new Error(i18n._(msg`The server returned no answer stream.`));
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
        const stopping = stopOnChat.get(signal);
        if (stopping) {
          void stopOnServer(event.data.chat_id);
          stopping.abort();
          return undefined;
        }
        updateIfShown(signal, {
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
        if (isAskStatus(event.data.phase)) {
          updateIfShown(signal, { status: event.data.phase });
        }
      } else if (event?.name === "guardrail") {
        rememberPause(event.data.paused_until);
        if (isAskStatus(event.data.category)) {
          updateIfShown(signal, { status: event.data.category });
        }
      } else if (event?.name === "answer") {
        updateIfShown(signal, { answerText: event.data.text });
      } else if (event?.name === "error") {
        throw event.data.code === "llm_unavailable"
          ? new AssistantUnavailableError(event.data.detail)
          : new Error(event.data.detail);
      } else if (event?.name === "done") {
        return event.data;
      }
    }
  }
  throw new Error(
    i18n._(msg`The connection ended before the response was complete.`),
  );
}

function keepSearch(
  response: searchTypes.SchemaAskResponses,
  patch: Partial<AskSession> = {},
) {
  update({
    ...patch,
    messages: [...session.messages, searchMessage(response)],
    chatId: response.chat_id ?? null,
  });
  queryClient.invalidateQueries({
    queryKey: $search.queryOptions("get", "/ask/chats").queryKey,
  });
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
  // The search command goes to the search API: the files are not sent with it and stay in the box
  const searchQuery = parseSearchCommand(query);
  const sent = searchQuery === null ? attachments : [];
  update({
    messages: [
      ...answered,
      { role: "user", content: query, attachments: sent },
    ],
    draftQuery: "",
    draftAttachments:
      searchQuery === null
        ? attachments.map((info) => ({
            info,
            bound: session.draftAttachments.some(
              (draft) => draft.info.id === info.id && draft.bound,
            ),
          }))
        : session.draftAttachments,
    answerText: "",
    status: null,
    error: null,
    isPending: true,
  });

  try {
    if (searchQuery !== null) {
      if (!searchQuery) {
        throw new Error(i18n._(msg`Write what to search for after /search.`));
      }
      const response = await searchInChat(
        query,
        searchQuery,
        session.chatId,
        controller.signal,
      );
      if (!controller.signal.aborted && !detached.has(controller.signal)) {
        keepSearch(response);
      }
      return;
    }
    let response: searchTypes.SchemaAskResponses | undefined;
    try {
      response = await streamAnswer(
        query,
        session.chatId,
        attachments,
        controller.signal,
      );
    } catch (e) {
      if (!(e instanceof AssistantUnavailableError)) throw e;
      // The question is answered as a plain search of the knowledge base
      const response = await searchInChat(
        query,
        query,
        session.chatId,
        controller.signal,
      );
      if (!controller.signal.aborted && !detached.has(controller.signal)) {
        keepSearch(response, { assistantUnavailable: true });
      }
      return;
    }
    if (stopOnChat.has(controller.signal)) return;
    if (!controller.signal.aborted && !response) {
      if (!detached.has(controller.signal)) cancelQuestion();
      return;
    }
    if (response && !controller.signal.aborted) {
      updateIfShown(controller.signal, {
        messages: [...session.messages, { role: "assistant", response }],
        chatId: response.chat_id ?? null,
        draftAttachments: [],
        assistantUnavailable: false,
      });
      announceAnswer(response);
      queryClient.invalidateQueries({
        queryKey: $search.queryOptions("get", "/ask/chats").queryKey,
      });
    }
  } catch (e) {
    if (!controller.signal.aborted) {
      updateIfShown(controller.signal, {
        error: e instanceof Error ? e : new Error(String(e)),
      });
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
      askNextQueued();
    }
  }
}

// The user's decision on what the assistant is about to do for them (the `approval` of the last answer): it is done only
// when approved. The answer that waited for the decision takes the place of the approval
export async function decideApproval(
  decision: "approve" | "reject",
  edits: searchTypes.SchemaActionEdit[] = [],
) {
  const last = session.messages.at(-1);
  const chatId = session.chatId;
  if (!chatId || last?.role !== "assistant" || !last.response.approval) return;
  abortController?.abort();
  const controller = new AbortController();
  abortController = controller;
  update({ answerText: "", status: null, error: null, isPending: true });

  try {
    const response = await streamDecision(
      chatId,
      {
        decision: AskDecisionDecision[decision],
        ...(edits.length ? { edits } : {}),
        approval_id: last.response.approval.id,
      },
      controller.signal,
    );
    if (response && !controller.signal.aborted) {
      if (!detached.has(controller.signal) && session.chatId === chatId) {
        update({
          messages: [
            ...session.messages.slice(0, -1),
            { role: "assistant", response },
          ],
        });
      }
      announceAnswer(response);
      queryClient.invalidateQueries({
        queryKey: $search.queryOptions("get", "/ask/chats").queryKey,
      });
    }
  } catch (e) {
    if (!controller.signal.aborted) {
      updateIfShown(controller.signal, {
        error: e instanceof Error ? e : new Error(String(e)),
      });
    }
  } finally {
    if (abortController === controller) {
      abortController = null;
      update({ isPending: false });
      askNextQueued();
    }
  }
}

// The question is stopped on the server (POST /ask/{chat_id}/cancel; closing the stream does not stop it), even if it is
// still waiting in the queue. It is not in the chat then (the assistant does not remember it either): it is given back, to
// be asked again or changed. A new chat not named yet is stopped as soon as the server names it
export function cancelQuestion(): string {
  const last = session.messages.at(-1);
  const question =
    session.isPending && last?.role === "user" ? last.content : "";
  const controller = abortController;
  const chatId = session.chatId;
  abortController = null;
  following = null;
  if (session.isPending && chatId) void stopOnServer(chatId);
  if (controller && chatId) controller.abort();
  if (controller && !chatId) {
    detached.add(controller.signal);
    stopOnChat.set(controller.signal, controller);
  }
  update({
    isPending: false,
    messages: question ? session.messages.slice(0, -1) : session.messages,
    draftQuery: session.draftQuery || question,
  });
  return question;
}

// Leaving the chat does not stop the answer: it is finished on the server and announced, the page shows another chat
function leaveChat() {
  if (!abortController && !following) return;
  if (abortController) detached.add(abortController.signal);
  abortController = null;
  following = null;
  update({
    isPending: false,
    answerText: "",
    status: null,
    error: null,
  });
}

// The text in the box stays with its chat: it comes back when the user returns to the chat
function draftsWithCurrent() {
  const key = session.chatId ?? NEW_CHAT_DRAFT_KEY;
  const { [key]: _, ...others } = drafts;
  return session.draftQuery.trim()
    ? { ...others, [key]: session.draftQuery }
    : others;
}

function rememberDraft() {
  drafts = draftsWithCurrent();
}

function takeDraft(chatId: string | null) {
  const key = chatId ?? NEW_CHAT_DRAFT_KEY;
  const { [key]: draft = "", ...others } = drafts;
  drafts = others;
  return draft;
}

// A new conversation: the assistant does not see the earlier questions any more
export function startNewChat() {
  leaveChat();
  rememberDraft();
  update({
    messages: [],
    chatId: null,
    composerId: session.composerId + 1,
    draftQuery: takeDraft(null),
    draftAttachments: [],
    answerText: "",
    status: null,
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
  const { [chatId]: _, ...others } = drafts;
  drafts = others;
  persist();
}

// One of the user's chats with its questions and answers, as the server keeps them, to go on with it
export async function openChat(chatId: string) {
  const sameChat = chatId === session.chatId;
  if (
    sameChat &&
    (session.isOpening || (!session.isPending && session.openingError === null))
  ) {
    return;
  }
  leaveChat();
  if (!sameChat) rememberDraft();
  update({
    messages: [],
    chatId,
    composerId: sameChat ? session.composerId : session.composerId + 1,
    draftQuery: sameChat ? session.draftQuery : takeDraft(chatId),
    draftAttachments: sameChat ? session.draftAttachments : [],
    answerText: "",
    status: null,
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
    rememberPause(history.answers.at(-1)?.paused_until);
    update({
      isOpening: false,
      messages: historyMessages(chatId, history),
    });
    if (history.answering) void followAnswer(chatId);
  } catch (e) {
    if (session.chatId !== chatId) return;
    update({ isOpening: false, openingError: e });
  }
}

// The messages of a chat as the server keeps them. The question that waits for the user's decision comes last, with what
// it waits for
function historyMessages(
  chatId: string,
  history: searchTypes.SchemaAskChatHistory,
): AskMessage[] {
  return [
    ...history.answers,
    ...(history.waiting ? [history.waiting] : []),
  ].flatMap((response): AskMessage[] => [
    {
      role: "user",
      content: response.query,
      attachments: response.attachments ?? [],
    },
    response.search
      ? searchMessage(response)
      : {
          role: "assistant",
          response: restoreSignupReceipts(chatId, response),
        },
  ]);
}

// Stops the questions of the chat on the server; the page has already given the question back
async function stopOnServer(chatId: string) {
  try {
    const result = await searchFetch.POST("/ask/{chat_id}/cancel", {
      params: { path: { chat_id: chatId } },
    });
    if (result && !result.response.ok) {
      throw new Error(
        formatApiErrorMessage({
          httpCode: result.response.status,
          response: result.response,
        }),
      );
    }
  } catch (e) {
    if (session.chatId === chatId) {
      update({ error: e instanceof Error ? e : new Error(String(e)) });
    }
  }
}

// The page waits for the answer of the chat by reading the chat again, without a stream
async function followAnswer(chatId: string) {
  following = chatId;
  update({
    isPending: true,
    answerText: "",
    status: "still_answering",
    error: null,
  });
  try {
    while (true) {
      const history = await queryClient.fetchQuery(
        $search.queryOptions("get", "/ask/chats/{chat_id}", {
          params: { path: { chat_id: chatId } },
        }),
      );
      if (following !== chatId) return;
      if (!history.answering) {
        rememberPause(history.answers.at(-1)?.paused_until);
        update({ messages: historyMessages(chatId, history) });
        queryClient.invalidateQueries({
          queryKey: $search.queryOptions("get", "/ask/chats").queryKey,
        });
        return;
      }
      const { promise, resolve } = Promise.withResolvers<void>();
      setTimeout(resolve, FOLLOW_INTERVAL_MS);
      await promise;
      if (following !== chatId) return;
    }
  } catch (e) {
    if (following === chatId) {
      update({ error: e instanceof Error ? e : new Error(String(e)) });
    }
  } finally {
    if (following === chatId) {
      following = null;
      update({ isPending: false, status: null });
      askNextQueued();
    }
  }
}

// After a reload the server still answers the question the page waited for: the page follows the chat until it is answered
export function resumeAnswer() {
  const chatId = session.chatId;
  if (
    !chatId ||
    session.isPending ||
    following ||
    session.messages.at(-1)?.role !== "user"
  ) {
    return;
  }
  void followAnswer(chatId);
}

function restoreSignupReceipts(
  chatId: string,
  response: searchTypes.SchemaAskResponses,
): searchTypes.SchemaAskResponses {
  if (!response.signup_offers?.length) return response;
  return {
    ...response,
    signup_offers: response.signup_offers.map((offer) => {
      const receipt = signupReceipts.find(
        (item) => item.chatId === chatId && item.offerId === offer.id,
      );
      if (offer.status !== "available") {
        const booking = offer.service === "rooms" || offer.service === "music";
        const result =
          booking && !validBookingReceipt(offer)
            ? { ...offer, status: SignupOfferStatus.unknown }
            : offer;
        storeSignupReceipt(chatId, result);
        return result;
      }
      if (!receipt) return offer;
      const {
        chatId: _chatId,
        offerId: _offerId,
        expiresAt: _expiresAt,
        ...snapshot
      } = receipt;
      return { ...offer, ...snapshot };
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
    starts_at: offer.starts_at,
    ends_at: offer.ends_at,
    booking_title: offer.booking_title,
    expiresAt: Math.min(
      Date.parse(offer.expires_at),
      // A chosen music start is not the original window's actionable deadline.
      Date.parse(
        offer.service === "music"
          ? (offer.music_window?.latest_start_at ?? offer.expires_at)
          : offer.starts_at,
      ),
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
