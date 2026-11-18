import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { searchFetch, searchTypes } from "@/api/search";
import {
  AnswerSourceKind,
  EduwikiSourceType,
  PathsSearchSearchGetParametersQueryResponse_types,
} from "@/api/search/types";

// The assistant cannot reach its language model: the question is answered as a plain search of the knowledge base
export class AssistantUnavailableError extends Error {}

function asAnswerSource(
  { source }: searchTypes.SchemaSearchResponse,
  number: number,
): searchTypes.SchemaAnswerSource {
  const isEduwiki = source.type === EduwikiSourceType.eduwiki;
  return {
    number,
    title: source.display_name,
    url: "url" in source ? source.url : null,
    kind: isEduwiki ? AnswerSourceKind.eduwiki : AnswerSourceKind.website,
    archive_document: isEduwiki ? source.archive_document : null,
    official: false,
  };
}

export async function searchWithoutAssistant(
  query: string,
  chatId: string | null,
  signal: AbortSignal,
): Promise<searchTypes.SchemaAskResponses> {
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
  const sources = data.responses.map((result, index) =>
    asAnswerSource(result, index + 1),
  );
  return {
    query,
    answer: sources.length
      ? i18n._(
          msg`The assistant is unavailable now, so this is a plain search. Results:`,
        )
      : i18n._(
          msg`The assistant is unavailable now, and the search found nothing for this question.`,
        ),
    chat_id: chatId,
    sources,
    attachments: [],
    signup_offers: [],
    calendar_events: [],
    messages: [],
  };
}
