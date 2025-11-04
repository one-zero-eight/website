import { $workshops, workshopsTypes } from "@/api/workshops";
import { CheckInButton } from "@/components/events/CheckInButton.tsx";
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const processTextNode = (text: string): (string | React.JSX.Element)[] => {
  const result: (string | React.JSX.Element)[] = [];
  let buffer = "";

  for (let i = 0; i < text.length; i++) {
    const urlMatch = text.slice(i).match(/^https?:\/\/[^\s<>{}|\\^[\]`"()]+/i);
    if (urlMatch) {
      if (buffer) {
        result.push(buffer);
        buffer = "";
      }
      const url = urlMatch[0];
      result.push(
        <a
          className="text-primary hover:text-primary/80 break-all"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          key={`url-${i}`}
        >
          {url}
        </a>,
      );
      i += url.length - 1;
      continue;
    }
    const tgMatch = text.slice(i).match(/^@[a-zA-Z0-9_]{5,32}\b/);
    if (tgMatch) {
      if (buffer) {
        result.push(buffer);
        buffer = "";
      }
      const username = tgMatch[0];
      result.push(
        <a
          className="text-primary hover:text-primary/80 break-all"
          href={`https://t.me/${username.slice(1)}`}
          target="_blank"
          rel="noopener noreferrer"
          key={`tg-${i}`}
        >
          {username}
        </a>,
      );
      i += username.length - 1;
      continue;
    }
    buffer += text[i];
  }
  if (buffer) {
    result.push(buffer);
  }
  return result;
};

export function MarkdownWithCustomLinks({ children }: { children: string }) {
  // Функция для обработки различных типов children
  const processChildrenRecursively = (
    children: React.ReactNode,
  ): React.ReactNode => {
    if (typeof children === "string") {
      return processTextNode(children);
    }

    if (Array.isArray(children)) {
      return children.map((child, index) => {
        if (typeof child === "string") {
          return (
            <React.Fragment key={index}>
              {processTextNode(child)}
            </React.Fragment>
          );
        }
        return child;
      });
    }

    return children;
  };

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Переопределяем рендеринг текстовых узлов для обработки URL и Telegram алиасов
        text: ({ children }) => {
          if (typeof children === "string") {
            return <>{processTextNode(children)}</>;
          }
          return <>{children}</>;
        },
        // Стилизация ссылок в markdown
        a: ({ href, children }) => (
          <a
            className="text-primary hover:text-primary/80 break-all"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {processChildrenRecursively(children)}
          </a>
        ),
        // Стилизация жирного текста с обработкой текста внутри
        strong: ({ children }) => (
          <strong className="font-bold">
            {processChildrenRecursively(children)}
          </strong>
        ),
        // Стилизация курсива с обработкой текста внутри
        em: ({ children }) => (
          <em className="italic">{processChildrenRecursively(children)}</em>
        ),
        // Стилизация параграфов
        p: ({ children }) => <p>{processChildrenRecursively(children)}</p>,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

export function Description({
  workshop,
}: {
  workshop: workshopsTypes.SchemaWorkshop;
}) {
  const [showAllParticipants, setShowAllParticipants] = useState(false);

  const { data: participants, isPending: participantsIsPending } =
    $workshops.useQuery("get", "/workshops/{workshop_id}/checkins", {
      params: { path: { workshop_id: workshop?.id } },
    });

  const displayLimit = 5; // Количество участников для отображения по умолчанию
  const visibleParticipants = participants
    ? showAllParticipants
      ? participants
      : participants.slice(0, displayLimit)
    : [];
  const hiddenCount = (participants?.length ?? 0) - displayLimit;

  if (!workshop) {
    return <div>No description</div>;
  }

  return (
    <div className="text-base-content flex flex-col">
      <div className="flex max-h-[60vh] overflow-y-auto">
        <div className="prose dark:prose-invert">
          <MarkdownWithCustomLinks>
            {workshop.description || ""}
          </MarkdownWithCustomLinks>
        </div>
      </div>

      <div className="mt-2">
        <CheckInButton workshopId={workshop.id} />
      </div>

      {/* Секция с участниками */}
      <div className="mt-4">
        <div className="text-base-content/75 mb-3 flex flex-row items-center gap-2 text-xl">
          <div className="flex h-fit w-6">
            <span className="icon-[material-symbols--group-outline] text-2xl" />
          </div>
          <p className="font-medium">Participants ({participants?.length})</p>
        </div>

        {participantsIsPending ? (
          <div className="flex items-center justify-center py-4">
            <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"></div>
          </div>
        ) : participants && participants.length > 0 ? (
          <div className="space-y-2">
            {visibleParticipants.map((participant) => (
              <div
                key={participant.innohassle_id}
                className="text-base-content/80 text-base whitespace-pre-wrap"
              >
                <span className="text-primary select-none">• </span>
                <span className="font-mono">
                  {participant.email.split("@")[0]}
                </span>
                {"\t"}
                {participant.name && <span>{participant.name}</span>}
                {"\t"}
                {participant.telegram_username && (
                  <a
                    href={`https://t.me/${participant.telegram_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80"
                  >
                    @{participant.telegram_username}
                  </a>
                )}
              </div>
            ))}

            {hiddenCount > 0 && !showAllParticipants && (
              <button
                onClick={() => setShowAllParticipants(true)}
                className="text-primary hover:text-primary/80 mt-2 text-sm transition-colors duration-200"
              >
                and {hiddenCount} more participants
              </button>
            )}

            {showAllParticipants && participants.length > displayLimit && (
              <button
                onClick={() => setShowAllParticipants(false)}
                className="text-primary hover:text-primary/80 mt-2 text-sm transition-colors duration-200"
              >
                Hide
              </button>
            )}
          </div>
        ) : (
          <p className="text-base-content/60 text-base">
            No one has checked in yet!
          </p>
        )}
      </div>
    </div>
  );
}
