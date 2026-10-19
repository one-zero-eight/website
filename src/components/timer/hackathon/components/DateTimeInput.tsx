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
import { useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { toInputValue } from "../utils";

type DateTimeInputProps = {
  /** Local date and time in `datetime-local` format: YYYY-MM-DDTHH:mm */
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function DateTimeInput(props: DateTimeInputProps) {
  const parentId = useFloatingParentNodeId();

  // Join the parent Modal's FloatingTree so Escape closes the calendar first
  if (parentId === null) {
    return (
      <FloatingTree>
        <DateTimeInputContent {...props} />
      </FloatingTree>
    );
  }

  return <DateTimeInputContent {...props} />;
}

function DateTimeInputContent({
  value,
  onChange,
  className,
}: DateTimeInputProps) {
  const nodeId = useFloatingNodeId();
  const [isOpen, setIsOpen] = useState(false);
  const date = new Date(value);
  const [month, setMonth] = useState(date);

  const { refs, floatingStyles, context } = useFloating({
    nodeId,
    open: isOpen,
    onOpenChange: (open) => {
      if (open) setMonth(date);
      setIsOpen(open);
    },
    placement: "bottom-start",
    middleware: [offset(4), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });
  const click = useClick(context);
  const dismiss = useDismiss(context, { bubbles: false, capture: true });
  const role = useRole(context, { role: "dialog" });
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  function changeValue(changes: {
    day?: Date;
    hours?: number;
    minutes?: number;
  }) {
    const day = changes.day ?? date;
    onChange(
      toInputValue(
        new Date(
          day.getFullYear(),
          day.getMonth(),
          day.getDate(),
          changes.hours ?? date.getHours(),
          changes.minutes ?? date.getMinutes(),
        ),
      ),
    );
  }

  return (
    <FloatingNode id={nodeId}>
      <button
        type="button"
        className={cn("input w-full justify-between text-left", className)}
        ref={refs.setReference}
        {...getReferenceProps()}
      >
        {date.toLocaleString([], {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
        <span className="icon-[material-symbols--calendar-month-outline-rounded] text-xl" />
      </button>
      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="border-base-300 bg-base-100 rounded-box z-50 flex flex-col items-center gap-2 border p-2 shadow-lg"
          >
            <DayPicker
              mode="single"
              weekStartsOn={1}
              className="[&_.rdp-selected_.rdp-day_button]:bg-primary! [&_.rdp-selected_.rdp-day_button]:text-primary-content!"
              style={
                {
                  "--rdp-accent-color": "var(--color-primary)",
                  "--rdp-accent-background-color":
                    "color-mix(in oklab, var(--color-primary) 20%, transparent)",
                } as React.CSSProperties
              }
              month={month}
              onMonthChange={setMonth}
              selected={date}
              onSelect={(day) => day && changeValue({ day })}
            />
            <div className="flex items-center gap-2 pb-2">
              <TimePartInput
                value={date.getHours()}
                max={23}
                onChange={(hours) => changeValue({ hours })}
              />
              <span className="text-xl font-bold">:</span>
              <TimePartInput
                value={date.getMinutes()}
                max={59}
                onChange={(minutes) => changeValue({ minutes })}
              />
            </div>
          </div>
        </FloatingPortal>
      )}
    </FloatingNode>
  );
}

function TimePartInput({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  function handleChange(text: string) {
    const digits = text.replace(/\D/g, "").slice(0, 2);
    setDraft(digits);
    if (digits) onChange(Math.min(Number(digits), max));
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      className="input w-16 text-center text-xl"
      value={draft ?? String(value).padStart(2, "0")}
      onChange={(e) => handleChange(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={() => setDraft(null)}
    />
  );
}
