import type {
  SchemaComponent,
  SchemaScheduleConfig,
} from "@/api/schedule-assistant/types.ts";
import {
  AudienceTreeInfoIcon,
  GroupHierarchyInfoIcon,
} from "@/components/schedule-assistant/settings/courses/audienceTreeTooltip.tsx";
import { expandStudentGroupSelectors } from "@/components/schedule-assistant/config/studentGroupSelectors.ts";
import { listAudienceInlineItems } from "@/components/schedule-assistant/timetable/meetingAudienceSummary.ts";
import {
  countComponentPlacement,
  formatComponentPlaced,
  formatComponentTarget,
  formatInstructorPoolEntries,
  shouldShowInstructorPool,
  type ComponentSeriesDisplayItem,
  type ComponentSeriesTooltipItem,
} from "@/components/schedule-assistant/timetable/meetingComponentContext.ts";
import {
  formatDisplayDate,
  resolveInstructorLabel,
} from "@/components/schedule-assistant/timetable/timetableViewerModel.ts";
import type { Meeting } from "@/components/schedule-assistant/timetable/timetableViewerModel.ts";
import { cn } from "@/lib/ui/cn";
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  safePolygon,
  shift,
  useFloating,
  useHover,
  useInteractions,
  useTransitionStyles,
} from "@floating-ui/react";
import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

export function DetailSection({ title }: { title: string }) {
  return (
    <div className="text-base-content/55 mt-3 mb-1.5 text-xs font-semibold tracking-wide uppercase first:mt-0">
      {title}
    </div>
  );
}

export function DetailField({
  label,
  children,
  compact,
  truncate,
  fullWidth,
}: {
  label: string;
  children: ReactNode;
  compact?: boolean;
  truncate?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={cn(
        "border-base-300/70 text-base-content flex border-b text-sm leading-snug last:border-b-0",
        compact ? "py-1" : "py-1.5",
        fullWidth
          ? "flex-col items-stretch gap-1"
          : cn("items-center gap-x-1.5", !truncate && "flex-wrap"),
      )}
    >
      <span className="text-base-content/55 shrink-0">{label}</span>
      <span
        className={cn(
          "min-w-0",
          fullWidth && "w-full",
          truncate ? "flex-1 truncate" : "[overflow-wrap:anywhere]",
        )}
        title={truncate && typeof children === "string" ? children : undefined}
      >
        {children}
      </span>
    </div>
  );
}

export function MeetingAudienceInline({
  config,
  groupIds,
}: {
  config: SchemaScheduleConfig;
  groupIds: string[];
}) {
  const items = listAudienceInlineItems(config, groupIds);

  if (!items.length) {
    return <span className="text-base-content/50">—</span>;
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
      {items.map((item, index) => (
        <span
          key={item.key}
          className="inline-flex max-w-full items-center gap-0.5 leading-none"
        >
          {index > 0 ? (
            <span className="text-base-content/35 leading-none" aria-hidden>
              ·
            </span>
          ) : null}
          <span className="min-w-0 leading-snug [overflow-wrap:anywhere]">
            {item.label}
          </span>
          {item.selector ? (
            <AudienceTreeInfoIcon
              config={config}
              selector={item.selector}
              mode={item.mode}
            />
          ) : (
            <GroupHierarchyInfoIcon config={config} groupIds={item.groupIds} />
          )}
        </span>
      ))}
    </span>
  );
}

function SeriesSchedulePrimaryLine({
  item,
}: {
  item: ComponentSeriesTooltipItem;
}) {
  if (item.primaryDate || item.primaryWeekday || item.primaryTime) {
    return (
      <span className="inline-grid grid-cols-[auto_3.5rem_auto] items-baseline gap-x-0.5">
        <span className="whitespace-nowrap tabular-nums">
          {item.primaryDate}
          {item.primaryWeekday ? "," : ""}
        </span>
        <span className="overflow-hidden whitespace-nowrap">
          {item.primaryWeekday}
        </span>
        <span className="whitespace-nowrap tabular-nums">
          {item.primaryTime}
        </span>
      </span>
    );
  }

  return <span className="block wrap-anywhere">{item.primary}</span>;
}

