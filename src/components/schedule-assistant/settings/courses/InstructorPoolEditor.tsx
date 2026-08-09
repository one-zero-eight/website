import type {
  SchemaCourseConfig,
  SchemaInstructor,
} from "@/api/schedule-assistant/types.ts";
import {
  createInstructorsSearchIndex,
  instructorDisplayName,
  searchInstructors,
} from "@/components/schedule-assistant/settings/instructors/instructorsSearchUtils.ts";
import { cn } from "@/lib/ui/cn";
import { useDeferredValue, useMemo, useState } from "react";

export type InstructorPoolEntry = string | string[];

function entryKey(entry: InstructorPoolEntry, index: number) {
  if (Array.isArray(entry)) return `set-${index}-${entry.join("|")}`;
  return `solo-${index}-${entry}`;
}

function entryLabel(
  entry: InstructorPoolEntry,
  labelById: Map<string, string>,
) {
  if (Array.isArray(entry)) {
    return entry.map((id) => labelById.get(id) ?? id).join(" + ");
  }
  return labelById.get(entry) ?? entry;
}

function valueUsesId(value: InstructorPoolEntry[], instructorId: string) {
  for (const entry of value) {
    if (Array.isArray(entry)) {
      if (entry.includes(instructorId)) return true;
    } else if (entry === instructorId) {
      return true;
    }
  }
  return false;
}

