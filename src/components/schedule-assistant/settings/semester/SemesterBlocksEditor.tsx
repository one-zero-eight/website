import { useEffect, useId, useState } from "react";
import { useLingui } from "@lingui/react/macro";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { DateInput } from "@/components/schedule-assistant/DateInput.tsx";
import {
  useConfig,
  useUpdateTermMutation,
} from "@/components/schedule-assistant/config/useConfig.tsx";
import { useSettingsSaveStatusContext } from "@/components/schedule-assistant/settings/settingsSaveStatus.tsx";
import {
  firstAvailableBlockPeriod,
  sortSemesterBlocks,
  validateSemesterBlocks,
  type SemesterBlock,
  type SemesterPeriod,
} from "./semesterBlocks.ts";

function defaultNewBlockPeriod(
  semester: SemesterPeriod,
  blocks: readonly SemesterBlock[],
): SemesterPeriod {
  return (
    firstAvailableBlockPeriod(semester, blocks) ?? {
      start_date: semester.start_date,
      end_date: semester.start_date,
    }
  );
}

export function SemesterBlocksEditor() {
  const { t } = useLingui();
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

  function handleChange(blockId: string, patch: Partial<SemesterBlock>) {
    setActionError(null);
    setDraft(
      blocks.map((block) =>
        block.id === blockId ? { ...block, ...patch } : block,
      ),
    );
  }

  function referencedSeries(blockIds: string[]) {
    return (config?.courses ?? [])
      .flatMap((course) =>
        course.components.flatMap((component) =>
          (component.sessions ?? []).flatMap((series, index) =>
            series.block_id != null && blockIds.includes(series.block_id)
              ? [
                  `${course.name_ru || course.name} · ${component.tag} · ${index + 1}`,
                ]
              : [],
          ),
        ),
      )
      .join(", ");
  }

  function handleDelete(blockId: string) {
    const references = referencedSeries([blockId]);
    if (references) {
      setActionError(
        t`Cannot delete a block referenced by series: ${references}. Change their windows first.`,
      );
      return;
    }
    setActionError(null);
    setDraft(blocks.filter((block) => block.id !== blockId));
  }

  function handleAddBlock() {
    if (!semester) return;
    setActionError(null);
    setDraft([
      ...blocks,
      {
        id: crypto.randomUUID(),
        name: `Блок ${blocks.length + 1}`,
        ...defaultNewBlockPeriod(semester, blocks),
      },
    ]);
  }

  function handleSave() {
    if (!term || !semester || validationError || !draft || !isDirty) return;
    const removedIds = (term.blocks ?? [])
      .filter((block) => !draft.some((candidate) => candidate.id === block.id))
      .map((block) => block.id);
    const references = referencedSeries(removedIds);
    if (references) {
      setActionError(
        t`Cannot delete a block referenced by series: ${references}. Change their windows first.`,
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
      <h3 className="text-sm font-semibold">Блоки семестра</h3>
      {blocks.length === 0 ? (
        <p className="text-base-content/60 text-sm">
          Блоков нет. Курсы по умолчанию относятся ко всему семестру.
        </p>
      ) : null}
      <fieldset disabled={isPending} className="flex min-w-0 flex-col gap-2">
        {sortedBlocks.map((block) => (
          <div
            key={block.id}
            className="border-base-300 rounded-box flex min-w-0 flex-nowrap items-end gap-2 border p-2"
          >
            <label className="flex min-w-0 flex-[1.2] flex-col gap-1 text-xs">
              <span>Название</span>
              <input
                className="input input-bordered input-sm w-full"
                value={block.name}
                onChange={(event) =>
                  handleChange(block.id, { name: event.target.value })
                }
              />
            </label>
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs">
              <span>Начало</span>
              <DateInput
                showWeekday
                value={block.start_date}
                min={semester.start_date}
                max={semester.end_date}
                onChange={(start_date) =>
                  handleChange(block.id, { start_date })
                }
              />
            </label>
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs">
              <span>Окончание</span>
              <DateInput
                showWeekday
                value={block.end_date}
                min={semester.start_date}
                max={semester.end_date}
                onChange={(end_date) => handleChange(block.id, { end_date })}
              />
            </label>
            <button
              type="button"
              className="btn btn-ghost btn-error btn-sm shrink-0"
              onClick={() => handleDelete(block.id)}
            >
              Удалить
            </button>
          </div>
        ))}
      </fieldset>
      <button
        type="button"
        className="btn btn-outline btn-sm self-start"
        disabled={isPending}
        onClick={handleAddBlock}
      >
        Добавить блок
      </button>
      {validationError || actionError ? (
        <p className="text-error text-sm">{actionError || validationError}</p>
      ) : null}
      {isError ? (
        <div className="alert alert-error alert-soft text-sm">
          Ошибка сохранения блоков: {formatApiErrorMessage(error)}
        </div>
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
