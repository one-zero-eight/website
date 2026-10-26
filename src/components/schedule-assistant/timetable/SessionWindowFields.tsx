import type {
  SchemaComponentSessionSeries,
  SchemaScheduleConfig,
} from "@/api/schedule-assistant/types.ts";
import { useEffect, useState } from "react";
import { cn } from "@/lib/ui/cn";
import { sortSemesterBlocks } from "@/components/schedule-assistant/settings/semester/semesterBlocks.ts";
import { resolveSessionWindow } from "./sessionWindows.ts";

type SessionActive = SchemaComponentSessionSeries["active"];
type DateRange = NonNullable<SessionActive>;

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

/** Dates are inclusive; invalid custom drafts must block the owner's save action. */
export function SessionWindowFields({
  config,
  audience,
  active,
  onChange,
  disabled,
  onValidityChange,
  occurrenceCount,
}: {
  config: SchemaScheduleConfig;
  audience: string[];
  active: SessionActive;
  onChange: (active: DateRange | null) => void;
  disabled?: boolean;
  onValidityChange?: (valid: boolean) => void;
  occurrenceCount?: number;
}) {
  const blocks = sortSemesterBlocks(config.term.blocks ?? []);
  const semester = config.term.semester;
  const matchingBlock = active
    ? blocks.findIndex(
        (block) =>
          block.start_date === active.start_date &&
          block.end_date === active.end_date,
      )
    : -1;
  const matchesSemester =
    active?.start_date === semester.start_date &&
    active?.end_date === semester.end_date;
  const [forceCustom, setForceCustom] = useState(false);
  const [draft, setDraft] = useState<DateRange | null>(null);
  const custom =
    forceCustom || (active != null && matchingBlock < 0 && !matchesSemester);
  const range = draft ?? active ?? semester;
  const dateError = custom
    ? !isCalendarDate(range.start_date) || !isCalendarDate(range.end_date)
      ? "Укажите корректные даты начала и окончания."
      : range.start_date > range.end_date
        ? "Начало периода должно быть не позже окончания."
        : null
    : null;
  const selectedActive = custom ? range : active;
  const resolved = dateError
    ? null
    : resolveSessionWindow(config, audience, selectedActive);
  const error =
    dateError ??
    (!resolved
      ? "Период серии не пересекается с учебным периодом выбранных групп."
      : null);
  const valid = error == null;

  useEffect(() => {
    setDraft(null);
  }, [active?.start_date, active?.end_date]);

  useEffect(() => {
    onValidityChange?.(valid);
  }, [onValidityChange, valid]);

  function handleCustomChange(next: DateRange) {
    setDraft(next);
    if (
      !isCalendarDate(next.start_date) ||
      !isCalendarDate(next.end_date) ||
      next.start_date > next.end_date
    )
      return;
    onChange({ start_date: next.start_date, end_date: next.end_date });
  }

  const dayCount = resolved
    ? Math.round(
        (Date.parse(`${resolved.end_date}T00:00:00Z`) -
          Date.parse(`${resolved.start_date}T00:00:00Z`)) /
          86_400_000,
      ) + 1
    : 0;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label className="flex min-w-0 flex-col gap-1 text-sm">
        <span className="font-medium">Период серии</span>
        <select
          className="select select-bordered select-sm w-full"
          value={
            custom
              ? "custom"
              : matchingBlock >= 0
                ? `block:${matchingBlock}`
                : matchesSemester
                  ? "semester"
                  : "audience"
          }
          disabled={disabled}
          onChange={(event) => {
            const value = event.target.value;
            setDraft(null);
            setForceCustom(value === "custom");
            if (value === "audience") {
              onChange(null);
              return;
            }
            if (value === "semester") {
              onChange({ ...semester });
              return;
            }
            if (value === "custom") {
              const next = active ?? resolved ?? semester;
              setDraft({
                start_date: next.start_date,
                end_date: next.end_date,
              });
              onChange({
                start_date: next.start_date,
                end_date: next.end_date,
              });
              return;
            }
            const block = blocks[Number(value.slice("block:".length))];
            if (block)
              onChange({
                start_date: block.start_date,
                end_date: block.end_date,
              });
          }}
        >
          <option value="audience">
            По учебному периоду групп (без ограничения)
          </option>
          <option value="semester">Весь семестр</option>
          {blocks.map((block, index) => (
            <option key={block.id} value={`block:${index}`}>
              Блок {index + 1}: {block.name}
            </option>
          ))}
          <option value="custom">Свой период</option>
        </select>
      </label>
      {custom ? (
        <div className="flex flex-wrap gap-2">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs">
            Начало (включительно)
            <input
              type="date"
              className={cn(
                "input input-bordered input-sm w-full",
                error && "input-error",
              )}
              value={range.start_date}
              disabled={disabled}
              onChange={(event) =>
                handleCustomChange({ ...range, start_date: event.target.value })
              }
            />
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs">
            Окончание (включительно)
            <input
              type="date"
              className={cn(
                "input input-bordered input-sm w-full",
                error && "input-error",
              )}
              value={range.end_date}
              disabled={disabled}
              onChange={(event) =>
                handleCustomChange({ ...range, end_date: event.target.value })
              }
            />
          </label>
        </div>
      ) : null}
      <p className="text-base-content/70 text-xs">
        Выбранные границы:{" "}
        {selectedActive
          ? `${selectedActive.start_date || "не указано"} — ${selectedActive.end_date || "не указано"} (включительно)`
          : "без дополнительного ограничения; используются учебные периоды групп"}
        .
      </p>
      <p className="text-base-content/70 text-xs">
        Фактический период с учётом выбранных групп:{" "}
        {resolved
          ? `${resolved.start_date} — ${resolved.end_date} (включительно; дней: ${dayCount}${occurrenceCount != null ? `; занятий: ${occurrenceCount}` : ""})`
          : "нет дат"}
        .
      </p>
      {error ? <p className="text-error text-xs">{error}</p> : null}
    </div>
  );
}