export function SeriesScheduleItemsList({
  items,
  onNavigateToMeeting,
  className,
}: {
  items: ComponentSeriesTooltipItem[];
  onNavigateToMeeting?: (meeting: Meeting) => void;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLElement | null>(null);
  const [currentOffscreen, setCurrentOffscreen] = useState<
    "above" | "below" | null
  >(null);

  const currentIndex = items.findIndex((item) => item.isCurrent);

  function updateCurrentVisibility() {
    const root = scrollRef.current;
    const current = currentRef.current;
    if (!root || !current) {
      setCurrentOffscreen(null);
      return;
    }
    const rootRect = root.getBoundingClientRect();
    const itemRect = current.getBoundingClientRect();
    if (itemRect.bottom < rootRect.top + 2) {
      setCurrentOffscreen("above");
      return;
    }
    if (itemRect.top > rootRect.bottom - 2) {
      setCurrentOffscreen("below");
      return;
    }
    setCurrentOffscreen(null);
  }

  function scrollToCurrent() {
    currentRef.current?.scrollIntoView({ block: "nearest" });
    requestAnimationFrame(updateCurrentVisibility);
  }

  useLayoutEffect(() => {
    if (currentIndex < 0) {
      setCurrentOffscreen(null);
      return;
    }
    currentRef.current?.scrollIntoView({ block: "nearest" });
    updateCurrentVisibility();
  }, [currentIndex, items]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const onScrollOrResize = () => updateCurrentVisibility();
    root.addEventListener("scroll", onScrollOrResize, { passive: true });
    const observer = new ResizeObserver(onScrollOrResize);
    observer.observe(root);
    return () => {
      root.removeEventListener("scroll", onScrollOrResize);
      observer.disconnect();
    };
  }, [items, currentIndex]);

  if (!items.length) return null;

  return (
    <div className={cn("relative w-full", className)}>
      <div
        ref={scrollRef}
        className="flex max-h-72 w-full [scrollbar-width:thin] flex-col gap-0.5 overflow-y-auto"
      >
        {items.map((item, index) => {
          const canNavigate = Boolean(item.meeting && onNavigateToMeeting);
          const rowClass = cn(
            "w-full rounded px-1.5 py-1 text-left text-xs leading-snug font-normal transition-colors",
            item.isCurrent
              ? "bg-primary/10 text-base-content"
              : "text-base-content/70",
            canNavigate &&
              !item.isCurrent &&
              "hover:bg-base-200/60 hover:text-base-content",
            canNavigate && "cursor-pointer",
          );
          const body = (
            <>
              <SeriesSchedulePrimaryLine item={item} />
              {item.secondary ? (
                <span
                  className={cn(
                    "mt-0.5 block wrap-anywhere",
                    item.isCurrent
                      ? "text-base-content/55"
                      : "text-base-content/45",
                  )}
                >
                  {item.secondary}
                </span>
              ) : null}
            </>
          );
          const setRowRef = (node: HTMLElement | null) => {
            if (item.isCurrent) currentRef.current = node;
          };

          if (canNavigate) {
            return (
              <button
                key={`${index}-${item.primary}-${item.meeting!.instance_id}`}
                ref={setRowRef}
                type="button"
                className={rowClass}
                title={`Перейти к ${item.meeting!.date ? formatDisplayDate(item.meeting!.date) : item.primary}`}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onNavigateToMeeting?.(item.meeting!);
                }}
                onMouseDown={(event) => {
                  event.stopPropagation();
                }}
              >
                {body}
              </button>
            );
          }

          return (
            <div
              key={`${index}-${item.primary}`}
              ref={setRowRef}
              className={rowClass}
            >
              {body}
            </div>
          );
        })}
      </div>
      {currentOffscreen === "above" ? (
        <button
          type="button"
          className="bg-primary/45 pointer-events-auto absolute top-0 right-3 z-10 size-5 cursor-pointer rounded-bl-full border-0 p-0"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            scrollToCurrent();
          }}
          onMouseDown={(event) => event.stopPropagation()}
          title="К выбранному выше"
        />
      ) : null}
      {currentOffscreen === "below" ? (
        <button
          type="button"
          className="bg-primary/45 pointer-events-auto absolute right-3 bottom-0 z-10 size-5 cursor-pointer rounded-tl-full border-0 p-0"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            scrollToCurrent();
          }}
          onMouseDown={(event) => event.stopPropagation()}
          title="К выбранному ниже"
        />
      ) : null}
    </div>
  );
}

