import { searchFetch, searchTypes } from "@/api/search";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";

// The assistant cannot reach its language model: the question is answered as a plain search of the knowledge base
export class AssistantUnavailableError extends Error {}

const SEARCH_COMMAND = /^\/(?:search|поиск)(?:\s+([\s\S]*))?$/i;

// The query of a message that starts with the search command (`/search` or `/поиск`), which the search API answers
// without the assistant; null for any other message. An empty string is a command with nothing to search for
export function parseSearchCommand(text: string): string | null {
  const match = text.trim().match(SEARCH_COMMAND);
  return match ? (match[1] ?? "").trim() : null;
}

// A plain search of the knowledge base kept in the chat as one of its turns: `query` is the message as the user wrote it,
// `searchedFor` what is searched for. Without a chat a new one starts; the response's chat_id is the chat
export async function searchInChat(
  query: string,
  searchedFor: string,
  chatId: string | null,
  signal: AbortSignal,
): Promise<searchTypes.SchemaAskResponses> {
  const { data, error, response } = await searchFetch.POST("/ask/search", {
    body: { query, searched_for: searchedFor, chat_id: chatId },
    signal,
  });
  if (!data) {
    throw new Error(
      formatApiErrorMessage({
        body: error,
        httpCode: response.status,
        response,
      }),
    );
  }
  return data;
}
