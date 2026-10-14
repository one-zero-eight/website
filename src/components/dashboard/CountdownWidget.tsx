import Logo108 from "@/components/icons/Logo108.tsx";
import { cn } from "@/lib/ui/cn";
import { useNowMS } from "@/lib/utils/use-now.ts";
import type { ReactNode } from "react";

type CountdownEventTemplate = {
  dateTemplate: string;
  name: string | ReactNode;
  iconClass: string;
};
type CountdownEvent = CountdownEventTemplate & { date: Date };

// A leading * repeats the event annually, in the timestamp's timezone.
const countdownEventTemplates: CountdownEventTemplate[] = [
  {
    dateTemplate: "*-01-01T00:00:00+03:00",
    name: "New Year countdown",
    iconClass: "icon-[twemoji--christmas-tree]",
  },
  {
    dateTemplate: "*-06-01T00:00:00+03:00",
    name: "Summer countdown",
    iconClass: "icon-[twemoji--sun]",
  },
  {
    dateTemplate: "2026-02-06T19:00+03:00",
    name: (
      <span className="flex flex-wrap items-center gap-2">
        Introduction to <Logo108 className="size-8" /> countdown
      </span>
    ),
    iconClass: "icon-[twemoji--purple-heart]",
  },
];

function getNextCountdownEvent(now: Date): CountdownEvent | undefined {
  return countdownEventTemplates
    .flatMap((template) => {
      const dates = template.dateTemplate.startsWith("*")
        ? [now.getFullYear(), now.getFullYear() + 1].map((year) =>
            template.dateTemplate.replaceAll("*", String(year)),
          )
        : [template.dateTemplate];
      return dates.map((date) => ({ ...template, date: new Date(date) }));
    })
    .filter((event) => event.date > now)
    .sort((left, right) => left.date.getTime() - right.date.getTime())[0];
}

function formatCountdown(secondsLeft: number) {
  const units = [
    [Math.floor(secondsLeft / 86_400), "day"],
    [Math.floor((secondsLeft / 3600) % 24), "hour"],
    [Math.floor((secondsLeft / 60) % 60), "minute"],
    [Math.floor(secondsLeft % 60), "second"],
  ] as const;
  return units
    .map(([value, unit]) => `${value} ${unit}${value === 1 ? "" : "s"}`)
    .join(", ");
}

export function CountdownWidget() {
  const nowMs = useNowMS(true, 1000);
  const nextEvent = getNextCountdownEvent(new Date(nowMs));
  if (!nextEvent) return null;

  return (
    <div className="bg-base-200 rounded-box flex min-w-0 gap-4 p-4">
      <span
        className={cn(nextEvent.iconClass, "hidden size-12 shrink-0 sm:block")}
      />
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <span
            className={cn(nextEvent.iconClass, "size-8 shrink-0 sm:hidden")}
          />
          {nextEvent.name}
        </h2>
        <p className="text-base-content/75 text-sm tabular-nums">
          {formatCountdown((nextEvent.date.getTime() - nowMs) / 1000)}
        </p>
      </div>
    </div>
  );
}
