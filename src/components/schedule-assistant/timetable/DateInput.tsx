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
import { cn } from "@/lib/ui/cn";
import moment from "moment";
import { useEffect, useState } from "react";
import { DayPicker } from "react-day-picker";
import { ru } from "react-day-picker/locale";
import "react-day-picker/style.css";

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

export function DateInput({
  value,
  onChange,
  className,
  disabled = false,
  placeholder = "дд.мм.гггг",
}: {
  /** ISO `yyyy-mm-dd` (or empty). */
  value: string;
  onChange: (iso: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
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
    />
  );
}

function DateInputContent({
  value,
  onChange,
  className,
  disabled = false,
  placeholder = "дд.мм.гггг",
}: {
  value: string;
  onChange: (iso: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  const nodeId = useFloatingNodeId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [month, setMonth] = useState<Date>(
    () => isoToLocalDate(value) ?? new Date(),
  );

  const display = draft ?? formatIsoToDdMmYyyy(value);
  const selected = isoToLocalDate(value);

  useEffect(() => {
    setDraft(null);
    setError("");
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
      setError("Укажите дату");
      return false;
    }
    const iso = parseDdMmYyyyToIso(trimmed);
    if (!iso) {
      setDraft(trimmed);
      setError("Некорректная дата");
      return false;
    }
    setDraft(null);
    setError("");
    if (iso !== value) onChange(iso);
    else setDraft(null);
    const next = isoToLocalDate(iso);
    if (next) setMonth(next);
    return true;
  }

  function handleSelect(date: Date | undefined) {
    if (!date) return;
    const iso = localDateToIso(date);
    setDraft(null);
    setError("");
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
            placeholder={placeholder}
            className={cn(
              "input input-bordered input-xs h-8 min-h-8 w-full pr-9 text-sm",
              error && "input-error",
            )}
            value={display}
            onChange={(event) => {
              setDraft(event.target.value);
              if (error) setError("");
            }}
            onBlur={() => commitText(display)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              if (commitText(display)) event.currentTarget.blur();
              else event.currentTarget.select();
            }}
          />
          <button
            type="button"
            disabled={disabled}
            className="btn btn-ghost btn-xs btn-square absolute top-1/2 right-0.5 h-7 min-h-7 w-7 -translate-y-1/2"
            title="Календарь"
            ref={refs.setReference}
            {...getReferenceProps()}
          >
            <span className="icon-[material-symbols--calendar-month-outline-rounded] text-base" />
          </button>
        </div>
        {error ? <div className="text-error text-xs">{error}</div> : null}
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
                locale={ru}
                month={month}
                onMonthChange={setMonth}
                selected={selected}
                onSelect={handleSelect}
                defaultMonth={selected ?? month}
              />
            </div>
          </FloatingPortal>
        ) : null}
      </div>
    </FloatingNode>
  );
}
