import { searchFetch, searchTypes } from "@/api/search";
import { PathsSearchSearchGetParametersQueryResponse_types } from "@/api/search/types";

// The assistant cannot reach its language model: the question is answered as a plain search of the knowledge base
export class AssistantUnavailableError extends Error {}

const SEARCH_COMMAND = /^\/(?:search|поиск)(?:\s+([\s\S]*))?$/i;

// The query of a message that starts with the search command (`/search` or `/поиск`), which the search API answers
// without the assistant; null for any other message. An empty string is a command with nothing to search for
export function parseSearchCommand(text: string): string | null {
  const match = text.trim().match(SEARCH_COMMAND);
  return match ? (match[1] ?? "").trim() : null;
}

export async function searchKnowledgeBase(
  query: string,
  signal: AbortSignal,
): Promise<searchTypes.SchemaSearchResponse[]> {
  const { data, error } = await searchFetch.GET("/search/search", {
    params: {
      query: {
        query,
        response_types: [
          PathsSearchSearchGetParametersQueryResponse_types.link_to_source,
        ],
      },
    },
    signal,
  });
  if (!data) throw new Error(JSON.stringify(error));
  return data.responses;
}
