import type {
  SchemaComponent,
  SchemaScheduleConfig,
} from "@/api/schedule-assistant/types.ts";
import {
  AudienceTreeInfoIcon,
  GroupHierarchyInfoIcon,
} from "@/components/schedule-assistant/settings/courses/audienceTreeTooltip.tsx";
import { cn } from "@/lib/ui/cn";
import { type ReactNode, useEffect, useState } from "react";

import { expandStudentGroupSelectors } from "@/components/schedule-assistant/config/studentGroupSelectors.ts";
import { summarizeMeetingAudience } from "./meetingAudienceSummary.ts";
import {
  countComponentPlacement,
  courseDisplayTitle,
  findMeetingForComponent,
  formatComponentPlaced,
  formatComponentProgressHint,
  formatComponentTarget,
  formatInstructorPoolEntries,
  listComponentSeriesNavItemsForRef,
  resolveCourseAndComponent,
  shouldShowInstructorPool,
  type ComponentSeriesNavItem,
} from "./meetingComponentContext.ts";
import { parseMeetingInstanceId } from "./meetingEditUtils.ts";
import {
  MeetingOverrideIndicator,
  formatMeetingOverrideFields,
} from "./meetingOverrideIndicator.tsx";
import {
  buildInstructorLabelById,
  dayKey,
  everyWeekdayPhraseRu,
  resolveInstructorLabel,
  weekdayLabelRu,
  type Meeting,
} from "./timetableViewerModel.ts";

function DetailSection({ title }: { title: string }) {
  return (
    <div className="text-base-content/55 mt-3 mb-1.5 text-xs font-semibold tracking-wide uppercase first:mt-0">
      {title}
    </div>
  );
}

