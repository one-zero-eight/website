import { SchemaWorkshop } from "@/api/workshops/types";
import clsx from "clsx";
import { eventBadges } from "../EventBadges";
import { formatDate, formatTime, isDatesEqual, parseTime } from "../date-utils";
import { Link } from "@tanstack/react-router";

export interface EventTitleProps {
  workshop: SchemaWorkshop;
  className?: string;
}

// const badges = [
//   "recommended",
//   "iu",
//   "music",
//   "sports",
//   "art",
//   "it",
//   "education",
//   "creativity",
//   "society",
//   "buisness",
//   "games",
// ];

const badges = ["recommended", "education", "creativity"];

export default function EventTitle({ workshop, className }: EventTitleProps) {
  return (
    <div className={clsx(className)}>
      <div className="mb-1 flex flex-wrap gap-2">
        {badges.map((badge) => (
          <div key={badge}>{eventBadges[badge]}</div>
        ))}
      </div>
      <h1 className="font-rubik text-2xl font-semibold">{workshop.name}</h1>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
        <div className="flex items-center gap-1">
          <span className="text-primary icon-[ic--baseline-place] text-2xl" />
          <Link
            to="/maps"
            search={{ q: workshop.place || "" }}
            className="cursor-pointer text-neutral-400 underline hover:text-neutral-700"
            title="Click to view on map"
          >
            {workshop.place}
          </Link>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-primary icon-[mingcute--calendar-fill] text-2xl" />
          <span className="text-neutral-400">
            {isDatesEqual(workshop.dtstart, workshop.dtend) ? (
              formatDate(workshop.dtstart)
            ) : (
              <span>
                {formatDate(workshop.dtstart)}-{formatDate(workshop.dtend)}
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-primary icon-[iconamoon--clock-fill] text-2xl" />
          <span className="text-neutral-400">
            {formatTime(parseTime(workshop.dtstart))}
          </span>
        </div>
      </div>
    </div>
  );
}
