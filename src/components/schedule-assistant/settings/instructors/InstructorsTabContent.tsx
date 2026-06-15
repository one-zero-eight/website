import type { SchemaInstructor } from "@/api/schedule-assistant/types.ts";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import {
  useCreateInstructorMutation,
  useInstructorsQuery,
} from "@/components/schedule-assistant/config/useConfig.tsx";
import {
  getSettingsSelectionKey,
  useSelection,
  type SettingsListRow,
} from "@/components/schedule-assistant/settings/useSelection.tsx";
import clsx from "clsx";
import { useMemo } from "react";

export function InstructorsTabContent() {
  const {
    data: instructors,
    isPending,
    isError,
    error,
  } = useInstructorsQuery();
  const { mutate: createInstructor, isPending: isCreating } =
    useCreateInstructorMutation();
  const { selectedSelectionId, selectItem } = useSelection();
  const items: SettingsListRow[] = useMemo(
    () =>
      (instructors ?? []).map((instructor: SchemaInstructor, index: number) => {
        const idStr = String(instructor?.id ?? "");
        const nameStr =
          instructor.name_ru ??
          instructor.name_en ??
          instructor.email ??
          instructor.id;
        const title = nameStr || idStr;
        const subtitle = nameStr ? idStr : undefined;
        return {
          id: `instructor-${index}`,
          title,
          subtitle,
          selection: { kind: "instructor", instructorIndex: index },
        };
      }),
    [instructors],
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

  return (
    <div className="flex flex-col gap-2">
      {items.length ? (
        <div className="flex flex-col gap-2">
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              data-instructor-id={instructors?.[index]?.id ?? ""}
              className={clsx(
                "btn btn-ghost rounded-box border-base-300 hover:bg-base-200 h-auto min-h-0 w-full flex-col items-start border px-3 py-2 text-left normal-case",
                selectedSelectionId === getSettingsSelectionKey(item.selection)
                  ? "btn-active border-primary/40 bg-primary/12 ring-primary ring-2 ring-inset"
                  : "bg-base-100",
              )}
              onClick={() => selectItem(item.selection)}
            >
              <span className="font-medium">{item.title}</span>
              {item.subtitle ? (
                <span className="text-base-content/70 text-xs">
                  {item.subtitle}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : (
        <div className="text-base-content/70 text-sm">
          Нет преподавателей в конфигурации.
        </div>
      )}
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
