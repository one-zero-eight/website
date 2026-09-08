import type {
  SchemaComponent,
  SchemaCourseConfig,
  SchemaScheduleConfig,
} from "@/api/schedule-assistant/types.ts";
import {
  CourseComponentAccordionItem,
  CourseComponentDetailsFields,
  CourseComponentsAccordionList,
  DetailField,
  DetailSection,
  MeetingAudienceInline,
  SeriesScheduleItemsList,
} from "@/components/schedule-assistant/courses/CourseComponentDetailsView.tsx";
import {
  useInstructorsQuery,
  usePatchCourseMutation,
  useSemesterSettings,
} from "@/components/schedule-assistant/config/useConfig.tsx";
import { ComponentEditModal } from "@/components/schedule-assistant/settings/courses/ComponentEditModal.tsx";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/ui/cn";
import Tooltip from "@/components/common/Tooltip.tsx";

import {
  courseDisplayTitle,
  findMeetingForComponent,
  formatComponentProgressHint,
  listComponentSeriesNavItemsForRef,
  meetingToScheduleTooltipItem,
  resolveCourseAndComponent,
} from "./meetingComponentContext.ts";
import { parseMeetingInstanceId } from "./meetingEditUtils.ts";
import { listAudienceInlineItems } from "./meetingAudienceSummary.ts";
import {
  MeetingMetadataField,
  MeetingMetadataLabels,
  MeetingMetadataRow,
  meetingMetadataGridClass,
  meetingMetadataSubgridClass,
  meetingMetadataOverrideClass,
} from "./MeetingMetadata.tsx";
import {
  buildInstructorLabelById,
  dayKey,
  everyWeekdayPhraseRu,
  resolveInstructorLabel,
  weekdayLabelRu,
  type Meeting,
} from "./timetableViewerModel.ts";

function formatMeetingDate(date: string) {
  const value = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    ...(value.getFullYear() !== new Date().getFullYear()
      ? { year: "numeric" as const }
      : {}),
  }).format(value);
}

function shortMeetingWeekday(date: string) {
  return new Intl.DateTimeFormat("ru-RU", { weekday: "short" })
    .format(new Date(`${date}T12:00:00`))
    .replace(/^./u, (letter) => letter.toUpperCase());
}

function MeetingDateListItem({
  meeting,
  config,
  instructorLabels,
}: {
  meeting: Meeting;
  config: SchemaScheduleConfig;
  instructorLabels: Record<string, string>;
}) {
  const instructors = formatInstructors(meeting.instructors, instructorLabels);
  const audienceItems = listAudienceInlineItems(config, meeting.groups);
  const overrides = new Set(meeting.override_fields);
  return (
    <span className={cn(meetingMetadataSubgridClass, "gap-y-0.5")}>
      <MeetingMetadataRow
        left={
          <MeetingMetadataField kind="schedule" showIcon={false}>
            <span className="inline-flex items-center gap-1.5">
              <span
                className={cn(
                  "text-sm font-medium",
                  meeting.cancelled && "line-through opacity-60",
                  overrides.has("weekday") && meetingMetadataOverrideClass,
                )}
              >
                {shortMeetingWeekday(meeting.date)},{" "}
                {formatMeetingDate(meeting.date)}
              </span>
              {meeting.cancelled ? (
                <span className="badge badge-error badge-xs">Отменено</span>
              ) : null}
              <span
                className={cn(
                  "text-sm font-medium tabular-nums",
                  overrides.has("time") && meetingMetadataOverrideClass,
                )}
              >
                {meeting.start}
                {meeting.end ? `–${meeting.end}` : ""}
              </span>
            </span>
          </MeetingMetadataField>
        }
        right={
          <MeetingMetadataField kind="room" overridden={overrides.has("room")}>
            {meeting.room || "Без локации"}
          </MeetingMetadataField>
        }
      />
      <MeetingMetadataRow
        left={
          <MeetingMetadataField kind="audience">
            {audienceItems.length ? (
              <MeetingMetadataLabels
                labels={audienceItems.map((item) => item.label)}
              />
            ) : (
              "Без групп"
            )}
          </MeetingMetadataField>
        }
        right={
          <MeetingMetadataField
            kind="instructor"
            overridden={overrides.has("instructor")}
          >
            {instructors === "—" ? "Без преподавателя" : instructors}
          </MeetingMetadataField>
        }
      />
    </span>
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

function meetingsForSchedule(
  allMeetings: Meeting[],
  meeting: Meeting,
): Meeting[] {
  const ref = parseMeetingInstanceId(meeting.instance_id);
  if (!ref) {
    return meeting.date ? [meeting] : [];
  }

  return allMeetings
    .filter((candidate) => {
      const candidateRef = parseMeetingInstanceId(candidate.instance_id);
      return (
        candidateRef?.kind === ref.kind &&
        candidateRef.courseIdx === ref.courseIdx &&
        candidateRef.componentIdx === ref.componentIdx &&
        candidateRef.seriesIdx === ref.seriesIdx &&
        (ref.kind !== "wp" ||
          (candidateRef.kind === "wp" && candidateRef.slotIdx === ref.slotIdx))
      );
    })
    .sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      if (byDate) return byDate;
      return a.instance_id.localeCompare(b.instance_id);
    });
}

