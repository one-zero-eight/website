import {
  autoUpdate,
  flip,
  FloatingNode,
  FloatingPortal,
  FloatingTree,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useFloatingNodeId,
  useFloatingParentNodeId,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import {
  termWeekdayShortLabel,
  type TermWeekdayKey,
} from "@/components/schedule-assistant/settings/weekdays.ts";
import Tooltip from "@/components/common/Tooltip.tsx";
import { cn } from "@/lib/ui/cn";
import { useLingui } from "@lingui/react/macro";
import moment from "moment";
import { useEffect, useState } from "react";
import { DayPicker } from "react-day-picker";
import { enGB, ru } from "react-day-picker/locale";
import "react-day-picker/style.css";

const ISO_WEEKDAY_TO_KEY: TermWeekdayKey[] = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

function weekdayLabelFromIso(iso: string): string | null {
  const raw = String(iso || "")
    .trim()
    .slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const parsed = moment(raw, "YYYY-MM-DD", true);
  if (!parsed.isValid()) return null;
  const key = ISO_WEEKDAY_TO_KEY[parsed.day()];
  return key ? termWeekdayShortLabel(key) : null;
}

const DISPLAY_FORMATS = [
  "DD.MM.YYYY",
  "D.M.YYYY",
  "DD.MM.YY",
  "D.M.YY",
  "DDMMYYYY",
  "DDMMYY",
] as const;

export function formatIsoToDdMmYyyy(iso: string): string {
  const raw = String(iso || "")
    .trim()
    .slice(0, 10);
  if (!raw) return "";
  const parsed = moment(raw, "YYYY-MM-DD", true);
  return parsed.isValid() ? parsed.format("DD.MM.YYYY") : "";
}

/** Parse typed dd.mm.yyyy (and loose variants) to ISO `yyyy-mm-dd`. */
export function parseDdMmYyyyToIso(text: string): string | null {
  const raw = String(text || "").trim();
  if (!raw) return null;
  for (const format of DISPLAY_FORMATS) {
    const parsed = moment(raw, format, true);
    if (parsed.isValid()) return parsed.format("YYYY-MM-DD");
  }
  return null;
}

function isoToLocalDate(iso: string): Date | undefined {
  const raw = String(iso || "")
    .trim()
    .slice(0, 10);
  if (!raw) return undefined;
  const parsed = moment(raw, "YYYY-MM-DD", true);
  return parsed.isValid() ? parsed.toDate() : undefined;
}

function localDateToIso(date: Date): string {
  return moment(date).format("YYYY-MM-DD");
}

type DateInputError = "required" | "invalid" | "out_of_range";

function isIsoInRange(iso: string, min?: string, max?: string): boolean {
  if (min && iso < min.slice(0, 10)) return false;
  if (max && iso > max.slice(0, 10)) return false;
  return true;
}

export function DateInput({
  value,
  onChange,
  className,
  disabled = false,
  placeholder,
  showWeekday = false,
  weekdayOverridden = false,
  min,
  max,
}: {
  /** ISO `yyyy-mm-dd` (or empty). */
  value: string;
  onChange: (iso: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  /** Show derived weekday label inside the input (from a valid ISO date). */
  showWeekday?: boolean;
  weekdayOverridden?: boolean;
  /** Inclusive ISO lower bound. */
  min?: string;
  /** Inclusive ISO upper bound. */
  max?: string;
}) {
  const parentId = useFloatingParentNodeId();

  // Join parent Modal's FloatingTree when nested so Escape closes the
  // calendar before the modal; own a tree when used standalone.
  if (parentId === null) {
    return (
      <FloatingTree>
        <DateInputContent
          value={value}
          onChange={onChange}
          className={className}
          disabled={disabled}
          placeholder={placeholder}
          showWeekday={showWeekday}
          weekdayOverridden={weekdayOverridden}
          min={min}
          max={max}
        />
      </FloatingTree>
    );
  }

  return (
    <DateInputContent
      value={value}
      onChange={onChange}
      className={className}
      disabled={disabled}
      placeholder={placeholder}
      showWeekday={showWeekday}
      weekdayOverridden={weekdayOverridden}
      min={min}
      max={max}
    />
  );
}

function DateInputContent({
  value,
  onChange,
  className,
  disabled = false,
  placeholder,
  showWeekday = false,
  weekdayOverridden = false,
  min,
  max,
}: {
  value: string;
  onChange: (iso: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  showWeekday?: boolean;
  weekdayOverridden?: boolean;
  min?: string;
  max?: string;
}) {
  const { t, i18n } = useLingui();
  const nodeId = useFloatingNodeId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<DateInputError | null>(null);
  const [month, setMonth] = useState<Date>(
    () => isoToLocalDate(value) ?? new Date(),
  );

  const display = draft ?? formatIsoToDdMmYyyy(value);
  const selected = isoToLocalDate(value);
  const weekdayLabel = showWeekday
    ? weekdayLabelFromIso(
        draft != null ? (parseDdMmYyyyToIso(draft) ?? "") : value,
      )
    : null;
  const minDate = isoToLocalDate(min ?? "");
  const errorMessage =
    error === "required"
      ? t`Enter a date`
      : error === "invalid"
        ? t`Invalid date`
        : error === "out_of_range"
          ? t`Date is outside the allowed period`
          : "";
  const maxDate = isoToLocalDate(max ?? "");

  useEffect(() => {
    setDraft(null);
    setError(null);
    const next = isoToLocalDate(value);
    if (next) setMonth(next);
  }, [value]);

  const { refs, floatingStyles, context } = useFloating({
    nodeId,
    open,
    onOpenChange: setOpen,
    placement: "bottom-start",
    middleware: [offset(4), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context);
  // capture: true — parent Modal also uses capture + stopPropagation when
  // bubbles is false; without capture here Escape never reaches the calendar.
  const dismiss = useDismiss(context, { bubbles: false, capture: true });
  const role = useRole(context, { role: "dialog" });
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  function commitText(raw: string): boolean {
    const trimmed = raw.trim();
    if (!trimmed) {
      setDraft("");
      setError("required");
      return false;
    }
    const iso = parseDdMmYyyyToIso(trimmed);
    if (!iso) {
      setDraft(trimmed);
      setError("invalid");
      return false;
    }
    if (!isIsoInRange(iso, min, max)) {
      setDraft(trimmed);
      setError("out_of_range");
      return false;
    }
    setDraft(null);
    setError(null);
    if (iso !== value) onChange(iso);
    else setDraft(null);
    const next = isoToLocalDate(iso);
    if (next) setMonth(next);
    return true;
  }

  function handleSelect(date: Date | undefined) {
    if (!date) return;
    const iso = localDateToIso(date);
    if (!isIsoInRange(iso, min, max)) return;
    setDraft(null);
    setError(null);
    setMonth(date);
    setOpen(false);
    if (iso !== value) onChange(iso);
  }

  return (
    <FloatingNode id={nodeId}>
      <div className={cn("flex w-full min-w-0 flex-col gap-1", className)}>
        <div className="relative w-full min-w-0">
          <input
            type="text"
            inputMode="numeric"
            disabled={disabled}
            placeholder={placeholder ?? t`dd.mm.yyyy`}
            className={cn(
              "input input-bordered input-xs h-8 min-h-8 w-full text-sm",
              showWeekday ? "pr-16" : "pr-9",
              error && "input-error",
            )}
            value={display}
            onChange={(event) => {
              setDraft(event.target.value);
              if (error) setError(null);
            }}
            onBlur={() => commitText(display)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              if (commitText(display)) event.currentTarget.blur();
              else event.currentTarget.select();
            }}
          />
          {weekdayLabel ? (
            weekdayOverridden ? (
              <Tooltip
                content={t`Weekday differs from the template`}
                className="absolute top-1/2 right-8 -translate-y-1/2"
              >
                <span className="text-base-content/55 cursor-help text-xs font-medium underline decoration-sky-400 decoration-wavy decoration-1 underline-offset-2">
                  {weekdayLabel}
                </span>
              </Tooltip>
            ) : (
              <span className="text-base-content/55 pointer-events-none absolute top-1/2 right-8 -translate-y-1/2 text-xs font-medium">
                {weekdayLabel}
              </span>
            )
          ) : null}
          <button
            type="button"
            disabled={disabled}
            className="btn btn-ghost btn-xs btn-square absolute top-1/2 right-0.5 h-7 min-h-7 w-7 -translate-y-1/2"
            title={t`Calendar`}
            ref={refs.setReference}
            {...getReferenceProps()}
          >
            <span className="icon-[material-symbols--calendar-month-outline-rounded] text-base" />
          </button>
        </div>
        {errorMessage ? (
          <div className="text-error text-xs">{errorMessage}</div>
        ) : null}
        {open ? (
          <FloatingPortal>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
              className="border-base-300 bg-base-100 rounded-box z-50 border p-2 shadow-lg"
            >
              <DayPicker
                mode="single"
                locale={i18n.locale === "ru" ? ru : enGB}
                month={month}
                onMonthChange={setMonth}
                selected={selected}
                onSelect={handleSelect}
                defaultMonth={selected ?? month}
                disabled={[
                  ...(minDate ? [{ before: minDate }] : []),
                  ...(maxDate ? [{ after: maxDate }] : []),
                ]}
              />
            </div>
          </FloatingPortal>
        ) : null}
      </div>
    </FloatingNode>
  );
}
