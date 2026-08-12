import type {
  SchemaComponent,
  SchemaScheduleConfig,
} from "@/api/schedule-assistant/types.ts";
import {
  AudienceTreeInfoIcon,
  GroupHierarchyInfoIcon,
} from "@/components/schedule-assistant/settings/courses/audienceTreeTooltip.tsx";
import { expandStudentGroupSelectors } from "@/components/schedule-assistant/config/studentGroupSelectors.ts";
import { summarizeMeetingAudience } from "@/components/schedule-assistant/timetable/meetingAudienceSummary.ts";
import {
  countComponentPlacement,
  formatComponentPlaced,
  formatComponentTarget,
  formatInstructorPoolEntries,
  shouldShowInstructorPool,
  type ComponentSeriesDisplayItem,
} from "@/components/schedule-assistant/timetable/meetingComponentContext.ts";
import { resolveInstructorLabel } from "@/components/schedule-assistant/timetable/timetableViewerModel.ts";
import type { Meeting } from "@/components/schedule-assistant/timetable/timetableViewerModel.ts";
import { cn } from "@/lib/ui/cn";
import { type ReactNode } from "react";

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
  const programs = summarizeMeetingAudience(config, groupIds);

  if (!programs.length) {
    return <span className="text-base-content/50">—</span>;
  }

  const items = programs.flatMap((program) => {
    if (program.full) {
      return [
        {
          key: program.selector || program.title,
          label: program.title,
          selector: program.selector,
          mode: "program" as const,
          groupIds: groupIds
            .map((id) => String(id || "").trim())
            .filter(Boolean),
        },
      ];
    }

    const trackItems = program.tracks.flatMap((track) => {
      if (track.full) {
        return [
          {
            key: track.selector + track.title,
            label: track.title,
            selector: track.selector,
            mode: "track" as const,
            groupIds: [] as string[],
          },
        ];
      }
      return track.groups.map((group) => ({
        key: `${track.selector}-${group.code}`,
        label: group.title,
        selector: "",
        mode: "track" as const,
        groupIds: [group.code],
      }));
    });

    const flatItems = program.flatGroups.map((group) => ({
      key: `${program.programCode || "other"}-${group.code}`,
      label: group.title,
      selector: "",
      mode: "program" as const,
      groupIds: [group.code],
    }));

    return [...trackItems, ...flatItems];
  });

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
          const body = (
            <>
              <div className="text-sm font-medium [overflow-wrap:anywhere]">
                {item.label}
              </div>
              {item.secondary ? (
                <div className="text-base-content/55 mt-0.5 text-xs [overflow-wrap:anywhere]">
                  {item.secondary}
                </div>
              ) : null}
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

  return (
    <>
      {targetLabel ? (
        <DetailField label="Цель" compact={compact}>
          {targetLabel}
        </DetailField>
      ) : null}
      {placedLabel ? (
        <DetailField label="Размещено" compact={compact}>
          {placedLabel}
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