export function ComponentSeriesList({
  items,
  onNavigateToMeeting,
  compact,
}: {
  items: ComponentSeriesDisplayItem[];
  onNavigateToMeeting?: (meeting: Meeting) => void;
  compact?: boolean;
}) {
  if (!items.length) return null;

  return (
    <div
      className={cn(
        "border-base-300/70 border-b last:border-b-0",
        compact ? "py-1" : "py-1.5",
      )}
    >
      <div
        className={cn(
          "text-base-content/55 text-sm",
          compact ? "mb-1" : "mb-1.5",
        )}
      >
        Серии
      </div>
      <div className={cn("flex flex-col", compact ? "gap-0.5" : "gap-1")}>
        {items.map((item) => {
          const secondary = item.secondary ? (
            <SeriesSecondaryLabel
              text={item.secondary}
              tooltipItems={item.secondaryTooltipItems}
              onNavigateToMeeting={onNavigateToMeeting}
            />
          ) : null;

          const body = (
            <>
              <div className="text-sm font-medium wrap-anywhere">
                {item.label}
              </div>
              {secondary}
            </>
          );

          if (item.meeting && onNavigateToMeeting) {
            return (
              <button
                key={item.seriesIdx}
                type="button"
                onClick={() => onNavigateToMeeting(item.meeting!)}
                className={cn(
                  "rounded-box cursor-pointer border text-left transition-colors",
                  compact ? "px-2 py-1" : "px-2.5 py-2",
                  item.isCurrent
                    ? "border-primary/40 bg-primary/10 hover:bg-primary/15"
                    : "border-base-300/80 bg-base-200/25 hover:border-base-300 hover:bg-base-200/50",
                )}
                title={`Перейти к серии: ${item.label}`}
              >
                {body}
              </button>
            );
          }

          return (
            <div
              key={item.seriesIdx}
              className={cn(
                "border-base-300/80 bg-base-200/25 rounded-box border",
                compact ? "px-2 py-1" : "px-2.5 py-2",
              )}
            >
              {body}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SeriesSecondaryLabel({
  text,
  tooltipItems,
  onNavigateToMeeting,
}: {
  text: string;
  tooltipItems?: ComponentSeriesTooltipItem[];
  onNavigateToMeeting?: (meeting: Meeting) => void;
}) {
  const [open, setOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    whileElementsMounted: autoUpdate,
    placement: "bottom-start",
    middleware: [offset(6), flip(), shift({ padding: 8 })],
  });
  const hover = useHover(context, {
    handleClose: safePolygon({ buffer: 2 }),
  });
  const { getReferenceProps, getFloatingProps } = useInteractions([hover]);
  const { isMounted, styles: transitionStyles } = useTransitionStyles(context, {
    duration: 80,
  });

  if (!tooltipItems?.length) {
    return (
      <div className="text-base-content/55 mt-0.5 text-xs wrap-anywhere">
        {text}
      </div>
    );
  }

  return (
    <>
      <span
        ref={refs.setReference}
        className="text-base-content/55 decoration-base-content/30 mt-0.5 inline-block cursor-default text-xs wrap-anywhere underline decoration-dotted underline-offset-2"
        {...getReferenceProps({
          onClick: (event) => {
            event.preventDefault();
            event.stopPropagation();
          },
          onMouseDown: (event) => {
            event.preventDefault();
            event.stopPropagation();
          },
        })}
      >
        {text}
      </span>
      {isMounted ? (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={{ ...floatingStyles, ...transitionStyles }}
            {...getFloatingProps({
              onMouseDown: (event) => {
                event.stopPropagation();
              },
              onClick: (event) => {
                event.stopPropagation();
              },
            })}
            className="border-base-300 bg-base-100 z-[100] max-w-sm rounded-lg border p-1 shadow-md select-text"
          >
            <SeriesScheduleItemsList
              items={tooltipItems}
              onNavigateToMeeting={onNavigateToMeeting}
              className="min-w-56"
            />
          </div>
        </FloatingPortal>
      ) : null}
    </>
  );
}

export function CourseComponentDetailsFields({
  config,
  component,
  instructorLabelById,
  assignedInstructors,
  audienceGroupIds,
  showAudienceAlways,
  seriesItems,
  onNavigateToMeeting,
  compact,
}: {
  config: SchemaScheduleConfig;
  component: SchemaComponent;
  instructorLabelById: Record<string, string>;
  assignedInstructors?: string | string[];
  audienceGroupIds?: string[];
  showAudienceAlways?: boolean;
  seriesItems: ComponentSeriesDisplayItem[];
  onNavigateToMeeting?: (meeting: Meeting) => void;
  compact?: boolean;
}) {
  const placement = countComponentPlacement(component);
  const targetLabel = formatComponentTarget(component);
  const placedLabel = formatComponentPlaced(placement);
  const showPool = shouldShowInstructorPool(
    component.instructor_pool,
    assignedInstructors ?? [],
  );
  const poolEntries = showPool
    ? formatInstructorPoolEntries(component.instructor_pool ?? [], (id) =>
        resolveInstructorLabel(id, instructorLabelById),
      )
    : [];
  const groupIds =
    audienceGroupIds ??
    expandStudentGroupSelectors(config, component.student_groups ?? []);
  const showGroups =
    Boolean(showAudienceAlways) ||
    (audienceGroupIds != null && audienceGroupIds.length > 0);

  const goalParts = [targetLabel, placedLabel].filter(Boolean);

  return (
    <>
      {goalParts.length ? (
        <DetailField label="Цель" compact={compact}>
          {goalParts.join(" · ")}
        </DetailField>
      ) : null}
      {component.per_group ? (
        <DetailField label="Режим" compact={compact}>
          <span className="badge badge-ghost badge-sm">по группам</span>
        </DetailField>
      ) : null}
      {component.expected_enrollment != null ? (
        <DetailField label="Набор" compact={compact}>
          {component.expected_enrollment}
        </DetailField>
      ) : null}
      {poolEntries.length ? (
        <DetailField label="Кто может вести" compact={compact}>
          <span className="inline-flex flex-col gap-0.5">
            {poolEntries.map((entry) => (
              <span key={entry}>{entry}</span>
            ))}
          </span>
        </DetailField>
      ) : null}
      {showGroups && groupIds.length ? (
        <DetailField label="Группы" compact={compact}>
          <MeetingAudienceInline config={config} groupIds={groupIds} />
        </DetailField>
      ) : null}
      <ComponentSeriesList
        items={seriesItems}
        onNavigateToMeeting={onNavigateToMeeting}
        compact={compact}
      />
    </>
  );
}

export function CourseComponentsAccordionList({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="border-base-300/70 divide-base-300/70 divide-y border-b">
      {children}
    </div>
  );
}

export function CourseComponentAccordionItem({
  tag,
  hint,
  badge,
  open,
  onToggle,
  trailing,
  children,
}: {
  tag: string;
  hint?: string;
  badge?: ReactNode;
  open: boolean;
  onToggle: () => void;
  trailing?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          className="hover:bg-base-200/40 flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-left"
          onClick={onToggle}
        >
          <span
            className={cn(
              "icon-[material-symbols--expand-more] text-base-content/50 shrink-0 text-base transition-transform",
              open && "rotate-180",
            )}
          />
          <span className="text-base-content min-w-0 flex-1 text-sm font-medium">
            {tag}
          </span>
          {badge}
          {hint ? (
            <span className="text-base-content/45 shrink-0 text-xs">
              {hint}
            </span>
          ) : null}
        </button>
        {trailing}
      </div>
      {open && children ? <div className="pb-0.5">{children}</div> : null}
    </div>
  );
}