function DetailField({
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

function formatInstructors(
  instructors: string | string[],
  instructorLabelById: Record<string, string>,
) {
  const list =
    typeof instructors === "string"
      ? instructors.trim()
        ? [instructors]
        : []
      : instructors;
  if (!list?.length) return "—";
  return list
    .map((id) => resolveInstructorLabel(String(id), instructorLabelById))
    .join(", ");
}

function occurrenceDatesForMeeting(
  config: SchemaScheduleConfig,
  meeting: Meeting,
): string[] {
  const ref = parseMeetingInstanceId(meeting.instance_id);
  if (!ref || ref.kind !== "occ") {
    return meeting.date ? [meeting.date] : [];
  }

  const course = config.courses?.[ref.courseIdx];
  const series =
    course?.components?.[ref.componentIdx]?.sessions?.[ref.seriesIdx];
  const dates = (series?.occurrences ?? [])
    .map((occurrence) => String(occurrence.date || "").trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  if (dates.length) return [...new Set(dates)];
  return meeting.date ? [meeting.date] : [];
}

function occurrenceMeetingsForSeries(
  allMeetings: Meeting[],
  meeting: Meeting,
): Meeting[] {
  const ref = parseMeetingInstanceId(meeting.instance_id);
  if (!ref || ref.kind !== "occ") {
    return meeting.date ? [meeting] : [];
  }

  return allMeetings
    .filter((candidate) => {
      const candidateRef = parseMeetingInstanceId(candidate.instance_id);
      return (
        candidateRef?.kind === "occ" &&
        candidateRef.courseIdx === ref.courseIdx &&
        candidateRef.componentIdx === ref.componentIdx &&
        candidateRef.seriesIdx === ref.seriesIdx
      );
    })
    .sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      if (byDate) return byDate;
      return a.instance_id.localeCompare(b.instance_id);
    });
}

function formatOccurrencePreview(
  meeting: Meeting,
  instructorLabelById: Record<string, string>,
): string | undefined {
  const parts: string[] = [];
  const instructors = formatInstructors(
    meeting.instructors,
    instructorLabelById,
  );
  if (instructors !== "—") parts.push(instructors);
  const room = String(meeting.room || "").trim();
  if (room) parts.push(room);
  return parts.length ? parts.join(" · ") : undefined;
}

function formatOccurrenceDateLine(meeting: Meeting): string {
  const iso = String(meeting.date || "").trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const datePart = match
    ? `${match[3]}.${match[2]}, ${weekdayLabelRu(dayKey(iso))}`
    : iso
      ? `${iso}, ${weekdayLabelRu(dayKey(iso))}`
      : "—";
  if (!meeting.start) return datePart;
  const time = meeting.end ? `${meeting.start}–${meeting.end}` : meeting.start;
  return `${datePart} ${time}`;
}

function MeetingScheduleKind({
  meeting,
  config,
  allMeetings,
  instructorLabelById,
  onNavigateToMeeting,
}: {
  meeting: Meeting;
  config: SchemaScheduleConfig;
  allMeetings: Meeting[];
  instructorLabelById: Record<string, string>;
  onNavigateToMeeting: (meeting: Meeting) => void;
}) {
  const ref = parseMeetingInstanceId(meeting.instance_id);
  const weekday = dayKey(meeting.date);

  if (meeting.cancelled) {
    return <span className="badge badge-error badge-sm">Отменено</span>;
  }

  if (ref?.kind === "occ") {
    const siblings = occurrenceMeetingsForSeries(allMeetings, meeting);
    const dates = occurrenceDatesForMeeting(config, meeting);
    const singlePreview =
      dates.length === 1
        ? formatOccurrencePreview(meeting, instructorLabelById)
        : undefined;

    return (
      <span className="flex w-full min-w-0 flex-col gap-1">
        <span className="text-base-content">На определенные даты</span>
        {dates.length > 1 ? (
          <span className="flex max-h-36 w-full [scrollbar-width:thin] flex-col gap-0.5 overflow-y-auto">
            {siblings.map((item) => {
              const isCurrent = item.instance_id === meeting.instance_id;
              const preview = formatOccurrencePreview(
                item,
                instructorLabelById,
              );
              return (
                <button
                  key={item.instance_id}
                  type="button"
                  onClick={() => onNavigateToMeeting(item)}
                  className={cn(
                    "w-full rounded px-1.5 py-1 text-left text-xs leading-snug transition-colors",
                    isCurrent
                      ? "bg-primary/10 text-base-content font-medium"
                      : "text-base-content/70 hover:bg-base-200/60 hover:text-base-content",
                  )}
                  title={`Перейти к ${item.date}`}
                >
                  <span className="block [overflow-wrap:anywhere]">
                    {formatOccurrenceDateLine(item)}
                  </span>
                  {preview ? (
                    <span
                      className={cn(
                        "mt-0.5 block [overflow-wrap:anywhere]",
                        isCurrent
                          ? "text-base-content/55 font-normal"
                          : "text-base-content/45",
                      )}
                    >
                      {preview}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </span>
        ) : dates.length === 1 ? (
          <span className="text-base-content/55 text-xs">
            <span className="block">{formatOccurrenceDateLine(meeting)}</span>
            {singlePreview ? (
              <span className="mt-0.5 block">{singlePreview}</span>
            ) : null}
          </span>
        ) : null}
      </span>
    );
  }

  if (ref?.kind === "wp") {
    return (
      <span className="text-base-content">
        {everyWeekdayPhraseRu(weekday)}
        {meeting.override_fields?.length ? (
          <span className="text-base-content/60">
            {" "}
            · переопределено:{" "}
            {formatMeetingOverrideFields(meeting.override_fields)}
          </span>
        ) : null}
      </span>
    );
  }

  return <span className="text-base-content">{weekdayLabelRu(weekday)}</span>;
}

function MeetingAudienceInline({
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

function ComponentSeriesList({
  items,
  onNavigateToMeeting,
  compact,
}: {
  items: ComponentSeriesNavItem[];
  onNavigateToMeeting: (meeting: Meeting) => void;
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
        {items.map((item) => (
          <button
            key={item.seriesIdx}
            type="button"
            onClick={() => onNavigateToMeeting(item.meeting)}
            className={cn(
              "rounded-box cursor-pointer border text-left transition-colors",
              compact ? "px-2 py-1" : "px-2.5 py-2",
              item.isCurrent
                ? "border-primary/40 bg-primary/10 hover:bg-primary/15"
                : "border-base-300/80 bg-base-200/25 hover:border-base-300 hover:bg-base-200/50",
            )}
            title={`Перейти к серии: ${item.label}`}
          >
            <div className="text-sm font-medium [overflow-wrap:anywhere]">
              {item.label}
            </div>
            {item.secondary ? (
              <div className="text-base-content/55 mt-0.5 text-xs [overflow-wrap:anywhere]">
                {item.secondary}
              </div>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}

function ComponentDetailsFields({
  config,
  component,
  instructorLabelById,
  assignedInstructors,
  audienceGroupIds,
  showAudienceAlways,
  seriesNavItems,
  onNavigateToMeeting,
  compact,
}: {
  config: SchemaScheduleConfig;
  component: SchemaComponent;
  instructorLabelById: Record<string, string>;
  assignedInstructors?: string | string[];
  audienceGroupIds?: string[];
  showAudienceAlways?: boolean;
  seriesNavItems: ComponentSeriesNavItem[];
  onNavigateToMeeting: (meeting: Meeting) => void;
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
        items={seriesNavItems}
        onNavigateToMeeting={onNavigateToMeeting}
        compact={compact}
      />
    </>
  );
}

function CourseComponentsAccordion({
  config,
  courseIdx,
  components,
  currentComponentIdx,
  currentMeeting,
  allMeetings,
  instructorLabelById,
  onNavigateToMeeting,
}: {
  config: SchemaScheduleConfig;
  courseIdx: number | null;
  components: SchemaComponent[];
  currentComponentIdx: number | null;
  currentMeeting: Meeting;
  allMeetings: Meeting[];
  instructorLabelById: Record<string, string>;
  onNavigateToMeeting: (meeting: Meeting) => void;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(currentComponentIdx);

  useEffect(() => {
    setOpenIdx(currentComponentIdx);
  }, [currentMeeting.instance_id, currentComponentIdx]);

  if (!components.length || courseIdx == null) return null;

  return (
    <>
      <DetailSection title="Компоненты курса" />
      <div className="border-base-300/70 divide-base-300/70 divide-y border-b">
        {components.map((sibling, idx) => {
          const tag =
            String(sibling.tag || "").trim() || `Компонент ${idx + 1}`;
          const open = openIdx === idx;
          const isCurrent = idx === currentComponentIdx;
          const hint = formatComponentProgressHint(sibling);
          const seriesNavItems = listComponentSeriesNavItemsForRef(
            config,
            allMeetings,
            courseIdx,
            idx,
            currentMeeting,
            instructorLabelById,
          );
          const assigned = isCurrent
            ? currentMeeting.instructors
            : findMeetingForComponent(
                allMeetings,
                courseIdx,
                idx,
                currentMeeting,
              )?.instructors;

          return (
            <div key={`${tag}-${idx}`}>
              <button
                type="button"
                className="hover:bg-base-200/40 flex w-full items-center gap-1.5 px-0 py-1.5 text-left"
                onClick={() => setOpenIdx(open ? null : idx)}
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
                {isCurrent ? (
                  <span className="badge badge-ghost badge-sm shrink-0">
                    текущий
                  </span>
                ) : null}
                {hint ? (
                  <span className="text-base-content/45 shrink-0 text-xs">
                    {hint}
                  </span>
                ) : null}
              </button>
              {open ? (
                <div className="pb-0.5">
                  <ComponentDetailsFields
                    config={config}
                    component={sibling}
                    instructorLabelById={instructorLabelById}
                    assignedInstructors={assigned}
                    showAudienceAlways
                    seriesNavItems={seriesNavItems}
                    onNavigateToMeeting={onNavigateToMeeting}
                    compact
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}

export function MeetingDetailPanel({
  meeting,
  config,
  allMeetings,
  onNavigateToMeeting,
}: {
  meeting: Meeting;
  config: SchemaScheduleConfig;
  allMeetings: Meeting[];
  onNavigateToMeeting: (meeting: Meeting) => void;
}) {
  const instructorLabelById = buildInstructorLabelById(config);
  const { course } = resolveCourseAndComponent(config, meeting);
  const meetingRef = parseMeetingInstanceId(meeting.instance_id);

  const courseTitle = courseDisplayTitle(course, meeting);

  const timeRange = meeting.end
    ? `${meeting.start}–${meeting.end}`
    : meeting.start || "—";
  const room = String(meeting.room || "").trim() || "—";
  const instructors = formatInstructors(
    meeting.instructors,
    instructorLabelById,
  );

  const staff = (course?.instructors ?? []).filter(
    (entry) => String(entry.id || "").trim() && String(entry.role || "").trim(),
  );
  const siblings = course?.components ?? [];
  const courseShortName =
    String(course?.short_name || course?.short_name_ru || "").trim() || "—";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1 text-sm" id="detailList">
      {meeting.cancelled ? (
        <div className="alert alert-warning mb-2 py-2 text-sm">
          Это занятие отменено в конфигурации.
        </div>
      ) : null}

      <DetailSection title="Занятие" />
      <DetailField label="Дата">
        {meeting.date
          ? `${meeting.date}, ${weekdayLabelRu(dayKey(meeting.date))}`
          : "—"}
      </DetailField>
      <DetailField label="Время">{timeRange}</DetailField>
      <DetailField label="Повтор" fullWidth>
        <span className="flex w-full min-w-0 flex-col gap-1.5">
          <MeetingScheduleKind
            meeting={meeting}
            config={config}
            allMeetings={allMeetings}
            instructorLabelById={instructorLabelById}
            onNavigateToMeeting={onNavigateToMeeting}
          />
          <MeetingOverrideIndicator fields={meeting.override_fields} />
        </span>
      </DetailField>
      <DetailField label="Локация">{room}</DetailField>
      <DetailField label="Преподаватель">{instructors}</DetailField>
      <DetailField label="Группы">
        <MeetingAudienceInline
          config={config}
          groupIds={meeting.groups || []}
        />
      </DetailField>

      <DetailSection title="Предмет" />
      <DetailField label="Название" truncate>
        {courseTitle}
      </DetailField>
      <DetailField label="Короткое название" truncate>
        {courseShortName}
      </DetailField>
      <DetailField label="Преподаватели">
        {staff.length ? (
          <span className="flex flex-col gap-0.5">
            {staff.map((entry) => (
              <span key={`${entry.id}:${entry.role}`}>
                {resolveInstructorLabel(entry.id, instructorLabelById)}
                <span className="text-base-content/55"> · {entry.role}</span>
              </span>
            ))}
          </span>
        ) : (
          "—"
        )}
      </DetailField>
      <CourseComponentsAccordion
        config={config}
        courseIdx={meetingRef?.courseIdx ?? null}
        components={siblings}
        currentComponentIdx={meetingRef?.componentIdx ?? null}
        currentMeeting={meeting}
        allMeetings={allMeetings}
        instructorLabelById={instructorLabelById}
        onNavigateToMeeting={onNavigateToMeeting}
      />
    </div>
  );
}
