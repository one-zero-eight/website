import { useEffect, useId, useState } from "react";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import {
  useConfig,
  useUpdateTermMutation,
} from "@/components/schedule-assistant/config/useConfig.tsx";
import { useSettingsSaveStatusContext } from "@/components/schedule-assistant/settings/settingsSaveStatus.tsx";
import { cn } from "@/lib/ui/cn";
import {
  dateToDay,
  firstAvailableBlockPeriod,
  sortSemesterBlocks,
  splitSemesterInTwo,
  validateSemesterBlocks,
  type SemesterBlock,
} from "./semesterBlocks.ts";

export function SemesterBlocksEditor() {
  const {
    config,
    isPending: isLoading,
    isError: isLoadError,
    error: loadError,
  } = useConfig();
  const {
    mutate: updateTerm,
    isPending,
    isError,
    error,
    reset,
  } = useUpdateTermMutation();
  const [draft, setDraft] = useState<SemesterBlock[] | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const fieldId = useId();
  const { setFieldDirty } = useSettingsSaveStatusContext();
  const term = config?.term;
  const blocks = draft ?? term?.blocks ?? [];
  const semester = term?.semester;
  const validationError = semester
    ? validateSemesterBlocks(semester, blocks)
    : null;
  const isDirty =
    draft !== null &&
    JSON.stringify(sortSemesterBlocks(draft)) !==
      JSON.stringify(sortSemesterBlocks(term?.blocks ?? []));

  useEffect(() => {
    setFieldDirty(fieldId, isDirty);
    return () => setFieldDirty(fieldId, false);
  }, [fieldId, isDirty, setFieldDirty]);

  if (isLoading) return <div className="skeleton h-40 w-full" />;
  if (isLoadError)
    return (
      <div className="alert alert-error alert-soft text-sm">
        {formatApiErrorMessage(loadError)}
      </div>
    );
  if (!term || !semester || !config) return null;

  const sortedBlocks = sortSemesterBlocks(blocks);
  const availablePeriod = firstAvailableBlockPeriod(semester, blocks);
  const splitBlocks = splitSemesterInTwo(semester);

  function handleChange(blockId: string, patch: Partial<SemesterBlock>) {
    setActionError(null);
    setDraft(
      blocks.map((block) =>
        block.id === blockId ? { ...block, ...patch } : block,
      ),
    );
  }

  function handleDelete(blockId: string) {
    const referencingCourses = (config?.courses ?? []).filter((course) =>
      course.blocks?.includes(blockId),
    );
    if (referencingCourses.length > 0) {
      setActionError(
        `Нельзя удалить блок: на него ссылаются курсы ${referencingCourses.map((course) => `«${course.name_ru || course.name}»`).join(", ")}. Сначала измените блоки этих курсов.`,
      );
      return;
    }
    setActionError(null);
    setDraft(blocks.filter((block) => block.id !== blockId));
  }

  function handleSave() {
    if (!term || !semester || validationError || !draft || !isDirty) return;
    const removedIds = (term.blocks ?? [])
      .filter((block) => !draft.some((candidate) => candidate.id === block.id))
      .map((block) => block.id);
    const referencingCourses = (config?.courses ?? []).filter((course) =>
      course.blocks?.some((id) => removedIds.includes(id)),
    );
    if (referencingCourses.length) {
      setActionError(
        `Удалённые блоки используются курсами: ${referencingCourses.map((course) => course.name_ru || course.name).join(", ")}. Восстановите блоки или измените привязки курсов.`,
      );
      return;
    }
    setActionError(null);
    updateTerm(
      {
        body: {
          ...term,
          blocks: sortSemesterBlocks(draft).map((block) => ({
            ...block,
            name: block.name.trim(),
          })),
        },
      },
      {
        onSuccess: () => setDraft(null),
      },
    );
  }

  return (
    <section className="border-base-300 rounded-box flex shrink-0 flex-col gap-3 border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Блоки семестра</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline btn-xs"
            disabled={isPending || !availablePeriod}
            onClick={() => {
              if (!availablePeriod) return;
              setActionError(null);
              setDraft([
                ...blocks,
                {
                  id: crypto.randomUUID(),
                  name: `Блок ${blocks.length + 1}`,
                  ...availablePeriod,
                },
              ]);
            }}
          >
            Добавить блок
          </button>
          <button
            type="button"
            className="btn btn-outline btn-xs"
            disabled={
              isPending || blocks.length > 0 || splitBlocks.length !== 2
            }
            onClick={() => {
              setActionError(null);
              setDraft(splitBlocks);
            }}
          >
            Разделить семестр пополам
          </button>
        </div>
      </div>
      <p className="text-base-content/60 text-xs">
        Порядок определяется датами. Границы включены, блоки не пересекаются.
        Деление пополам доступно для пустого списка; лишний день остаётся в
        первом блоке.
      </p>
      <p className="text-warning text-xs">
        Изменение дат блоков не изменяет периоды серий существующих занятий и их
        фактические даты. Проверьте диапазоны занятий отдельно после сохранения.
      </p>
      {!validationError && sortedBlocks.length > 0 ? (
        <div className="flex flex-col gap-1">
          <div className="bg-base-200 relative h-8 overflow-hidden rounded">
            {sortedBlocks.map((block, index) => {
              const totalDays =
                dateToDay(semester.end_date) -
                dateToDay(semester.start_date) +
                1;
              return (
                <div
                  key={block.id}
                  title={`${block.name}: ${block.start_date} — ${block.end_date}`}
                  className={cn(
                    "border-base-100 absolute inset-y-0 flex items-center justify-center overflow-hidden border-r px-1 text-xs",
                    index % 2 === 0 ? "bg-primary/25" : "bg-secondary/25",
                  )}
                  style={{
                    left: `${((dateToDay(block.start_date) - dateToDay(semester.start_date)) / totalDays) * 100}%`,
                    width: `${((dateToDay(block.end_date) - dateToDay(block.start_date) + 1) / totalDays) * 100}%`,
                  }}
                >
                  <span className="truncate">{block.name}</span>
                </div>
              );
            })}
          </div>
          <div className="text-base-content/60 flex justify-between text-xs">
            <span>{semester.start_date}</span>
            <span>{semester.end_date}</span>
          </div>
        </div>
      ) : null}
      {blocks.length === 0 ? (
        <p className="text-base-content/60 text-sm">
          Блоков нет. Курсы по умолчанию относятся ко всему семестру.
        </p>
      ) : null}
      <fieldset disabled={isPending} className="flex min-w-0 flex-col gap-2">
        {sortedBlocks.map((block, index) => (
          <div
            key={block.id}
            className="border-base-300 rounded-box flex min-w-0 flex-wrap items-end gap-2 border p-2"
          >
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs">
              <span>Блок {index + 1}: название</span>
              <input
                className="input input-bordered input-sm w-full min-w-32"
                value={block.name}
                onChange={(event) =>
                  handleChange(block.id, { name: event.target.value })
                }
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-xs">
              <span>Начало блока {index + 1}</span>
              <input
                type="date"
                className="input input-bordered input-sm w-full [color-scheme:inherit]"
                min={semester.start_date}
                max={semester.end_date}
                value={block.start_date}
                onChange={(event) =>
                  handleChange(block.id, { start_date: event.target.value })
                }
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-xs">
              <span>Окончание блока {index + 1}</span>
              <input
                type="date"
                className="input input-bordered input-sm w-full [color-scheme:inherit]"
                min={semester.start_date}
                max={semester.end_date}
                value={block.end_date}
                onChange={(event) =>
                  handleChange(block.id, { end_date: event.target.value })
                }
              />
            </label>
            <button
              type="button"
              className="btn btn-ghost btn-error btn-sm"
              onClick={() => handleDelete(block.id)}
            >
              Удалить блок {index + 1}
            </button>
          </div>
        ))}
      </fieldset>
      {validationError || actionError ? (
        <p className="text-error text-sm">{actionError || validationError}</p>
      ) : null}
      {isError ? (
        <div className="alert alert-error alert-soft text-sm">
          Ошибка сохранения блоков: {formatApiErrorMessage(error)}
        </div>
      ) : null}
      {blocks.length > 0 && !availablePeriod && !validationError ? (
        <p className="text-base-content/60 text-xs">
          Нет свободных дат для нового блока. Сначала сократите существующий
          блок.
        </p>
      ) : null}
      {draft !== null ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={isPending || !!validationError || !isDirty}
            onClick={handleSave}
          >
            {isPending ? (
              <span className="loading loading-spinner loading-sm" />
            ) : null}
            Сохранить блоки
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={isPending}
            onClick={() => {
              setDraft(null);
              setActionError(null);
              reset();
            }}
          >
            Отменить
          </button>
        </div>
      ) : null}
    </section>
  );
}
