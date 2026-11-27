import { searchTypes } from "@/api/search";
import { EduwikiSourceType } from "@/api/search/types";
import { cn } from "@/lib/ui/cn";
import { Trans, useLingui } from "@lingui/react/macro";
import { AskAnswerBody } from "./AskAnswerBody";
import { AskImage } from "./AskImage";
import { AskApproval } from "./AskApproval";
import { AskCalendarEvents } from "./AskCalendarEvents";
import { AskSignupOffers } from "./AskSignupOffers";
import { AskFeedback } from "./AskFeedback";
import { useId, useState } from "react";
import { SourcePreviewModal } from "@/components/search/SourcePreviewModal";
import { Modal } from "@/components/common/Modal";
import { CatIcon } from "@/components/icons/CatIcon";
import { moodOfGuardrail } from "./ask-mood";

type Preview =
  | { document: searchTypes.SchemaEduwikiSource }
  | { message: searchTypes.SchemaAnswerSource };

function isWebUrl(url?: string | null): url is string {
  return !!url && /^https?:\/\//i.test(url);
}

export function isPdfUrl(url?: string | null): url is string {
  return isWebUrl(url) && /\.pdf$/i.test(new URL(url).pathname);
}

// A cited document as a result of the search: its preview card shows both
function asDocument(
  title: string,
  url: string,
  archive_document: searchTypes.SchemaArchiveDocument | null = null,
): searchTypes.SchemaEduwikiSource {
  return {
    type: EduwikiSourceType.eduwiki,
    display_name: title,
    url,
    preview_text: "",
    breadcrumbs: [],
    archive_document,
  };
}

// What a click on the title of a source shows; nothing for what stays a link
function previewOf(
  source: searchTypes.SchemaAnswerSource,
): Preview | undefined {
  // Telegram and MAX show no message in a frame of another site: the answer carries the text of the message
  if (source.kind === "chat")
    return source.text ? { message: source } : undefined;
  // An archive is opened by its member in the preview; a page of the web search is not in the knowledge base,
  // nor is a Moodle file (private to the asker, the search API does not serve it). Those stay links.
  // Only PDFs are previewed: a web page opens on its own site
  if (source.archive_document)
    return {
      document: asDocument(
        source.title,
        source.url ?? "",
        source.archive_document,
      ),
    };
  if (source.kind === "web" || !isPdfUrl(source.url)) return undefined;
  return { document: asDocument(source.title, source.url) };
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
  const { answer, sources = [], approval } = response;
  const { i18n } = useLingui();
  const [preview, setPreview] = useState<Preview>();
  const citationId = useId();
  const citationTargets = new Map(
    sources.map((source) => [
      source.number,
      `${citationId}-source-${source.number}`,
    ]),
  );

  const bubble = (
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
        // An action waiting for approval has no text of its own when the assistant wrote none: the card says it all
        (answer.trim() || !approval) && (
          <AskAnswerBody text={answer} citationTargets={citationTargets} />
        )
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
          <ol className="divide-base-300 flex list-none flex-col divide-y">
            {sources.map((source) => {
              const shown = previewOf(source);
              return (
                <li
                  key={source.number}
                  id={citationTargets.get(source.number)}
                  tabIndex={-1}
                  value={source.number}
                  className="min-w-0 py-2 wrap-anywhere first:pt-0 last:pb-0"
                >
                  <span className="font-medium">[{source.number}] </span>
                  <CitationLink
                    title={source.title}
                    url={source.url}
                    onPreview={shown && (() => setPreview(shown))}
                  />
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
                      {source.based_on.map((link, index) => {
                        const url = link.url;
                        return (
                          <span key={JSON.stringify([link.title, link.url])}>
                            {index > 0 && ", "}
                            <CitationLink
                              title={link.title}
                              url={url}
                              onPreview={
                                isPdfUrl(url)
                                  ? () =>
                                      setPreview({
                                        document: asDocument(link.title, url),
                                      })
                                  : undefined
                              }
                            />
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {!!source.images?.length && (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {source.images.map((image) => (
                        <AskImage
                          key={image.url}
                          src={image.url}
                          alt={image.alt ?? source.title}
                          className="h-20 w-auto max-w-40 object-cover"
                        />
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {preview && "document" in preview && (
        <SourcePreviewModal
          source={preview.document}
          onClose={() => setPreview(undefined)}
        />
      )}
      {preview && "message" in preview && (
        <ChatMessageModal
          source={preview.message}
          onClose={() => setPreview(undefined)}
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

  // The guardrail answered this question itself: the cat reacts as well as the text
  const mood = moodOfGuardrail(response.guardrail);
  if (!mood) return bubble;
  return (
    <div className="flex max-w-full min-w-0 items-end gap-2 self-start">
      <CatIcon mood={mood} />
      {bubble}
    </div>
  );
}

function CitationLink({
  title,
  url,
  onPreview,
}: {
  title: string;
  url?: string | null;
  onPreview?: () => void;
}) {
  if (onPreview)
    return (
      <button
        type="button"
        className="text-primary inline text-left hover:underline"
        onClick={onPreview}
      >
        {title}
      </button>
    );
  if (!isWebUrl(url)) return <>{title}</>;
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

function ChatMessageModal({
  source,
  onClose,
}: {
  source: searchTypes.SchemaAnswerSource;
  onClose: () => void;
}) {
  const { i18n } = useLingui();
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={source.title}
      containerClassName="max-w-2xl"
    >
      {(source.author || source.date) && (
        <p className="text-base-content/70 text-sm">
          {source.author}
          {source.author && source.date && " · "}
          {source.date && (
            <time dateTime={source.date}>
              {new Date(source.date).toLocaleString(i18n.locale, {
                timeZone: "Europe/Moscow",
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
          )}
        </p>
      )}
      <p className="max-h-[60vh] overflow-y-auto wrap-anywhere whitespace-pre-wrap">
        {source.text}
      </p>
      {isWebUrl(source.url) && (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary self-center hover:underline"
        >
          <Trans>Open in chat -&gt;</Trans>
        </a>
      )}
    </Modal>
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
    case "moodle":
      return <Trans>Moodle</Trans>;
    case "chat":
      return <Trans>Chat</Trans>;
  }
}
