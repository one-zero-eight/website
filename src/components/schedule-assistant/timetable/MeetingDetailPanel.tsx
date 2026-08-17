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

import {
  courseDisplayTitle,
  findMeetingForComponent,
  formatComponentProgressHint,
  listComponentSeriesNavItemsForRef,
  meetingToScheduleTooltipItem,
  resolveCourseAndComponent,
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
  formatDisplayDate,
  resolveInstructorLabel,
  weekdayLabelRu,
  type Meeting,
} from "./timetableViewerModel.ts";

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

function resolveMeetingSchedule({
  meeting,
  allMeetings,
  instructorLabelById,
  onNavigateToMeeting,
}: {
  meeting: Meeting;
  allMeetings: Meeting[];
  instructorLabelById: Record<string, string>;
  onNavigateToMeeting: (meeting: Meeting) => void;
}): { phrase: ReactNode; datesList: ReactNode | null } {
  const ref = parseMeetingInstanceId(meeting.instance_id);
  const weekday = dayKey(meeting.date);

  if (meeting.cancelled) {
    return {
      phrase: <span className="badge badge-error badge-sm">Отменено</span>,
      datesList: null,
    };
  }

  if (ref?.kind === "occ") {
    const siblings = occurrenceMeetingsForSeries(allMeetings, meeting);
    const items = siblings.map((item) =>
      meetingToScheduleTooltipItem(
        item,
        instructorLabelById,
        item.instance_id === meeting.instance_id,
      ),
    );

    return {
      phrase: "На определенные даты",
      datesList: items.length ? (
        <div className="border-base-300/70 w-full border-b pb-1.5">
          <SeriesScheduleItemsList
            items={items}
            onNavigateToMeeting={onNavigateToMeeting}
          />
        </div>
      ) : null,
    };
  }

  if (ref?.kind === "wp") {
    return {
      phrase: (
        <>
          {everyWeekdayPhraseRu(weekday)}
          {meeting.override_fields?.length ? (
            <span className="text-base-content/60">
              {" "}
              · переопределено:{" "}
              {formatMeetingOverrideFields(meeting.override_fields)}
            </span>
          ) : null}
        </>
      ),
      datesList: null,
    };
  }

  return {
    phrase: weekdayLabelRu(weekday),
    datesList: null,
  };
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

  const schedule = resolveMeetingSchedule({
    meeting,
    allMeetings,
    instructorLabelById,
    onNavigateToMeeting,
  });

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
          ? `${formatDisplayDate(meeting.date)}, ${weekdayLabelRu(dayKey(meeting.date))}`
          : "—"}
      </DetailField>
      <DetailField label="Время">{timeRange}</DetailField>
      <DetailField label="Повтор">
        <span className="inline-flex min-w-0 flex-wrap items-center gap-1.5">
          {schedule.phrase}
          <MeetingOverrideIndicator fields={meeting.override_fields} />
        </span>
      </DetailField>
      {schedule.datesList}
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
