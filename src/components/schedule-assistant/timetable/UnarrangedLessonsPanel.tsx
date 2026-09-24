import { cn } from "@/lib/ui/cn";
import { useMemo, useState } from "react";

import type { ComponentScheduleStatus } from "./createMeetingUtils.ts";
import type {
  UnarrangedComponentGroup,
  UnarrangedLessonItem,
} from "./unarrangedLessons.ts";
import { countUnarrangedSessions } from "./unarrangedLessons.ts";

function statusDotClass(status: ComponentScheduleStatus) {
  if (status === "covered") return "bg-success";
  if (status === "partial") return "bg-warning";
  return "bg-base-content/25";
}

export function UnarrangedLessonsPanel({
  groups,
  selectedKey,
  onSelect,
  onCancel,
  placing,
}: {
  groups: UnarrangedComponentGroup[];
  selectedKey: string | null;
  onSelect: (item: UnarrangedLessonItem) => void;
  onCancel: () => void;
  placing?: boolean;
}) {
  const [query, setQuery] = useState("");
  const sessionCount = countUnarrangedSessions(groups);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((group) => {
        const groupMatches = group.searchText.toLowerCase().includes(q);
        const sessions = groupMatches
          ? group.sessions
          : group.sessions.filter((session) =>
              session.searchText.toLowerCase().includes(q),
            );
        if (!groupMatches && !sessions.length) return null;
        return { ...group, sessions };
      })
      .filter((group): group is UnarrangedComponentGroup => group !== null);
  }, [groups, query]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex flex-col gap-1">
        <div className="text-base-content flex items-baseline gap-2 text-lg leading-snug font-semibold">
          <span>Неразмещённые</span>
          {sessionCount ? (
            <span className="text-base-content/50 text-sm font-medium">
              {sessionCount}
            </span>
          ) : null}
        </div>
        {selectedKey ? (
          <div className="flex items-center justify-end">
            <button
              type="button"
              className="btn btn-ghost btn-xs shrink-0"
              onClick={onCancel}
              disabled={placing}
            >
              Отмена
            </button>
          </div>
        ) : (
          <p className="text-base-content/60 text-xs leading-relaxed">
            Выберите серию, затем кликните по пустому слоту.
          </p>
        )}
      </div>

      <label className="input input-sm input-bordered flex w-full items-center gap-2">
        <span className="icon-[material-symbols--search-rounded] text-base-content/45 text-base" />
        <input
          type="search"
          className="grow"
          placeholder="Поиск…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      {!groups.length ? (
        <div className="border-base-300 bg-base-200/40 rounded-box flex flex-col items-center gap-2 border border-dashed px-4 py-8 text-center">
          <span className="icon-[material-symbols--check-circle-outline-rounded] text-success/70 text-3xl" />
          <div className="text-base-content text-sm font-medium">
            Всё размещено
          </div>
          <p className="text-base-content/60 max-w-56 text-xs leading-relaxed">
            В текущем разделе нет компонентов без слотов.
          </p>
        </div>
      ) : !filtered.length ? (
        <p className="text-base-content/60 px-1 py-4 text-center text-sm">
          Ничего не найдено
        </p>
      ) : (
        <ul className="flex min-h-0 flex-1 [scrollbar-width:thin] flex-col gap-3 overflow-y-auto">
          {filtered.map((group) => (
            <li key={group.key} className="flex flex-col gap-1.5">
              <div className="flex min-w-0 flex-col gap-0.5 px-0.5">
                <div
                  className="text-base-content truncate text-sm leading-snug font-medium"
                  title={group.label}
                >
                  {group.label}
                </div>
                {group.modeLabel ? (
                  <div className="text-base-content/60 text-[0.6875rem] leading-tight">
                    {group.modeLabel}
                  </div>
                ) : null}
                {group.instructorLabel ? (
                  <div
                    className="text-base-content/60 text-[0.6875rem] leading-tight"
                    title={group.instructorLabel}
                  >
                    {group.instructorLabel}
                  </div>
                ) : null}
              </div>
              {!group.sessions.length ? (
                <p className="text-base-content/55 px-0.5 text-xs">
                  Нет аудитории для размещения
                </p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {group.sessions.map((item) => {
                    const selected = item.key === selectedKey;
                    return (
                      <li key={item.key}>
                        <button
                          type="button"
                          className={cn(
                            "hover:bg-base-200 flex w-full flex-col gap-0.5 rounded-lg border px-2.5 py-2 text-left transition-colors",
                            selected
                              ? "border-primary bg-primary/5 ring-primary/30 ring-1"
                              : "border-base-300 bg-base-100",
                            placing && selected && "opacity-70",
                          )}
                          onClick={() => onSelect(item)}
                          disabled={placing && selected}
                        >
                          <span className="flex min-w-0 items-start gap-2">
                            <span
                              className={cn(
                                "mt-1 inline-block size-2.5 shrink-0 rounded-full",
                                statusDotClass(item.status),
                              )}
                            />
                            <span className="min-w-0 flex-1">
                              <span
                                className="text-base-content block truncate text-sm leading-snug font-medium"
                                title={item.audienceLabel}
                              >
                                {item.audienceLabel || item.statusLabel}
                              </span>
                              <span className="text-base-content/60 mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[0.6875rem] leading-tight">
                                <span>{item.statusLabel}</span>
                                {item.progressHint ? (
                                  <>
                                    <span className="text-base-content/30">
                                      ·
                                    </span>
                                    <span className="shrink-0 tabular-nums">
                                      {item.progressHint}
                                    </span>
                                  </>
                                ) : null}
                              </span>
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
