import type {
  SchemaComponent,
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
import { useEffect, useState } from "react";

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
    const items = siblings.map((item) =>
      meetingToScheduleTooltipItem(
        item,
        instructorLabelById,
        item.instance_id === meeting.instance_id,
      ),
    );
    const single =
      dates.length === 1
        ? meetingToScheduleTooltipItem(meeting, instructorLabelById)
        : null;

    return (
      <span className="flex w-full min-w-0 flex-col gap-1">
        <span className="text-base-content">На определенные даты</span>
        {dates.length > 1 ? (
          <SeriesScheduleItemsList
            items={items}
            onNavigateToMeeting={onNavigateToMeeting}
          />
        ) : single ? (
          <span className="text-base-content/55 text-xs">
            <span className="block wrap-anywhere">{single.primary}</span>
            {single.secondary ? (
              <span className="mt-0.5 block wrap-anywhere">
                {single.secondary}
              </span>
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
              badge={
                isCurrent ? (
                  <span className="badge badge-sm border-primary/40 bg-primary/10 text-base-content shrink-0">
                    выбран
                  </span>
                ) : undefined
              }
              open={open}
              onToggle={() => setOpenIdx(open ? null : idx)}
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
          ? `${formatDisplayDate(meeting.date)}, ${weekdayLabelRu(dayKey(meeting.date))}`
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
