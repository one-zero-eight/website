import { searchTypes } from "@/api/search";
import { EduwikiSourceType } from "@/api/search/types";
import { cn } from "@/lib/ui/cn";
import { Trans, useLingui } from "@lingui/react/macro";
import { AskAnswerBody } from "./AskAnswerBody";
import { AskApproval } from "./AskApproval";
import { AskCalendarEvents } from "./AskCalendarEvents";
import { AskSignupOffers } from "./AskSignupOffers";
import { AskFeedback } from "./AskFeedback";
import { useId, useState } from "react";
import { ArchiveDocumentModal } from "@/components/search/ArchiveDocumentModal";

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
  const { answer, sources = [], approval } = response;
  const { i18n } = useLingui();
  const [previewSource, setPreviewSource] =
    useState<searchTypes.SchemaEduwikiSource>();
  const citationId = useId();
  const citationTargets = new Map(
    sources.map((source) => [
      source.number,
      `${citationId}-source-${source.number}`,
    ]),
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
        <AskAnswerBody text={answer} citationTargets={citationTargets} />
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

      {!hasError && sources.length > 0 && (
        <div className="flex flex-col gap-1 text-base">
          <span className="font-medium">
            <Trans>Sources</Trans>
          </span>
          <ol className="flex list-none flex-col gap-2">
            {sources.map((source) => {
              const member = source.archive_document?.member;
              return (
                <li
                  key={source.number}
                  id={citationTargets.get(source.number)}
                  tabIndex={-1}
                  value={source.number}
                  className="min-w-0 wrap-anywhere"
                >
                  <span className="font-medium">[{source.number}] </span>
                  <CitationLink title={source.title} url={source.url} />
                  <div className="text-base-content/70">
                    <SourceKind kind={source.kind} />
                    {source.official && source.kind !== "official_document" && (
                      <>
                        {" "}
                        · <Trans>Official</Trans>
                      </>
                    )}
                    {source.date && (
                      <>
                        {" "}
                        ·{" "}
                        <time dateTime={source.date}>
                          {new Date(source.date).toLocaleDateString(
                            i18n.locale,
                            {
                              timeZone: "Europe/Moscow",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </time>
                      </>
                    )}
                    {source.author && (
                      <>
                        {" "}
                        ·{" "}
                        <CitationLink
                          title={source.author}
                          url={source.author_url}
                        />
                      </>
                    )}
                  </div>
                  {!!source.clauses?.length && (
                    <div>
                      <Trans>Clauses:</Trans> {source.clauses.join(", ")}
                    </div>
                  )}
                  {!!source.sections?.length && (
                    <div>
                      <Trans>Sections:</Trans> {source.sections.join(", ")}
                    </div>
                  )}
                  {!!source.based_on?.length && (
                    <div>
                      <Trans>Based on:</Trans>{" "}
                      {source.based_on.map((link, index) => (
                        <span key={JSON.stringify([link.title, link.url])}>
                          {index > 0 && ", "}
                          <CitationLink title={link.title} url={link.url} />
                        </span>
                      ))}
                    </div>
                  )}
                  {source.archive_document && (
                    <button
                      type="button"
                      className="text-primary text-left hover:underline"
                      onClick={() =>
                        setPreviewSource({
                          type: EduwikiSourceType.eduwiki,
                          display_name: source.title,
                          url: source.url ?? "",
                          preview_text: "",
                          breadcrumbs: [],
                          archive_document: source.archive_document,
                        })
                      }
                    >
                      <Trans>Open document: {member}</Trans>
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
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

function CitationLink({ title, url }: { title: string; url?: string | null }) {
  if (!url || !/^https?:\/\//i.test(url)) return <>{title}</>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline"
    >
      {title}
    </a>
  );
}

function SourceKind({
  kind,
}: {
  kind: searchTypes.SchemaAnswerSource["kind"];
}) {
  switch (kind) {
    case "official_document":
      return <Trans>Official document</Trans>;
    case "guide":
      return <Trans>Guide</Trans>;
    case "eduwiki":
      return <Trans>EduWiki</Trans>;
    case "website":
      return <Trans>Website</Trans>;
    case "web":
      return <Trans>Web search</Trans>;
    case "chat":
      return <Trans>Chat</Trans>;
  }
}
