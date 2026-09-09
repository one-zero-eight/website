import type {
  TimetableViewComponent as SchemaComponent,
  TimetableViewConfig as SchemaScheduleConfig,
} from "@/components/schedule-assistant/timetable/timetableViewTypes.ts";
import {
  AudienceTreeInfoIcon,
  GroupHierarchyInfoIcon,
} from "@/components/schedule-assistant/settings/courses/audienceTreeTooltip.tsx";
import { expandStudentGroupSelectors } from "@/components/schedule-assistant/config/studentGroupSelectors.ts";
import { listAudienceInlineItems } from "@/components/schedule-assistant/timetable/meetingAudienceSummary.ts";
import {
  MeetingMetadataField,
  MeetingMetadataLabels,
  MeetingMetadataRow,
  meetingMetadataCardClass,
  meetingMetadataGridClass,
  meetingMetadataSubgridClass,
  meetingMetadataTextClass,
} from "@/components/schedule-assistant/timetable/MeetingMetadata.tsx";
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
    <span className="inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
      {items.map((item) => (
        <span
          key={item.key}
          className="inline-flex max-w-full min-w-0 items-center gap-0.5 leading-none"
        >
          <span className="min-w-0 leading-5 wrap-anywhere whitespace-normal">
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
  renderItem,
  sharedColumns = false,
  showNavigationTitle = true,
}: {
  items: ComponentSeriesTooltipItem[];
  onNavigateToMeeting?: (meeting: Meeting) => void;
  className?: string;
  renderItem?: (item: ComponentSeriesTooltipItem) => ReactNode;
  sharedColumns?: boolean;
  showNavigationTitle?: boolean;
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
        className={cn(
          "max-h-72 w-full [scrollbar-width:thin] gap-y-0.5 overflow-y-auto",
          sharedColumns ? meetingMetadataGridClass : "flex flex-col",
        )}
      >
        {items.map((item, index) => {
          const canNavigate = Boolean(item.meeting && onNavigateToMeeting);
          const rowClass = cn(
            "w-full rounded text-left font-normal transition-colors",
            sharedColumns
              ? cn(
                  meetingMetadataSubgridClass,
                  meetingMetadataTextClass,
                  meetingMetadataCardClass,
                )
              : "px-1.5 py-1 text-xs leading-snug",
            item.isCurrent
              ? "bg-primary/10 text-base-content"
              : "text-base-content/70",
            canNavigate &&
              !item.isCurrent &&
              "hover:bg-base-200/60 hover:text-base-content",
            canNavigate && "cursor-pointer",
          );
          const body = renderItem ? (
            renderItem(item)
          ) : (
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
                title={
                  showNavigationTitle
                    ? `Перейти к ${item.meeting!.date ? formatDisplayDate(item.meeting!.date) : item.primary}`
                    : undefined
                }
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
      <div
        className={cn(
          meetingMetadataGridClass,
          compact ? "gap-y-0.5" : "gap-y-1",
        )}
      >
        {items.map((item) => {
          const secondary = item.secondaryParts ? (
            <MeetingMetadataRow
              left={
                item.secondaryParts.schedule ? (
                  <MeetingMetadataField
                    kind="schedule"
                    weekly={item.secondaryParts.weekly}
                  >
                    {item.secondaryParts.schedule}
                  </MeetingMetadataField>
                ) : null
              }
              right={
                item.secondaryParts.room ? (
                  <MeetingMetadataField kind="room">
                    {item.secondaryParts.room}
                  </MeetingMetadataField>
                ) : null
              }
            />
          ) : item.secondary ? (
            <span className="col-span-2 min-w-0">
              <SeriesSecondaryLabel
                text={item.secondary}
                tooltipItems={item.secondaryTooltipItems}
                onNavigateToMeeting={onNavigateToMeeting}
              />
            </span>
          ) : null;

          const body = (
            <>
              <MeetingMetadataRow
                left={
                  <span className="font-medium">
                    <MeetingMetadataLabels labels={item.label.split(", ")} />
                  </span>
                }
                right={
                  item.secondaryParts?.instructor ? (
                    <MeetingMetadataField kind="instructor">
                      {item.secondaryParts.instructor}
                    </MeetingMetadataField>
                  ) : null
                }
              />
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
                  meetingMetadataSubgridClass,
                  meetingMetadataTextClass,
                  "cursor-pointer rounded text-left font-normal transition-colors",
                  compact ? meetingMetadataCardClass : "px-2.5 py-2",
                  item.isCurrent
                    ? "bg-primary/10 text-base-content"
                    : "text-base-content/70 hover:bg-base-200/60 hover:text-base-content",
                )}
              >
                {body}
              </button>
            );
          }

          return (
            <div
              key={item.seriesIdx}
              className={cn(
                meetingMetadataSubgridClass,
                meetingMetadataTextClass,
                "rounded text-left font-normal",
                compact ? meetingMetadataCardClass : "px-2.5 py-2",
                item.isCurrent
                  ? "bg-primary/10 text-base-content"
                  : "text-base-content/70",
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
      <div className="text-base-content/80 mt-0.5 text-sm wrap-anywhere">
        {text}
      </div>
    );
  }

  return (
    <>
      <span
        ref={refs.setReference}
        className="text-base-content/80 decoration-base-content/30 mt-0.5 inline-block cursor-default text-sm wrap-anywhere underline decoration-dotted underline-offset-2"
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
              className="w-80 max-w-[calc(100vw-2rem)]"
              sharedColumns
              showNavigationTitle={false}
              renderItem={(item) => (
                <>
                  <MeetingMetadataRow
                    left={
                      <MeetingMetadataField
                        kind="schedule"
                        weekly={item.weekly}
                      >
                        {item.primaryWeekday
                          ? `${item.primaryWeekday}, `
                          : null}
                        {[item.primaryDate, item.primaryTime]
                          .filter(Boolean)
                          .join(" ")}
                      </MeetingMetadataField>
                    }
                    right={
                      item.room ? (
                        <MeetingMetadataField kind="room">
                          {item.room}
                        </MeetingMetadataField>
                      ) : null
                    }
                  />
                  {item.instructor ? (
                    <MeetingMetadataRow
                      right={
                        <MeetingMetadataField kind="instructor">
                          {item.instructor}
                        </MeetingMetadataField>
                      }
                    />
                  ) : null}
                </>
              )}
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
  showPlanningDetails = true,
}: {
  showPlanningDetails?: boolean;
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
  const placement = countComponentPlacement(config, component);
  const targetLabel = formatComponentTarget(component);
  const placedLabel = formatComponentPlaced(placement);
  const instructorPool =
    "instructor_pool" in component && Array.isArray(component.instructor_pool)
      ? component.instructor_pool
      : [];
  const showPool = shouldShowInstructorPool(
    instructorPool,
    assignedInstructors ?? [],
  );
  const poolEntries = showPool
    ? formatInstructorPoolEntries(instructorPool, (id) =>
        resolveInstructorLabel(id, instructorLabelById),
      )
    : [];
  const groupIds =
    audienceGroupIds ??
    expandStudentGroupSelectors(config, component.audience ?? []);
  const showGroups =
    Boolean(showAudienceAlways) ||
    (audienceGroupIds != null && audienceGroupIds.length > 0);

  const goalParts = [targetLabel, placedLabel].filter(Boolean);

  return (
    <>
      {showPlanningDetails && goalParts.length ? (
        <DetailField label="Цель" compact={compact}>
          {goalParts.join(" · ")}
        </DetailField>
      ) : null}
      {showPlanningDetails && component.per_group ? (
        <DetailField label="Режим" compact={compact}>
          <span className="badge badge-ghost badge-sm">по группам</span>
        </DetailField>
      ) : null}
      {showPlanningDetails && component.expected_enrollment != null ? (
        <DetailField label="Набор" compact={compact}>
          {component.expected_enrollment}
        </DetailField>
      ) : null}
      {showPlanningDetails && poolEntries.length ? (
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
  selected = false,
  onToggle,
  afterTag,
  trailing,
  children,
}: {
  tag: string;
  hint?: string;
  badge?: ReactNode;
  open: boolean;
  selected?: boolean;
  onToggle: () => void;
  afterTag?: ReactNode;
  trailing?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div>
      <div className="hover:bg-base-200/40 flex items-center gap-0.5 rounded-md px-0.5">
        <button
          type="button"
          className="flex items-center gap-1.5 py-1.5 text-left"
          onClick={onToggle}
        >
          <span
            className={cn(
              "icon-[material-symbols--expand-more] text-base-content/50 shrink-0 text-base transition-transform",
              open && "rotate-180",
            )}
          />
          <span
            className={cn(
              "text-base-content shrink-0 rounded-sm px-1 text-sm font-medium",
              selected && "bg-primary/15",
            )}
          >
            {tag}
          </span>
        </button>
        {afterTag}
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-left"
          onClick={onToggle}
        >
          {badge}
          {hint ? (
            <span className="text-base-content/45 ml-auto shrink-0 text-xs">
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
