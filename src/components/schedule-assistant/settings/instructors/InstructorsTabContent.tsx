import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import {
  useCreateInstructorMutation,
  useInstructorsQuery,
  useTermQuery,
} from "@/components/schedule-assistant/config/useConfig.tsx";
import { InstructorPreferenceThumbnail } from "@/components/schedule-assistant/settings/instructors/InstructorPreferenceThumbnail.tsx";
import {
  createInstructorsSearchIndex,
  INSTRUCTOR_SORT_OPTIONS,
  instructorDisplayName,
  searchInstructors,
  sortInstructors,
  type InstructorSearchItem,
  type InstructorSortMode,
} from "@/components/schedule-assistant/settings/instructors/instructorsSearchUtils.ts";
import {
  getSettingsSelectionKey,
  useSelection,
} from "@/components/schedule-assistant/settings/useSelection.tsx";
import clsx from "clsx";
import { memo, useCallback, useDeferredValue, useMemo, useState } from "react";

const InstructorListRow = memo(function InstructorListRow({
  instructor,
  term,
  selected,
  onSelect,
}: {
  instructor: InstructorSearchItem;
  term: ReturnType<typeof useTermQuery>["data"];
  selected: boolean;
  onSelect: (instructorIndex: number) => void;
}) {
  const { instructorIndex } = instructor;
  const name = instructorDisplayName(instructor);
  const idStr = String(instructor.id ?? "");
  const position = instructor.position?.trim() || "";
  const meetingsCount = instructor.meetings_count ?? 0;
  const meta = [
    name ? idStr : null,
    position,
    meetingsCount > 0 ? `${meetingsCount} зан.` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      type="button"
      data-instructor-id={idStr}
      className={clsx(
        "btn btn-ghost rounded-box border-base-300 hover:bg-base-200 h-auto min-h-0 w-full flex-row items-center justify-between gap-3 border py-1 pr-2 pl-3 text-left normal-case",
        selected
          ? "btn-active border-primary/40 bg-primary/12 ring-primary ring-2 ring-inset"
          : "bg-base-100",
      )}
      onClick={() => onSelect(instructorIndex)}
    >
      <span className="flex min-w-0 flex-1 flex-col items-start justify-center gap-0.5 py-1">
        <span className="font-medium">{name || idStr}</span>
        {meta ? (
          <span className="text-base-content/70 min-w-0 truncate text-xs">
            {meta}
          </span>
        ) : null}
      </span>
      <InstructorPreferenceThumbnail
        term={term}
        preferences={instructor.slot_preferences}
      />
    </button>
  );
});

function InstructorListSection({
  title,
  instructors,
  term,
  selectedSelectionId,
  onSelect,
  className,
}: {
  title: string;
  instructors: InstructorSearchItem[];
  term: ReturnType<typeof useTermQuery>["data"];
  selectedSelectionId: string;
  onSelect: (instructorIndex: number) => void;
  className?: string;
}) {
  if (!instructors.length) return null;

  return (
    <div className={clsx("flex flex-col gap-2", className)}>
      <div className="text-base-content/60 px-0.5 text-xs font-semibold tracking-wide uppercase">
        {title}
        <span className="text-base-content/40 ml-1.5 font-normal normal-case">
          {instructors.length}
        </span>
      </div>
      {instructors.map((instructor) => {
        const selection = {
          kind: "instructor" as const,
          instructorIndex: instructor.instructorIndex,
        };
        return (
          <InstructorListRow
            key={`instructor-${instructor.instructorIndex}`}
            instructor={instructor}
            term={term}
            selected={
              selectedSelectionId === getSettingsSelectionKey(selection)
            }
            onSelect={onSelect}
          />
        );
      })}
    </div>
  );
}

export function InstructorsTabContent() {
  const {
    data: instructors,
    isPending,
    isError,
    error,
  } = useInstructorsQuery();
  const { data: term } = useTermQuery();
  const { mutate: createInstructor, isPending: isCreating } =
    useCreateInstructorMutation();
  const { selectedSelectionId, selectItem } = useSelection();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<InstructorSortMode>("meetings");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const handleSelectInstructor = useCallback(
    (instructorIndex: number) => {
      selectItem({ kind: "instructor", instructorIndex });
    },
    [selectItem],
  );

  const searchIndex = useMemo(
    () => createInstructorsSearchIndex(instructors ?? []),
    [instructors],
  );

  const visibleInstructors: InstructorSearchItem[] = useMemo(() => {
    const list = instructors ?? [];
    const trimmed = deferredSearchQuery.trim();
    const indexed = trimmed
      ? searchInstructors(searchIndex, trimmed)
      : list.map((instructor, instructorIndex) => ({
          ...instructor,
          instructorIndex,
        }));
    return sortInstructors(indexed, sortMode);
  }, [deferredSearchQuery, instructors, searchIndex, sortMode]);

  const activeInstructors = useMemo(
    () => visibleInstructors.filter((item) => (item.meetings_count ?? 0) > 0),
    [visibleInstructors],
  );
  const inactiveInstructors = useMemo(
    () => visibleInstructors.filter((item) => (item.meetings_count ?? 0) <= 0),
    [visibleInstructors],
  );

  if (isPending) {
    return <div className="skeleton h-40 w-full" />;
  }

  if (isError) {
    return (
      <div className="alert alert-error alert-soft text-sm">
        {formatApiErrorMessage(error)}
      </div>
    );
  }

  const hasInstructors = (instructors?.length ?? 0) > 0;
  const trimmedSearch = deferredSearchQuery.trim();
  const isSearchStale = searchQuery.trim() !== trimmedSearch;

  return (
    <div className="flex flex-col gap-2">
      {hasInstructors ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-1/2">
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
          <select
            className="select select-bordered select-sm w-56"
            value={sortMode}
            onChange={(event) =>
              setSortMode(event.target.value as InstructorSortMode)
            }
          >
            {INSTRUCTOR_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div
        className={clsx("flex flex-col gap-4", isSearchStale && "opacity-60")}
      >
        {visibleInstructors.length ? (
          <>
            <InstructorListSection
              title="Активные"
              instructors={activeInstructors}
              term={term}
              selectedSelectionId={selectedSelectionId}
              onSelect={handleSelectInstructor}
            />
            <InstructorListSection
              className="mt-4"
              title="Неактивные"
              instructors={inactiveInstructors}
              term={term}
              selectedSelectionId={selectedSelectionId}
              onSelect={handleSelectInstructor}
            />
          </>
        ) : (
          <div className="text-base-content/70 text-sm">
            {trimmedSearch
              ? "Ничего не найдено."
              : "Нет преподавателей в конфигурации."}
          </div>
        )}
      </div>
      <button
        type="button"
        className="btn btn-outline btn-secondary btn-sm mt-1 w-fit shrink-0"
        disabled={isCreating}
        onClick={() =>
          createInstructor({
            body: {
              id: `new-instructor-${(instructors?.length ?? 0) + 1}`,
              alias: null,
              email: null,
              name_en: null,
              name_ru: null,
              position: null,
            },
          })
        }
      >
        {isCreating ? (
          <span className="loading loading-spinner loading-sm" />
        ) : (
          "Добавить преподавателя"
        )}
      </button>
    </div>
  );
}