function resolveMeetingSchedule(meeting: Meeting): ReactNode {
  const ref = parseMeetingInstanceId(meeting.instance_id);
  const weekday = dayKey(meeting.date);

  if (meeting.cancelled) {
    return <span className="badge badge-error badge-sm">Отменено</span>;
  }
  if (ref?.kind === "occ") return "На определенные даты";
  if (ref?.kind === "wp") return everyWeekdayPhraseRu(weekday);
  return weekdayLabelRu(weekday);
}

function CourseComponentsAccordion({
  config,
  course,
  courseIdx,
  components,
  currentComponentIdx,
  currentMeeting,
  allMeetings,
  instructorLabelById,
  onNavigateToMeeting,
}: {
  config: SchemaScheduleConfig;
  course: SchemaCourseConfig | null;
  courseIdx: number | null;
  components: SchemaComponent[];
  currentComponentIdx: number | null;
  currentMeeting: Meeting;
  allMeetings: Meeting[];
  instructorLabelById: Record<string, string>;
  onNavigateToMeeting: (meeting: Meeting) => void;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(currentComponentIdx);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const { term } = useSemesterSettings();
  const { data: instructors = [] } = useInstructorsQuery();
  const courseName = String(course?.name || "").trim();
  const { patchCourse } = usePatchCourseMutation(courseName || undefined);
  const editingComponent =
    editIndex === null ? null : (components[editIndex] ?? null);

  useEffect(() => {
    setOpenIdx(currentComponentIdx);
  }, [currentMeeting.instance_id, currentComponentIdx]);

  if (!components.length || courseIdx == null) return null;

  return (
    <>
      <DetailSection title="Компоненты курса" />
      <CourseComponentsAccordionList>
        {components.map((sibling, idx) => {
          const tag =
            String(sibling.tag || "").trim() || `Компонент ${idx + 1}`;
          const open = openIdx === idx;
          const isCurrent = idx === currentComponentIdx;
          const hint = formatComponentProgressHint(config, sibling);
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
            <CourseComponentAccordionItem
              key={`${tag}-${idx}`}
              tag={tag}
              hint={hint || undefined}
              selected={isCurrent}
              open={open}
              onToggle={() => setOpenIdx(open ? null : idx)}
              afterTag={
                <button
                  type="button"
                  className="btn btn-ghost btn-xs btn-square"
                  title="Редактировать"
                  onClick={() => setEditIndex(idx)}
                >
                  <span className="icon-[material-symbols--edit-outline-rounded] text-base" />
                </button>
              }
            >
              <CourseComponentDetailsFields
                config={config}
                component={sibling}
                instructorLabelById={instructorLabelById}
                assignedInstructors={assigned}
                showAudienceAlways
                seriesItems={seriesNavItems}
                onNavigateToMeeting={onNavigateToMeeting}
                compact
              />
            </CourseComponentAccordionItem>
          );
        })}
      </CourseComponentsAccordionList>
      <ComponentEditModal
        open={editIndex !== null && !!editingComponent}
        onOpenChange={(open) => {
          if (!open) setEditIndex(null);
        }}
        config={config}
        courseIndex={courseIdx}
        componentIndex={editIndex}
        component={editingComponent}
        tagOptions={(term?.course_component_tags ?? []).filter(Boolean)}
        instructors={instructors}
        courseInstructors={course?.instructors}
        onSave={(component) => {
          if (editIndex === null) return;
          const next = [...components];
          next[editIndex] = component;
          patchCourse({ components: next });
        }}
      />
    </>
  );
}

