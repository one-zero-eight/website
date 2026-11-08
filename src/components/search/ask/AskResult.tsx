import { searchTypes } from "@/api/search";
import { cn } from "@/lib/ui/cn";
import { Trans } from "@lingui/react/macro";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AskApproval } from "./AskApproval";
import { AskCalendarEvents } from "./AskCalendarEvents";
import { AskSignupOffers } from "./AskSignupOffers";
import { AskFeedback } from "./AskFeedback";
import { useState } from "react";
import { ArchiveDocumentModal } from "@/components/search/ArchiveDocumentModal";

function sourceKey(source: searchTypes.SchemaSearchResponse["source"]) {
  if (source.type === "eduwiki" && source.archive_document) {
    const { page, revision, member } = source.archive_document;
    return JSON.stringify([source.type, page, revision, member]);
  }
  return source.type;
}

export function AskResult({
  response,
  hasError,
  isLast = false,
  isPending = false,
}: {
  response: searchTypes.SchemaAskResponses;
  hasError?: boolean;
  isLast?: boolean;
  isPending?: boolean;
}) {
  const { answer, search_responses, approval } = response;
  const [previewSource, setPreviewSource] =
    useState<searchTypes.SchemaEduwikiSource>();

  const uniqueSources = search_responses.filter(
    (item, index, self) =>
      index ===
      self.findIndex((s) => sourceKey(s.source) === sourceKey(item.source)),
  );

  const getSourceLink = (s: searchTypes.SchemaSearchResponse) =>
    "link" in s.source ? s.source.link : "url" in s.source ? s.source.url : "";

  return (
    <div
      tabIndex={0}
      className={cn(
        "border-base-300 bg-base-200 text-base-content rounded-field flex flex-col gap-2 self-start border! px-4 py-2",
      )}
    >
      {!hasError ? (
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href }) => (
              <a
                href={href ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                <Trans>link</Trans>
              </a>
            ),
            p: ({ children }) => (
              <p className="whitespace-pre-wrap">{children}</p>
            ),
            li: ({ children }) => (
              <li className="ml-5 list-disc">{children}</li>
            ),
          }}
        >
          {answer}
        </Markdown>
      ) : (
        <span>
          <Trans>- Sorry, I can't help you with this question.</Trans>
        </span>
      )}

      {!hasError && approval && (
        <AskApproval
          approval={approval}
          isLast={isLast}
          isPending={isPending}
        />
      )}

      {!hasError && response.chat_id && !!response.signup_offers?.length && (
        <AskSignupOffers
          chatId={response.chat_id}
          offers={response.signup_offers}
          disabled={isPending || !!approval}
        />
      )}

      {uniqueSources.length > 0 && (
        <div>
          <span>
            <Trans>Sources:</Trans>{" "}
          </span>
          {uniqueSources.map((s, i) => {
            const link = getSourceLink(s);
            const source = s.source;
            const member =
              source.type === "eduwiki"
                ? source.archive_document?.member
                : undefined;
            return (
              <span key={sourceKey(source)}>
                {source.type === "eduwiki" && source.archive_document ? (
                  <button
                    type="button"
                    className="text-primary text-left wrap-anywhere hover:underline"
                    onClick={() => setPreviewSource(source)}
                  >
                    <Trans>Open document: {member}</Trans>
                  </button>
                ) : (
                  <a
                    className="text-primary hover:underline"
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {s.source.type}
                  </a>
                )}
                {i < uniqueSources.length - 1 && ", "}
              </span>
            );
          })}
        </div>
      )}

      {previewSource && (
        <ArchiveDocumentModal
          source={previewSource}
          onClose={() => setPreviewSource(undefined)}
        />
      )}

      {!hasError && response.calendar_events.length > 0 && (
        <AskCalendarEvents events={response.calendar_events} />
      )}

      {!hasError && response.ask_query_id && (
        <AskFeedback
          askQueryId={response.ask_query_id}
          feedback={response.feedback}
          feedbackComment={response.feedback_comment}
        />
      )}
    </div>
  );
}