export function InstructorPoolEditor({
  value,
  onChange,
  instructors,
  courseInstructors,
}: {
  value: InstructorPoolEntry[];
  onChange: (next: InstructorPoolEntry[]) => void;
  instructors: SchemaInstructor[];
  courseInstructors?: SchemaCourseConfig["instructors"];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);
  const [addMode, setAddMode] = useState<"solo" | "team">("solo");
  const [draftSet, setDraftSet] = useState<string[]>([]);

  const labelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const instructor of instructors) {
      map.set(instructor.id, instructorDisplayName(instructor));
    }
    return map;
  }, [instructors]);

  const courseEntries = useMemo(() => {
    const seen = new Set<string>();
    const entries: { id: string; role: string }[] = [];
    for (const entry of courseInstructors ?? []) {
      const id = String(entry.id || "").trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      entries.push({ id, role: String(entry.role || "").trim() });
    }
    return entries;
  }, [courseInstructors]);

  const roleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of courseEntries) {
      if (entry.role) map.set(entry.id, entry.role);
    }
    return map;
  }, [courseEntries]);

  const preferredSet = useMemo(
    () => new Set(courseEntries.map((entry) => entry.id)),
    [courseEntries],
  );

  const searchIndex = useMemo(
    () => createInstructorsSearchIndex(instructors),
    [instructors],
  );

  const usedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const entry of value) {
      if (Array.isArray(entry)) {
        for (const id of entry) ids.add(id);
      } else {
        ids.add(entry);
      }
    }
    for (const id of draftSet) ids.add(id);
    return ids;
  }, [draftSet, value]);

  const courseCandidates = useMemo(() => {
    return courseEntries.filter((entry) => {
      if (addMode === "solo" && usedIds.has(entry.id)) return false;
      if (addMode === "team" && valueUsesId(value, entry.id)) return false;
      return true;
    });
  }, [addMode, courseEntries, usedIds, value]);

  const searchResults = useMemo(() => {
    const trimmed = deferredSearch.trim();
    if (!trimmed) return [];
    return searchInstructors(searchIndex, trimmed)
      .filter((item) => {
        if (addMode === "solo") return !usedIds.has(item.id);
        return !valueUsesId(value, item.id);
      })
      .slice(0, 8);
  }, [addMode, deferredSearch, searchIndex, usedIds, value]);

  function handleAddSolo(instructorId: string) {
    if (!instructorId || usedIds.has(instructorId)) return;
    onChange([...value, instructorId]);
    setSearchQuery("");
  }

  function handleToggleDraft(instructorId: string) {
    setDraftSet((current) =>
      current.includes(instructorId)
        ? current.filter((id) => id !== instructorId)
        : [...current, instructorId],
    );
  }

  function handlePick(instructorId: string) {
    if (addMode === "team") {
      handleToggleDraft(instructorId);
      return;
    }
    handleAddSolo(instructorId);
  }

  function handleCommitTeam() {
    if (draftSet.length < 2) return;
    onChange([...value, [...draftSet]]);
    setDraftSet([]);
    setSearchQuery("");
    setAddMode("solo");
  }

  function handleRemove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function handleSwitchMode(mode: "solo" | "team") {
    setAddMode(mode);
    if (mode === "solo") setDraftSet([]);
  }

  function roleLabelForEntry(entry: InstructorPoolEntry): string | null {
    if (Array.isArray(entry)) {
      const roles = entry
        .map((id) => roleById.get(id))
        .filter((role): role is string => Boolean(role));
      if (!roles.length) return null;
      return [...new Set(roles)].join(", ");
    }
    return roleById.get(entry) ?? null;
  }

  const showSearch = deferredSearch.trim().length > 0;

  return (
    <div className="flex flex-col gap-3">
      {value.length === 0 ? (
        <div className="text-base-content/60 text-sm">
          Никого не добавили в пул компонента.
        </div>
      ) : (
        <ul className="divide-base-300 border-base-300 divide-y overflow-hidden rounded-lg border">
          {value.map((entry, index) => {
            const isTeam = Array.isArray(entry);
            const roleLabel = roleLabelForEntry(entry);
            return (
              <li
                key={entryKey(entry, index)}
                className="flex items-center gap-2 px-2.5 py-1.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm leading-tight font-medium">
                    {entryLabel(entry, labelById)}
                  </div>
                  {isTeam ? (
                    <div className="text-base-content/55 truncate text-xs leading-tight">
                      Несколько одновременно
                    </div>
                  ) : null}
                </div>
                {roleLabel ? (
                  <div className="text-base-content/55 shrink-0 text-right text-xs leading-tight whitespace-nowrap">
                    {roleLabel}
                  </div>
                ) : null}
                <button
                  type="button"
                  className="btn btn-ghost btn-xs btn-square text-base-content/50 hover:text-error shrink-0"
                  title="Удалить"
                  onClick={() => handleRemove(index)}
                >
                  <span className="icon-[material-symbols--close] text-base" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="space-y-2">
        <div className="tabs tabs-box tabs-xs bg-base-200/50 w-fit p-0.5">
          <button
            type="button"
            className={cn("tab", addMode === "solo" && "tab-active")}
            onClick={() => handleSwitchMode("solo")}
          >
            Добавить одного
          </button>
          <button
            type="button"
            className={cn("tab", addMode === "team" && "tab-active")}
            onClick={() => handleSwitchMode("team")}
          >
            Несколько одновременно
          </button>
        </div>

        {addMode === "team" ? (
          <div className="bg-base-200/40 rounded-box flex flex-col gap-2 px-2.5 py-2">
            <div className="text-base-content/65 text-xs leading-snug">
              Выберите двух или больше — они ведут занятие вместе.
            </div>
            {draftSet.length ? (
              <div className="text-sm [overflow-wrap:anywhere]">
                <span className="text-base-content/50 text-xs">Выбрано: </span>
                {draftSet.map((id) => labelById.get(id) ?? id).join(" + ")}
              </div>
            ) : null}
            <button
              type="button"
              className="btn btn-primary btn-sm w-fit"
              disabled={draftSet.length < 2}
              onClick={handleCommitTeam}
            >
              Добавить
              {draftSet.length ? ` (${draftSet.length})` : ""}
            </button>
          </div>
        ) : null}

        <div className="relative min-w-0">
          <input
            type="search"
            className="input input-bordered input-sm w-full pr-8 [&::-webkit-search-cancel-button]:hidden"
            value={searchQuery}
            placeholder="Поиск преподавателя…"
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          {searchQuery ? (
            <button
              type="button"
              className="text-base-content/40 hover:text-base-content/70 absolute top-1/2 right-2 flex -translate-y-1/2 items-center rounded-sm transition-colors"
              onClick={() => setSearchQuery("")}
            >
              <span className="icon-[material-symbols--close] text-lg" />
            </button>
          ) : null}
        </div>

        {showSearch ? (
          searchResults.length > 0 ? (
            <ul className="border-base-300 divide-base-300 max-h-48 divide-y overflow-y-auto rounded-lg border">
              {searchResults.map((instructor) => {
                const selected =
                  addMode === "team" && draftSet.includes(instructor.id);
                const role = roleById.get(instructor.id);
                const subtitle = [
                  role ||
                    (preferredSet.has(instructor.id)
                      ? "Преподаватель курса"
                      : null),
                  instructor.position?.trim(),
                  instructor.email?.trim(),
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <li key={instructor.id}>
                    <button
                      type="button"
                      className={cn(
                        "hover:bg-base-300/50 flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors",
                        selected && "bg-primary/10",
                      )}
                      onClick={() => handlePick(instructor.id)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm leading-tight">
                          {instructorDisplayName(instructor)}
                        </div>
                        {subtitle ? (
                          <div className="text-base-content/55 truncate text-xs leading-tight">
                            {subtitle}
                          </div>
                        ) : null}
                      </div>
                      {selected ? (
                        <span className="icon-[material-symbols--check-rounded] text-primary shrink-0 text-lg" />
                      ) : (
                        <span className="icon-[material-symbols--add] text-base-content/45 shrink-0 text-lg" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-base-content/50 text-xs">
              Никого не найдено.
            </div>
          )
        ) : courseCandidates.length > 0 ? (
          <div className="space-y-1.5">
            <div className="text-base-content/70 text-xs font-medium tracking-wide uppercase">
              Преподаватели курса
            </div>
            <ul className="border-base-300 divide-base-300 max-h-48 divide-y overflow-y-auto rounded-lg border">
              {courseCandidates.map((entry) => {
                const selected =
                  addMode === "team" && draftSet.includes(entry.id);
                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      className={cn(
                        "hover:bg-base-300/50 flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors",
                        selected && "bg-primary/10",
                      )}
                      onClick={() => handlePick(entry.id)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm leading-tight">
                          {labelById.get(entry.id) ?? entry.id}
                        </div>
                        {entry.role ? (
                          <div className="text-base-content/55 truncate text-xs leading-tight">
                            {entry.role}
                          </div>
                        ) : null}
                      </div>
                      {selected ? (
                        <span className="icon-[material-symbols--check-rounded] text-primary shrink-0 text-lg" />
                      ) : (
                        <span className="icon-[material-symbols--add] text-base-content/45 shrink-0 text-lg" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : courseEntries.length === 0 ? (
          <div className="text-base-content/55 text-xs leading-snug">
            У курса пока нет преподавателей — найдите через поиск или назначьте
            их в боковой панели.
          </div>
        ) : (
          <div className="text-base-content/50 text-xs">
            Все преподаватели курса уже в пуле. Можно найти других через поиск.
          </div>
        )}
      </div>
    </div>
  );
}