export function MeetingDetailPanel({
  meeting,
  config,
  allMeetings,
  onNavigateToMeeting,
  onEdit,
}: {
  meeting: Meeting;
  config: SchemaScheduleConfig;
  allMeetings: Meeting[];
  onNavigateToMeeting: (meeting: Meeting) => void;
  onEdit?: () => void;
}) {
  const instructorLabelById = buildInstructorLabelById(config);
  const { course } = resolveCourseAndComponent(config, meeting);
  const meetingRef = parseMeetingInstanceId(meeting.instance_id);

  const courseTitle = courseDisplayTitle(course, meeting);

  const timeRange = meeting.end
    ? `${meeting.start}–${meeting.end}`
    : meeting.start || "—";
  const dateLabel = meeting.date ? formatMeetingDate(meeting.date) : "—";
  const weekdayLabel = meeting.date ? shortMeetingWeekday(meeting.date) : "";
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

  const schedule = resolveMeetingSchedule(meeting);
  const [expandedMeetingId, setExpandedMeetingId] = useState<string | null>(
    null,
  );
  const datesOpen = expandedMeetingId === meeting.instance_id;
  const scheduleMeetings = meetingsForSchedule(allMeetings, meeting);
  const scheduleItems = scheduleMeetings.map((item) =>
    meetingToScheduleTooltipItem(
      item,
      instructorLabelById,
      item.instance_id === meeting.instance_id,
    ),
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1 text-sm" id="detailList">
      {meeting.cancelled ? (
        <div className="alert alert-warning mb-2 py-2 text-sm">
          Это занятие отменено в конфигурации.
        </div>
      ) : null}

      <div className="mt-3 mb-1.5 flex items-center justify-between gap-2 first:mt-0">
        <span className="text-base-content/55 text-xs font-semibold tracking-wide uppercase">
          Занятие
        </span>
        {onEdit ? (
          <button
            type="button"
            className="btn btn-ghost btn-xs shrink-0"
            onClick={onEdit}
          >
            <span className="icon-[material-symbols--edit-outline-rounded] text-sm" />
            Редактировать
          </button>
        ) : null}
      </div>
      <div className={cn(meetingMetadataGridClass, "gap-y-0.5")}>
        <MeetingMetadataRow
          left={
            <MeetingMetadataField
              kind="schedule"
              weekly={meetingRef?.kind === "wp"}
              title="Дата и время"
              iconTooltip={(icon) => (
                <Tooltip content={schedule}>{icon}</Tooltip>
              )}
            >
              {weekdayLabel ? `${weekdayLabel}, ` : ""}
              {dateLabel} {timeRange}
            </MeetingMetadataField>
          }
          right={
            <MeetingMetadataField kind="room" title="Локация">
              {room}
            </MeetingMetadataField>
          }
        />
        <MeetingMetadataRow
          left={
            <MeetingMetadataField kind="audience" title="Группы">
              <MeetingAudienceInline
                config={config}
                groupIds={meeting.groups || []}
              />
            </MeetingMetadataField>
          }
          right={
            <MeetingMetadataField kind="instructor" title="Преподаватели">
              {instructors}
            </MeetingMetadataField>
          }
        />
        <button
          type="button"
          className="text-base-content/60 hover:text-primary col-span-2 flex items-center gap-1.5 justify-self-start rounded-md text-xs transition-colors"
          onClick={() =>
            setExpandedMeetingId(datesOpen ? null : meeting.instance_id)
          }
        >
          <span className="icon-[material-symbols--calendar-month-outline-rounded] text-sm" />
          {datesOpen ? "Скрыть даты" : "Показать даты"}
          <span>{scheduleMeetings.length}</span>
          <span
            className={cn(
              "text-sm",
              datesOpen
                ? "icon-[material-symbols--expand-less-rounded]"
                : "icon-[material-symbols--expand-more-rounded]",
            )}
          />
        </button>
        {datesOpen ? (
          <SeriesScheduleItemsList
            items={scheduleItems}
            className="col-span-2 min-w-0"
            sharedColumns
            showNavigationTitle={false}
            onNavigateToMeeting={(nextMeeting) => {
              setExpandedMeetingId(nextMeeting.instance_id);
              onNavigateToMeeting(nextMeeting);
            }}
            renderItem={(item) =>
              item.meeting ? (
                <MeetingDateListItem
                  meeting={item.meeting}
                  config={config}
                  instructorLabels={instructorLabelById}
                />
              ) : null
            }
          />
        ) : null}
      </div>

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
        course={course}
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
