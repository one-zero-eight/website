import { useNowMS } from "@/lib/utils/use-now.ts";
import Logo108 from "@/components/icons/Logo108.tsx";
import type { ReactNode } from "react";

type CountdownEventTemplate = {
  dateTemplate: string;
  name: string | ReactNode;
  iconClass: string;
};

type CountdownEvent = CountdownEventTemplate & {
  date: Date;
};

/**
 * Declaration of all events for countdown
 *
 * Format for dates is `YYYY-MM-DDTHH:MM:SS+TZ` (ISO 8601), but you can
 * use `*` instead of year to create an annual event.
 *
 * E.g. *-01-01+03:00 is a convenient declaration for a New Year in Moscow timezone.
 */
const countdownEventTemplates: CountdownEventTemplate[] = [
  {
    dateTemplate: "*-01-01+03:00",
    name: "New Year countdown",
    iconClass: "icon-[twemoji--christmas-tree]",
  },
  {
    dateTemplate: "*-06-01+03:00",
    name: "Summer countdown",
    iconClass: "icon-[twemoji--sun]",
  },
  {
    dateTemplate: "2026-02-06T19:00+03:00",
    name: (
      <span className="flex flex-row items-center gap-2">
        <span>Introduction to</span>
        <Logo108 className="size-8" />
        <span>countdown</span>
      </span>
    ),
    iconClass: "icon-[twemoji--purple-heart]",
  },
];

/**
 * Expands the list of events to include annual events, sorts them by date and returns the next event
 *
 * @param dateNow - Current date and time
 * @returns The next event from the list of events, or null if there are no events in the future
 */
function getNextCountdownEvent(dateNow: Date): CountdownEvent | null {
  const expandedEvents: CountdownEvent[] = [];

  for (const template of countdownEventTemplates) {
    const [y, _] = template.dateTemplate.split("-", 2);

    if (y === "*") {
      const fullYear = dateNow.getFullYear();
      expandedEvents.push({
        ...template,
        date: new Date(template.dateTemplate.replace("*", fullYear.toString())),
      });
      expandedEvents.push({
        ...template,
        date: new Date(
          template.dateTemplate.replace("*", (fullYear + 1).toString()),
        ),
      });
    } else {
      expandedEvents.push({
        ...template,
        date: new Date(template.dateTemplate),
      });
    }
  }

  const sortedEvents = expandedEvents.sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
  for (const event of sortedEvents) {
    if (event.date.getTime() > dateNow.getTime()) {
      return event;
    }
  }
  return null;
}

/**
 * Formats the time left for the next event
 *
 * @param deltaTimeSeconds - The time left in seconds
 * @returns The formatted time left in days, hours, minutes and seconds
 */
const formatCountdownTimeLeft = (deltaTimeSeconds: number): string => {
  const seconds = Math.floor(deltaTimeSeconds % 60);
  const minutes = Math.floor((deltaTimeSeconds / 60) % 60);
  const hours = Math.floor((deltaTimeSeconds / 60 / 60) % 24);
  const days = Math.floor(deltaTimeSeconds / 60 / 60 / 24);

  return (
    `${days} day${days > 1 ? "s" : ""}, ` +
    `${hours} hour${hours > 1 ? "s" : ""}, ` +
    `${minutes} minute${minutes > 1 ? "s" : ""}, ` +
    `${seconds} second${seconds > 1 ? "s" : ""}`
  );
};

export function CountdownWidget() {
  const nowMs = useNowMS(true, 1000);

  const nextEvent = getNextCountdownEvent(new Date(nowMs));
  if (!nextEvent) {
    return null;
  }

  const deltaTimeSeconds = (nextEvent.date.getTime() - nowMs) / 1000;

  return (
    <div className="group bg-inh-primary rounded-box flex flex-row gap-4 px-4 py-4">
      <span
        className={`${nextEvent.iconClass} text-primary hidden w-12 shrink-0 text-5xl sm:block`}
      />
      <div className="flex flex-col">
        <div className="flex text-lg font-semibold">
          <span
            className={`${nextEvent.iconClass} text-primary mr-2 shrink-0 text-3xl sm:hidden`}
          />
          <span>{nextEvent.name}</span>
        </div>
        <div className="text-base-content/75 line-clamp-1 break-all">
          {formatCountdownTimeLeft(deltaTimeSeconds)}
        </div>
      </div>
    </div>
  );
}
