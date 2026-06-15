import type {
  SchemaIssue,
  SchemaInstructor,
} from "@/api/schedule-assistant/types.ts";
import { useConfig } from "@/components/schedule-assistant/config/useConfig.tsx";
import {
  buildInstructorsById,
  extractMeetingsFromIssue,
  formatInstructorLabel,
  formatScheduledMeetingWhen,
  resolveMeetingInstanceId,
} from "@/components/schedule-assistant/checks/issueMeetings.ts";
import {
  getIssueMetric,
  getIssueSeverity,
  ISSUE_TYPE_HEADINGS,
} from "@/components/schedule-assistant/checks/checksModel.ts";
import { CHECKS_RETURN_FROM } from "@/components/schedule-assistant/checks/checksNavigation.ts";
import {
  buildCoursesToSections,
  buildMeetings,
  type Meeting,
} from "@/components/schedule-assistant/timetable/timetableViewerModel.ts";
import { cn } from "@/lib/ui/cn";
import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";

function uniqueMeetings(meetings: ReturnType<typeof extractMeetingsFromIssue>) {
  const seen = new Set<string>();
  const result: ReturnType<typeof extractMeetingsFromIssue> = [];
  for (const meeting of meetings) {
    const key = [
      meeting.course_name,
      meeting.component_tag,
      meeting.placement.kind,
      meeting.placement.kind === "occurrence"
        ? meeting.placement.date
        : meeting.placement.weekday,
      meeting.start_time,
      meeting.room ?? "",
      [...meeting.groups].sort().join(","),
    ].join("\0");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(meeting);
  }
  return result;
}

function MeetingNavigateButton({
  scheduled,
  allMeetings,
  instructorsById,
}: {
  scheduled: ReturnType<typeof extractMeetingsFromIssue>[number];
  allMeetings: Meeting[];
  instructorsById: Map<string, SchemaInstructor>;
}) {
  const navigate = useNavigate();
  const instanceId = resolveMeetingInstanceId(scheduled, allMeetings);
  const groupsLabel = scheduled.groups.join(" / ") || "—";
  const instructorLabel = formatInstructorLabel(
    scheduled.instructor,
    instructorsById,
  );

  const content = (
    <div className="flex min-w-0 flex-col gap-0.5 text-left">
      <span className="text-primary font-medium [overflow-wrap:anywhere]">
        {scheduled.course_name}
        {scheduled.component_tag ? ` (${scheduled.component_tag})` : ""}
      </span>
      <span className="text-base-content/80 text-sm">
        {formatScheduledMeetingWhen(scheduled)}
      </span>
      <span className="text-base-content/70 text-xs [overflow-wrap:anywhere]">
        {groupsLabel}
      </span>
      <span className="text-base-content/70 text-xs">{instructorLabel}</span>
    </div>
  );

  if (!instanceId) {
    return <div className="px-1 py-1">{content}</div>;
  }

  return (
    <button
      type="button"
      className="hover:bg-base-200/80 rounded-lg px-1 py-1 text-left transition-colors"
      onClick={() =>
        navigate({
          to: "/schedule-assistant/timetable",
          search: { meeting: instanceId, from: CHECKS_RETURN_FROM },
        })
      }
    >
      {content}
    </button>
  );
}

function InstructorNavigateButton({ instructorId }: { instructorId: string }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className="hover:bg-base-200/80 rounded-lg px-1 py-1 text-left transition-colors"
      onClick={() =>
        navigate({
          to: "/schedule-assistant/settings/$settingsTab",
          params: { settingsTab: "instructors" },
          search: { instructor: instructorId, from: CHECKS_RETURN_FROM },
        })
      }
    >
      <span className="text-primary font-medium [overflow-wrap:anywhere]">
        {instructorId}
      </span>
    </button>
  );
}

export function IssueListItem({ issue }: { issue: SchemaIssue }) {
  const { config } = useConfig();
  const severity = getIssueSeverity(issue);
  const metric = getIssueMetric(issue);

  const allMeetings = useMemo(() => {
    if (!config) return [];
    return buildMeetings(config, buildCoursesToSections(config));
  }, [config]);

  const instructorsById = useMemo(
    () => buildInstructorsById(config?.instructors),
    [config?.instructors],
  );

  const meetings = uniqueMeetings(extractMeetingsFromIssue(issue));

  return (
    <article className="border-base-300 border-b py-3 last:border-b-0">
      <div className="flex flex-wrap items-start gap-2">
        <h3 className="text-sm font-semibold">
          {ISSUE_TYPE_HEADINGS[issue.issue_type]}
        </h3>
        {metric && issue.issue_type !== "instructor_id" ? (
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-xs font-medium",
              severity === "warning"
                ? "border-warning/40 text-warning"
                : "border-error/40 text-error",
            )}
          >
            {metric}
          </span>
        ) : null}
      </div>

      {issue.issue_type === "instructor_id" ? (
        <div className="mt-2 flex flex-col gap-1">
          <InstructorNavigateButton instructorId={issue.instructor_id} />
          <p className="text-base-content/80 px-1 text-sm leading-relaxed">
            {issue.text}
          </p>
        </div>
      ) : meetings.length > 0 ? (
        <div className="mt-2 flex flex-col gap-1">
          {meetings.map((scheduled, index) => (
            <MeetingNavigateButton
              key={`${issue.issue_type}-${index}`}
              scheduled={scheduled}
              allMeetings={allMeetings}
              instructorsById={instructorsById}
            />
          ))}
        </div>
      ) : (
        <p className="text-base-content/80 mt-2 text-sm leading-relaxed">
          {issue.text}
        </p>
      )}
    </article>
  );
}
