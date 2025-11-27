import { SchemaWorkshop } from "@/api/workshops/types";
import { eventBadges } from "../EventBadges";
import { formatDate, formatTime, parseTime } from "../date-utils";
import { Link } from "@tanstack/react-router";
import { getSignedPeopleCount, imageLink } from "../event-utils";
import clsx from "clsx";
import { useCopyToClipboard } from "usehooks-ts";
import { useState } from "react";
import { CheckInButton } from "../CheckInButton";
import { LanguageBadge } from "../LanguageBadge";
import { MAX_CAPACITY } from "../EventEditPage/DateTime";

export interface EventTitleProps {
  event: SchemaWorkshop;
  pageLanguage: string | null;
  setPageLanguage: (v: string | null) => void;
  openModal: ((v: boolean) => void) | null;
  className?: string;
}

export default function EventTitle({
  event,
  pageLanguage,
  setPageLanguage,
  openModal,
  className,
}: EventTitleProps) {
  const [_, _copy] = useCopyToClipboard();
  const [copied, setCopied] = useState(false);
  const [timer, setTimer] = useState<any>();

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: event.english_name || event.russian_name,
          text: `Check out this event:\n${event.english_name || event.russian_name}\n\n${url}`,
          url: url,
        });
      } catch {
        copyToClipboard(url);
      }
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = (url: string) => {
    _copy(url).then((ok) => {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
      if (ok) {
        setCopied(true);
        setTimer(setTimeout(() => setCopied(false), 1500));
      } else {
        setCopied(false);
      }
    });
  };

  const getEventName = (): string => {
    if (!pageLanguage) return event.english_name || event.russian_name;

    if (pageLanguage === "english") return event.english_name;
    else return event.russian_name;
  };

  const signedPeople = getSignedPeopleCount(event);

  return (
    <div className={clsx("card card-border", className)}>
      <div
        className={`mb-4 flex items-start justify-between rounded-t-(--radius-box) bg-cover bg-center bg-repeat p-4 pb-18 md:pb-48 lg:pb-64 ${event.image_file_id ? "bg-contain bg-no-repeat" : "bg-size-[640px]"}`}
        style={{
          backgroundImage: `url("${event.image_file_id ? imageLink(event.id) : "/pattern.svg"}")`,
        }}
      >
        <div className="flex gap-2">
          <Link to="/events" className="btn btn-circle">
            <span className="icon-[line-md--arrow-left] text-2xl" />
          </Link>
          <span className="btn btn-circle" onClick={handleShare}>
            <span
              className={clsx(
                !copied
                  ? "icon-[bx--link] text-2xl"
                  : "icon-[mi--check] text-2xl",
              )}
            />
          </span>
          {openModal && (
            <Link
              className="btn btn-circle"
              to="/events/$id/edit"
              params={{ id: event.id }}
            >
              <span className="icon-[qlementine-icons--pen-12] text-lg" />
            </Link>
          )}
        </div>
        <LanguageBadge event={event} className="inline-flex md:hidden" />
      </div>
      <div className="card-body md:p-[var(--card-p, 1.5rem);] p-3 pt-0 md:pt-3">
        {event.language === "both" && (
          <div
            className={clsx("tabs tabs-box mb-1 flex flex-nowrap md:hidden")}
          >
            <input
              type="radio"
              name="language_tabs"
              className="tab h-auto w-full py-1.5"
              aria-label="English"
              onClick={() => setPageLanguage("english")}
              defaultChecked
            />
            <input
              type="radio"
              name="language_tabs"
              className="tab h-auto w-full py-1.5"
              onClick={() => setPageLanguage("russian")}
              aria-label="Russian"
            />
          </div>
        )}
        <div className="mb-0.5 flex items-end justify-between">
          <div className="flex flex-wrap gap-2">
            {event.badges.length !== 0 ? (
              event.badges.map((badge) => (
                <div key={badge.title}>{eventBadges[badge.title]}</div>
              ))
            ) : (
              <span className="ml-2 font-semibold text-neutral-600">
                No Tags
              </span>
            )}
          </div>
          <div className={clsx("tabs tabs-box hidden rounded-full md:flex")}>
            <input
              type="radio"
              name="language_tabs"
              className="tab h-auto rounded-full py-1"
              aria-label="English"
              onClick={() => setPageLanguage("english")}
              defaultChecked
            />
            <input
              type="radio"
              name="language_tabs"
              className="tab h-auto rounded-full py-1"
              onClick={() => setPageLanguage("russian")}
              aria-label="Russian"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageBadge
            event={event}
            className="hidden self-start md:inline-flex"
          />
          <h1 className="font-rubik text-justify text-2xl font-semibold">
            {getEventName()}
          </h1>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
          {event.place && (
            <div className="flex items-center gap-1">
              <span className="text-primary icon-[ic--baseline-place] text-2xl" />
              <Link
                to="/maps"
                search={{ q: event.place || "" }}
                className="cursor-pointer text-neutral-400 underline hover:text-neutral-700"
                title="Click to view on map"
              >
                {event.place}
              </Link>
            </div>
          )}
          <div className="flex items-center gap-1">
            <span className="text-primary icon-[mingcute--calendar-fill] text-2xl" />
            <span className="text-neutral-400">
              {formatDate(event.dtstart || "")}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-primary icon-[iconamoon--clock-fill] text-2xl" />
            <span className="text-neutral-400">
              {formatTime(parseTime(event.dtstart || ""))}-
              {formatTime(parseTime(event.dtend || ""))}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-primary icon-[famicons--people] text-2xl" />
            <span className="flex items-center text-neutral-400">
              {event.capacity === MAX_CAPACITY
                ? signedPeople + "/"
                : signedPeople + "/" + event.capacity}
              {event.capacity === MAX_CAPACITY && (
                <span className="icon-[fa7-solid--infinity]" />
              )}
            </span>
          </div>
        </div>
        <div className="hidden justify-end md:flex">
          <CheckInButton event={event} className="btn-wide" />
        </div>
      </div>
    </div>
  );
}
