import { searchTypes } from "@/api/search";
import { cn } from "@/lib/ui/cn";
import { Trans } from "@lingui/react/macro";
import { AskAnswerBody } from "./AskAnswerBody";
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
  const link = (
    "link" in source ? source.link : "url" in source ? source.url : ""
  ).trim();
  return JSON.stringify(
    link
      ? [source.type, link]
      : [source.type, source.display_name, source.breadcrumbs],
  );
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

  return (
    <div
      tabIndex={0}
      className={cn(
        "border-base-300 bg-base-200 text-base-content rounded-field flex max-w-full min-w-0 flex-col gap-2 self-start border! px-4 py-2 wrap-anywhere",
        !hasError &&
          response.chat_id &&
          !!response.signup_offers?.length &&
          "w-full",
      )}
    >
      {!hasError ? (
        <AskAnswerBody text={answer} />
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
        <div className="flex flex-col gap-1">
          <span>
            <Trans>Sources:</Trans>
          </span>
          {uniqueSources.map(({ source }) => {
            const link = (
              "link" in source ? source.link : "url" in source ? source.url : ""
            ).trim();
            const name = source.display_name.trim();
            const breadcrumbs = source.breadcrumbs
              .map((part) => part.trim())
              .filter(Boolean)
              .join(" > ");
            const label =
              (name && name !== "-" ? name : "") ||
              breadcrumbs ||
              link ||
              source.type;
            const member =
              source.type === "eduwiki"
                ? source.archive_document?.member
                : undefined;
            return (
              <div
                key={sourceKey(source)}
                className="min-w-0 text-sm wrap-anywhere"
              >
                {source.type === "eduwiki" && source.archive_document ? (
                  <button
                    type="button"
                    className="text-primary text-left wrap-anywhere hover:underline"
                    onClick={() => setPreviewSource(source)}
                  >
                    <Trans>Open document: {member}</Trans>
                  </button>
                ) : (
                  <>
                    {link ? (
                      <a
                        className="text-primary hover:underline"
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {label}
                      </a>
                    ) : (
                      <span>{label}</span>
                    )}
                    {breadcrumbs && breadcrumbs !== label && (
                      <div className="text-base-content/60">{breadcrumbs}</div>
                    )}
                  </>
                )}
              </div>
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
