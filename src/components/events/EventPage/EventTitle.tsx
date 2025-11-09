import { SchemaWorkshop } from "@/api/workshops/types";
import { eventBadges } from "../EventBadges";
import { formatDate, formatTime, parseTime } from "../date-utils";
import { Link } from "@tanstack/react-router";
import { eventLangauage } from "../event-utils";
import clsx from "clsx";
import { useCopyToClipboard } from "usehooks-ts";
import { useState } from "react";
import { CheckInButton } from "../CheckInButton";

export interface EventTitleProps {
  event: SchemaWorkshop;
  pageLanguage: string | null;
  setPageLanguage: (v: string | null) => void;
  className?: string;
}

export default function EventTitle({
  event,
  pageLanguage,
  setPageLanguage,
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

  return (
    <div className={clsx("card card-border", className)}>
      <div className="bg-primary mb-4 flex items-start justify-between rounded-t-xl p-4 pb-16 lg:pb-36">
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
        </div>
        <LanguageBadge workshop={event} className="inline-flex md:hidden" />
      </div>
      <div className="card-body md:p-[var(--card-p, 1.5rem);] p-3">
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
          {event.language === "both" && (
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
          )}
        </div>
        <div className="flex items-center gap-2">
          <LanguageBadge workshop={event} className="hidden md:inline-flex" />
          <h1 className="font-rubik text-justify text-2xl font-semibold">
            {getEventName()}
          </h1>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
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
          <div className="flex items-center gap-1">
            <span className="text-primary icon-[mingcute--calendar-fill] text-2xl" />
            <span className="text-neutral-400">
              {formatDate(event.dtstart)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-primary icon-[iconamoon--clock-fill] text-2xl" />
            <span className="text-neutral-400">
              {formatTime(parseTime(event.dtstart))}-
              {formatTime(parseTime(event.dtend))}
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

interface LanguageBadgeProps {
  workshop: SchemaWorkshop;
  className?: string;
}

function LanguageBadge({ workshop, className }: LanguageBadgeProps) {
  return (
    <div
      className={clsx(
        "badge badge-soft rounded-lg font-bold [--badge-color:var(--color-emerald-500)]",
        className,
      )}
    >
      {eventLangauage(workshop)}
    </div>
  );
}
