import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { useMemo } from "react";
import {
  alternateInstructorName,
  localizedInstructorName,
  meetingCourseTitle,
} from "./localizedNames.ts";
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
  const { t, i18n } = useLingui();
  const instructor = resolveTimetableInstructor(
    config.instructors ?? [],
    instructorId,
  );
  const alternateName = instructor ? alternateInstructorName(instructor) : null;
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
  }, [config, allMeetings, instructorId, i18n.locale]);

  return (
    <div className="flex min-w-0 flex-col gap-1 text-sm">
      <DetailSection title={t`Instructor`} />
      <h2 className="text-lg font-semibold [overflow-wrap:anywhere]">
        {instructor ? localizedInstructorName(instructor) : instructorId}
      </h2>
      {alternateName ? (
        <DetailField label={t`Name`}>{alternateName}</DetailField>
      ) : null}
      {instructor?.position ? (
        <DetailField label={t`Position`}>{instructor.position}</DetailField>
      ) : null}
      {instructor?.email ? (
        <DetailField label={t`Email`}>
          <a className="link link-primary" href={`mailto:${instructor.email}`}>
            {instructor.email}
          </a>
        </DetailField>
      ) : null}
      {instructor?.alias ? (
        <DetailField label={t`Alias`}>{instructor.alias}</DetailField>
      ) : null}
      <DetailSection title={t`Classes this semester`} />
      {!series.length ? (
        <p className="text-base-content/60">
          <Trans>No assigned classes.</Trans>
        </p>
      ) : null}
      {series.map(([key, entries]) => {
        const classCount = entries.length;
        return (
          <details
            key={key}
            className="border-base-300 rounded-box border"
            open={entries.length === 1}
          >
            <summary className="hover:bg-base-200 rounded-box cursor-pointer p-3">
              <span className="font-medium">
                {meetingCourseTitle(entries[0].meeting)} ·{" "}
                {entries[0].meeting.tag}
              </span>
              <span className="text-base-content/60 ml-2 text-xs">
                <Plural value={classCount} one="# class" other="# classes" />
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
                    {entry.audienceLabel || t`No groups`} ·{" "}
                    {entry.meeting.room || t`No location`}
                  </span>
                </button>
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}
