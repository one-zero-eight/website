import { useMemo } from "react";
import {
  DetailField,
  DetailSection,
} from "@/components/schedule-assistant/courses/CourseComponentDetailsView.tsx";
import {
  instructorAssignedMeetings,
  resolveTimetableInstructor,
} from "./instructorDetails.ts";
import { buildTimetableSearchEntries } from "./timetableSearch.ts";
import { parseMeetingInstanceId } from "./meetingEditUtils.ts";
import {
  buildInstructorLabelById,
  type Meeting,
} from "./timetableViewerModel.ts";
import type { TimetableViewConfig } from "./timetableViewTypes.ts";

export function InstructorDetailPanel({
  instructorId,
  config,
  allMeetings,
  onNavigateToMeeting,
}: {
  instructorId: string;
  config: TimetableViewConfig;
  allMeetings: Meeting[];
  onNavigateToMeeting: (meeting: Meeting) => void;
}) {
  const instructor = resolveTimetableInstructor(
    config.instructors ?? [],
    instructorId,
  );
  const series = useMemo(() => {
    const meetings = instructorAssignedMeetings(
      config.instructors ?? [],
      allMeetings,
      instructorId,
    );
    const entries = buildTimetableSearchEntries(
      meetings,
      buildInstructorLabelById(config),
      config,
    );
    const grouped = new Map<string, typeof entries>();
    for (const entry of entries) {
      const ref = parseMeetingInstanceId(entry.meeting.instance_id);
      const key =
        ref?.kind === "occ"
          ? `${ref.courseIdx}:${ref.componentIdx}:${ref.seriesIdx}:occ`
          : entry.seriesKey;
      const group = grouped.get(key);
      if (group) group.push(entry);
      else grouped.set(key, [entry]);
    }
    return [...grouped.entries()];
  }, [config, allMeetings, instructorId]);

  return (
    <div className="flex min-w-0 flex-col gap-1 text-sm">
      <DetailSection title="Преподаватель" />
      <h2 className="text-lg font-semibold [overflow-wrap:anywhere]">
        {instructor?.name_en || instructor?.name_ru || instructorId}
      </h2>
      {instructor?.name_ru && instructor.name_ru !== instructor.name_en ? (
        <DetailField label="Имя">{instructor.name_ru}</DetailField>
      ) : null}
      {instructor?.position ? (
        <DetailField label="Должность">{instructor.position}</DetailField>
      ) : null}
      {instructor?.email ? (
        <DetailField label="Почта">
          <a className="link link-primary" href={`mailto:${instructor.email}`}>
            {instructor.email}
          </a>
        </DetailField>
      ) : null}
      {instructor?.alias ? (
        <DetailField label="Alias">{instructor.alias}</DetailField>
      ) : null}
      <DetailSection title="Занятия за семестр" />
      {!series.length ? (
        <p className="text-base-content/60">Назначенных занятий нет.</p>
      ) : null}
      {series.map(([key, entries]) => (
        <details
          key={key}
          className="border-base-300 rounded-box border"
          open={entries.length === 1}
        >
          <summary className="hover:bg-base-200 rounded-box cursor-pointer p-3">
            <span className="font-medium">
              {entries[0].meeting.course} · {entries[0].meeting.tag}
            </span>
            <span className="text-base-content/60 ml-2 text-xs">
              {entries.length} занятий
            </span>
          </summary>
          <div className="flex flex-col gap-1 px-2 pb-2">
            {entries.map((entry) => (
              <button
                type="button"
                key={entry.meeting.instance_id}
                className="hover:bg-base-200 flex flex-col gap-1 rounded-lg p-2 text-left"
                onClick={() => onNavigateToMeeting(entry.meeting)}
              >
                <span className="font-medium">
                  {entry.dateLabel} · {entry.weekdayLabel} ·{" "}
                  {entry.meeting.start}–{entry.meeting.end}
                </span>
                <span className="text-base-content/70">
                  {entry.audienceLabel || "Без групп"} ·{" "}
                  {entry.meeting.room || "Без аудитории"}
                </span>
              </button>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
