import { ReactNode, useMemo } from "react";
import moment from "moment";
import { Fragment } from "react";

const NO_DATE_KEY = "no-date";

function formatDayLabel(key: string) {
  if (key === NO_DATE_KEY) {
    return "No date";
  }
  const day = moment(key, "YYYY-MM-DD");
  return day.year() === moment().year()
    ? day.format("Do MMMM")
    : day.format("Do MMMM YYYY");
}

type DayGroup<T> = {
  key: string;
  label: string;
  items: T[];
};

/**
 * Groups event cards into collapsible "Future" / "Past" sections with
 * collapsible per-day groups inside.
 *
 * Future: nearest date first (ascending).
 * Past: nearest date first (descending).
 * Within a day, future events go earliest-first, past events latest-first.
 */
export function EventsByDate<T extends { id: string }>({
  events,
  getStartsAt,
  renderCard,
  gridClassName = "grid grid-cols-1 gap-4 @min-[700px]/content:grid-cols-2 @min-[1000px]/content:grid-cols-3",
}: {
  events: T[];
  getStartsAt: (event: T) => string | null | undefined;
  renderCard: (event: T) => ReactNode;
  gridClassName?: string;
}) {
  const { future, past } = useMemo(() => {
    const today = moment().startOf("day");
    const futureMap = new Map<string, T[]>();
    const pastMap = new Map<string, T[]>();

    for (const event of events) {
      const startsAt = getStartsAt(event);
      if (!startsAt) {
        futureMap.set(NO_DATE_KEY, [
          ...(futureMap.get(NO_DATE_KEY) ?? []),
          event,
        ]);
        continue;
      }
      const day = moment(startsAt).startOf("day");
      const key = day.format("YYYY-MM-DD");
      const target = day.isBefore(today) ? pastMap : futureMap;
      target.set(key, [...(target.get(key) ?? []), event]);
    }

    const toSortedGroups = (
      map: Map<string, T[]>,
      ascending: boolean,
    ): DayGroup<T>[] =>
      [...map.entries()]
        .sort(([a], [b]) =>
          ascending ? a.localeCompare(b) : b.localeCompare(a),
        )
        .map(([key, items]) => ({
          key,
          label: formatDayLabel(key),
          items: items.sort((a, b) => {
            const ta = getStartsAt(a) ? moment(getStartsAt(a)).valueOf() : 0;
            const tb = getStartsAt(b) ? moment(getStartsAt(b)).valueOf() : 0;
            return ascending ? ta - tb : tb - ta;
          }),
        }));

    return {
      future: toSortedGroups(futureMap, true),
      past: toSortedGroups(pastMap, false),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  const renderSection = (title: string, groups: DayGroup<T>[]) => {
    if (groups.length === 0) {
      return null;
    }

    const total = groups.reduce((sum, group) => sum + group.items.length, 0);

    return (
      <details className="collapse-arrow collapse" open>
        <summary className="collapse-title flex items-center gap-2 py-1 pr-6 text-lg font-medium">
          {title}
          <span className="badge badge-ghost">{total}</span>
        </summary>
        <div className="collapse-content py-1 pl-3">
          {groups.map((group) => (
            <details key={group.key} className="collapse-arrow collapse" open>
              <summary className="collapse-title text-base-content/70 flex items-center gap-2 py-1 pr-6 text-sm font-medium">
                {group.label}
                <span className="badge badge-ghost">{group.items.length}</span>
              </summary>
              <div className="collapse-content py-1 pl-3">
                <div className={gridClassName}>
                  {group.items.map((item) => (
                    <Fragment key={item.id}>{renderCard(item)}</Fragment>
                  ))}
                </div>
              </div>
            </details>
          ))}
        </div>
      </details>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {renderSection("Future", future)}
      {renderSection("Past", past)}
    </div>
  );
}
