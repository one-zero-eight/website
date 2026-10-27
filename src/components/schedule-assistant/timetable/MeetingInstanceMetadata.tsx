import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";
import Tooltip from "@/components/common/Tooltip.tsx";
import { MeetingAudienceInline } from "@/components/schedule-assistant/courses/CourseComponentDetailsView.tsx";

import {
  MeetingMetadataField,
  MeetingMetadataRow,
  meetingMetadataGridClass,
} from "./MeetingMetadata.tsx";
import type { TimetableViewConfig as SchemaScheduleConfig } from "./timetableViewTypes.ts";
import {
  buildInstructorLabelById,
  resolveInstructorLabel,
} from "./timetableViewerModel.ts";

export function formatMeetingDateShort(date: string) {
  const value = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    ...(value.getFullYear() !== new Date().getFullYear()
      ? { year: "numeric" as const }
      : {}),
  }).format(value);
}

export function shortMeetingWeekday(date: string) {
  return new Intl.DateTimeFormat("ru-RU", { weekday: "short" })
    .format(new Date(`${date}T12:00:00`))
    .replace(/^./u, (letter) => letter.toUpperCase());
}

export function formatMeetingInstructorsLabel(
  instructors: string | string[] | null | undefined,
  instructorLabelById: Record<string, string>,
) {
  const list =
    typeof instructors === "string"
      ? instructors.trim()
        ? [instructors]
        : []
      : (instructors ?? []);
  if (!list.length) return "—";
  return list
    .map((id) => resolveInstructorLabel(String(id), instructorLabelById))
    .join(", ");
}

/** Same 2×2 metadata grid as the detail sidebar (without «Показать даты»). */
export function MeetingInstanceMetadata({
  config,
  date,
  start,
  end,
  room,
  groups,
  instructors,
  weekly = false,
  scheduleTooltip,
  onSelectInstructor,
  showRoom = true,
  showInstructor = true,
  className,
}: {
  config: SchemaScheduleConfig;
  date?: string | null;
  start?: string | null;
  end?: string | null;
  room?: string | null;
  groups?: string[] | null;
  instructors?: string | string[] | null;
  weekly?: boolean;
  scheduleTooltip?: ReactNode;
  onSelectInstructor?: (instructorId: string) => void;
  showRoom?: boolean;
  showInstructor?: boolean;
  className?: string;
}) {
  const instructorLabelById = buildInstructorLabelById(config);
  const timeRange = end ? `${start || ""}–${end}` : start?.trim() || "—";
  const dateLabel = date ? formatMeetingDateShort(date) : "—";
  const weekdayLabel = date ? shortMeetingWeekday(date) : "";
  const roomLabel = String(room || "").trim() || "—";
  const instructorIds = (
    typeof instructors === "string"
      ? instructors.trim()
        ? [instructors]
        : []
      : (instructors ?? [])
  ).filter(Boolean);
  const instructorsLabel = formatMeetingInstructorsLabel(
    instructors,
    instructorLabelById,
  );

  const scheduleField = (
    <MeetingMetadataField
      kind="schedule"
      weekly={weekly}
      title="Дата и время"
      iconTooltip={
        scheduleTooltip
          ? (icon) => <Tooltip content={scheduleTooltip}>{icon}</Tooltip>
          : undefined
      }
    >
      {weekdayLabel ? `${weekdayLabel}, ` : ""}
      {dateLabel} {timeRange}
    </MeetingMetadataField>
  );

  const audienceField = (
    <MeetingMetadataField kind="audience" title="Группы">
      <MeetingAudienceInline config={config} groupIds={groups || []} />
    </MeetingMetadataField>
  );

  return (
    <div className={cn(meetingMetadataGridClass, "gap-y-0.5", className)}>
      <MeetingMetadataRow
        left={scheduleField}
        right={
          showRoom ? (
            <MeetingMetadataField kind="room" title="Локация">
              {roomLabel}
            </MeetingMetadataField>
          ) : undefined
        }
      />
      <MeetingMetadataRow
        left={audienceField}
        right={
          showInstructor ? (
            <MeetingMetadataField kind="instructor" title="Преподаватели">
              {onSelectInstructor && instructorIds.length ? (
                <span className="inline-flex flex-wrap gap-x-2">
                  {instructorIds.map((id) => (
                    <button
                      key={id}
                      type="button"
                      className="hover:text-primary text-left underline decoration-dotted underline-offset-2"
                      onClick={() => onSelectInstructor(id)}
                    >
                      {resolveInstructorLabel(id, instructorLabelById)}
                    </button>
                  ))}
                </span>
              ) : (
                instructorsLabel
              )}
            </MeetingMetadataField>
          ) : undefined
        }
      />
    </div>
  );
}
