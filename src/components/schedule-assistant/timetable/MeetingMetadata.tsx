import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

export const meetingMetadataGridClass =
  "grid min-w-0 grid-cols-[min-content_minmax(0,1fr)] gap-x-2.5";
export const meetingMetadataSubgridClass =
  "col-span-2 grid min-w-0 grid-cols-subgrid";
export const meetingMetadataCardClass = "px-2 py-1";
export const meetingMetadataTextClass = "text-sm leading-5";
export const meetingMetadataOverrideClass =
  "underline decoration-sky-400 decoration-wavy decoration-1 underline-offset-2";

export function MeetingMetadataRow({
  left,
  right,
}: {
  left?: ReactNode;
  right?: ReactNode;
}) {
  const rowRef = useRef<HTMLSpanElement>(null);
  const leftRef = useRef<HTMLSpanElement>(null);
  const rightRef = useRef<HTMLSpanElement>(null);
  const [rightShift, setRightShift] = useState(0);

  useLayoutEffect(() => {
    const row = rowRef.current;
    const leftCell = leftRef.current;
    const rightCell = rightRef.current;
    if (!row || !leftCell || !rightCell) {
      setRightShift(0);
      return;
    }

    // Measure intrinsic content without changing the shared grid tracks.
    function measureContent(
      cell: HTMLElement,
      width: "min-content" | "max-content",
    ) {
      const container = document.createElement("span");
      container.inert = true;
      Object.assign(container.style, {
        position: "fixed",
        display: "block",
        visibility: "hidden",
        pointerEvents: "none",
        left: "0",
        top: "0",
        width,
      });
      const copy = cell.cloneNode(true) as HTMLElement;
      copy.removeAttribute("id");
      Object.assign(copy.style, {
        display: "block",
        width,
        minWidth: "0",
        maxWidth: "none",
        marginLeft: "0",
      });
      if (cell === leftCell && copy.firstElementChild instanceof HTMLElement) {
        copy.firstElementChild.style.width = "auto";
      }
      container.append(copy);
      row!.append(container);
      const measuredWidth = copy.getBoundingClientRect().width;
      container.remove();
      return measuredWidth;
    }

    function updateShift() {
      const leftWidth = leftCell!.getBoundingClientRect().width;
      // Subgrid reports its inherited gap as `normal`; use the actual cell
      // width and remove the extra space provided by the current shift.
      const availableRightWidth =
        rightCell!.getBoundingClientRect().width +
        parseFloat(getComputedStyle(rightCell!).marginLeft);
      const desiredRightWidth = Math.ceil(
        measureContent(rightCell!, "max-content"),
      );
      const minimumLeftWidth = Math.ceil(
        measureContent(leftCell!, "min-content"),
      );
      const preferredLeftWidth = Math.ceil(
        measureContent(leftCell!, "max-content"),
      );
      const isLocation =
        rightCell!.querySelector('[data-meeting-field="room"]') !== null;
      const shift = isLocation
        ? Math.max(0, leftWidth - preferredLeftWidth)
        : Math.min(
            Math.max(0, desiredRightWidth - availableRightWidth),
            Math.max(0, leftWidth - minimumLeftWidth),
          );
      setRightShift((previous) =>
        Math.abs(previous - shift) < 0.5 ? previous : shift,
      );
    }

    updateShift();
    const observer = new ResizeObserver(updateShift);
    observer.observe(row);
    observer.observe(leftCell);
    let disposed = false;
    void document.fonts.ready.then(() => {
      if (!disposed) updateShift();
    });
    return () => {
      disposed = true;
      observer.disconnect();
    };
  }, [left, right]);

  return (
    <span
      ref={rowRef}
      className={cn(
        meetingMetadataSubgridClass,
        meetingMetadataTextClass,
        "items-start gap-y-0.5",
      )}
    >
      {left != null ? (
        <span ref={leftRef} className="col-start-1 min-w-min">
          <span
            className="block"
            style={{ width: `calc(100% - ${rightShift}px)` }}
          >
            {left}
          </span>
        </span>
      ) : null}
      {right != null ? (
        <span
          ref={rightRef}
          className="col-start-2 min-w-0"
          style={{ marginLeft: -rightShift }}
        >
          {right}
        </span>
      ) : null}
    </span>
  );
}

export function MeetingMetadataField({
  kind,
  children,
  weekly = false,
  overridden = false,
  iconTooltip,
  title,
  showIcon = true,
}: {
  kind: "schedule" | "room" | "audience" | "instructor";
  children: ReactNode;
  weekly?: boolean;
  overridden?: boolean;
  iconTooltip?: (icon: ReactNode) => ReactNode;
  title?: string;
  showIcon?: boolean;
}) {
  const isSchedule = kind === "schedule";
  const iconClass = {
    schedule: weekly
      ? "icon-[lucide--repeat-2]"
      : "icon-[material-symbols--calendar-month-outline-rounded]",
    room: "icon-[material-symbols--location-on-outline-rounded]",
    audience: "icon-[material-symbols--groups-outline-rounded]",
    instructor: "icon-[tabler--user-star]",
  }[kind];
  const icon = (
    <span
      className={cn(
        iconClass,
        "mt-0.5 shrink-0 text-base",
        !isSchedule && "text-base-content/45",
      )}
    />
  );

  return (
    <span
      title={title}
      data-meeting-field={kind}
      className={cn(
        meetingMetadataTextClass,
        "text-base-content/80 flex items-start gap-1.5",
        isSchedule ? "min-w-max whitespace-nowrap" : "max-w-full min-w-0",
      )}
    >
      {showIcon ? (iconTooltip ? iconTooltip(icon) : icon) : null}
      <span
        className={cn(
          "min-w-0",
          isSchedule ? "font-medium tabular-nums" : "wrap-break-word",
          overridden && meetingMetadataOverrideClass,
        )}
      >
        {children}
      </span>
    </span>
  );
}

export function MeetingMetadataLabels({ labels }: { labels: string[] }) {
  return (
    <span className="flex min-w-0 flex-wrap gap-x-2">
      {labels.map((label, index) => (
        <span key={`${index}:${label}`} className="whitespace-nowrap">
          {label}
        </span>
      ))}
    </span>
  );
}
