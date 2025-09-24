import { $workshops, workshopsTypes } from "@/api/workshops";
import { CheckInButton } from "@/components/workshops/CheckInButton.tsx";
import { Link } from "@tanstack/react-router";
import React, { useState } from "react";
import FoundPersonModal from "@/components/common/FoundPersonModal.tsx";
import { useFoundPeople } from "@/lib/easter-eggs/FoundPeopleContext.tsx";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatDate, formatTime, getDate, parseTime } from "./date-utils.ts";

const processTextNode = (
  text: string,
  opts?: { onFound?: () => void },
): (string | React.JSX.Element)[] => {
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
          className="break-all text-brand-violet hover:text-brand-violet/80"
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
          className="break-all text-brand-violet hover:text-brand-violet/80"
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
    // Easter egg: clickable name
    const name = "Ruslan Belkov";
    const tail = text.slice(i);
    if (tail.startsWith(name)) {
      if (buffer) {
        result.push(buffer);
        buffer = "";
      }
      result.push(
        <button
          key={`egg-${i}`}
          type="button"
          className="underline underline-offset-2 hover:text-contrast"
          onClick={() => opts?.onFound && opts.onFound()}
        >
          {name}
        </button>,
      );
      i += name.length - 1;
      continue;
    }

    buffer += text[i];
  }
  if (buffer) {
    result.push(buffer);
  }
  return result;
};

export function MarkdownWithCustomLinks({
  children,
  onFound,
}: {
  children: string;
  onFound?: () => void;
}) {
  // Функция для обработки различных типов children
  const processChildrenRecursively = (
    children: React.ReactNode,
  ): React.ReactNode => {
    if (typeof children === "string") {
      return processTextNode(children, { onFound });
    }

    if (Array.isArray(children)) {
      return children.map((child, index) => {
        if (typeof child === "string") {
          return (
            <React.Fragment key={index}>
              {processTextNode(child, { onFound })}
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
        // Переопределяем рендеринг текстовых узлов для обработки URL, Telegram и клика по имени
        text: ({ children }) => {
          if (typeof children === "string") {
            return <>{processTextNode(children, { onFound })}</>;
          }
          return <>{children}</>;
        },
        // Стилизация ссылок в markdown
        a: ({ href, children }) => (
          <a
            className="break-all text-brand-violet hover:text-brand-violet/80"
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
  const [foundOpen, setFoundOpen] = useState(false);
  const { markFound } = useFoundPeople();

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
    <div className="flex flex-col text-contrast">
      <div className="flex max-h-[60vh] overflow-y-auto">
        <div className="prose dark:prose-invert">
          <MarkdownWithCustomLinks
            onFound={() => {
              markFound("Ruslan Belkov");
              setFoundOpen(true);
            }}
          >
            {workshop.description || ""}
          </MarkdownWithCustomLinks>
        </div>
      </div>
      <div className="flex flex-row items-center gap-2 text-xl text-contrast/75">
        <div className="flex h-fit w-6">
          <span className="icon-[material-symbols--location-on-outline] text-2xl" />
        </div>
        <p className="flex w-full items-center whitespace-pre-wrap py-1 [overflow-wrap:anywhere]">
          <Link
            to="/maps"
            search={{ q: workshop.place || "" }}
            className="relative z-[5] cursor-pointer text-brand-violet underline hover:text-brand-violet/80"
            title="Click to view on map"
          >
            {workshop.place}
          </Link>
        </p>
      </div>
      <div className="flex flex-row items-center gap-2 text-xl text-contrast/75">
        <div className="flex h-fit w-6">
          <span className="icon-[material-symbols--today-outline] text-2xl" />
        </div>
        <p className="flex w-full items-center whitespace-pre-wrap py-1 [overflow-wrap:anywhere]">
          {formatDate(getDate(workshop.dtstart))}
        </p>
      </div>
      <div className="flex flex-row items-center gap-2 text-xl text-contrast/75">
        <div className="flex h-fit w-6">
          <span className="icon-[material-symbols--schedule-outline] text-2xl" />
        </div>
        {formatTime(parseTime(workshop.dtstart)) +
          "-" +
          formatTime(parseTime(workshop.dtend))}
      </div>

      <div className="mt-2">
        <CheckInButton workshopId={workshop.id} />
      </div>

      {/* Секция с участниками */}
      <div className="mt-4">
        <div className="mb-3 flex flex-row items-center gap-2 text-xl text-contrast/75">
          <div className="flex h-fit w-6">
            <span className="icon-[material-symbols--group-outline] text-2xl" />
          </div>
          <p className="font-medium">Participants ({participants?.length})</p>
        </div>

        {participantsIsPending ? (
          <div className="flex items-center justify-center py-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-violet border-t-transparent"></div>
          </div>
        ) : participants && participants.length > 0 ? (
          <div className="space-y-2">
            {visibleParticipants.map((participant) => (
              <div
                key={participant.innohassle_id}
                className="whitespace-pre-wrap text-base text-contrast/80"
              >
                <span className="select-none text-brand-violet">• </span>
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
                    className="text-brand-violet hover:text-brand-violet/80"
                  >
                    @{participant.telegram_username}
                  </a>
                )}
              </div>
            ))}

            {hiddenCount > 0 && !showAllParticipants && (
              <button
                onClick={() => setShowAllParticipants(true)}
                className="mt-2 text-sm text-brand-violet transition-colors duration-200 hover:text-brand-violet/80"
              >
                and {hiddenCount} more participants
              </button>
            )}

            {showAllParticipants && participants.length > displayLimit && (
              <button
                onClick={() => setShowAllParticipants(false)}
                className="mt-2 text-sm text-brand-violet transition-colors duration-200 hover:text-brand-violet/80"
              >
                Hide
              </button>
            )}
          </div>
        ) : (
          <p className="text-base text-contrast/60">
            No one has checked in yet!
          </p>
        )}
      </div>
      <FoundPersonModal open={foundOpen} onOpenChange={setFoundOpen} />
    </div>
  );
}
