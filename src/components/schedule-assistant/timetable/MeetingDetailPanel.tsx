import type {
  SchemaComponent,
  SchemaCourseConfig,
  SchemaScheduleConfig,
} from "@/api/schedule-assistant/types.ts";
import Tooltip from "@/components/common/Tooltip.tsx";
import { AudienceTreeInfoIcon } from "@/components/schedule-assistant/settings/courses/audienceTreeTooltip.tsx";
import { cn } from "@/lib/ui/cn";
import type { ReactNode } from "react";

import { summarizeMeetingAudience } from "./meetingAudienceSummary.ts";
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
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="border-base-300/70 text-base-content border-b py-1.5 text-sm leading-snug last:border-b-0">
      <span className="text-base-content/55 mr-1.5">{label}</span>
      <span className="[overflow-wrap:anywhere]">{children}</span>
    </div>
  );
}

function formatInstructorPool(
  pool: unknown[],
  instructorLabelById: Record<string, string>,
) {
  if (!pool?.length) return "—";
  return pool
    .map((entry) => {
      if (Array.isArray(entry)) {
        return `[${entry
          .map((id) => resolveInstructorLabel(String(id), instructorLabelById))
          .join(" + ")}]`;
      }
      return resolveInstructorLabel(String(entry), instructorLabelById);
    })
    .join(" · ");
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

function resolveCourseAndComponent(
  config: SchemaScheduleConfig,
  meeting: Meeting,
): {
  course: SchemaCourseConfig | null;
  component: SchemaComponent | null;
} {
  const ref = parseMeetingInstanceId(meeting.instance_id);
  const courses = config.courses ?? [];

  if (ref) {
    const course = courses[ref.courseIdx] ?? null;
    const component = course?.components?.[ref.componentIdx] ?? null;
    if (course && component) return { course, component };
  }

  const course =
    courses.find((item) => String(item.name || "") === meeting.course) ?? null;
  const component =
    course?.components?.find(
      (item) =>
        String(item.tag || "").trim() === String(meeting.tag || "").trim(),
    ) ?? null;
  return { course, component };
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

function MeetingScheduleKind({
  meeting,
  config,
}: {
  meeting: Meeting;
  config: SchemaScheduleConfig;
}) {
  const ref = parseMeetingInstanceId(meeting.instance_id);
  const weekday = dayKey(meeting.date);

  if (meeting.cancelled) {
    return <span className="badge badge-error badge-sm">Отменено</span>;
  }

  if (ref?.kind === "occ") {
    const dates = occurrenceDatesForMeeting(config, meeting);
    return (
      <Tooltip
        content={
          <div className="flex max-w-xs flex-col gap-0.5 text-xs leading-snug">
            {dates.map((date) => (
              <div key={date}>
                {date}, {weekdayLabelRu(dayKey(date))}
              </div>
            ))}
          </div>
        }
      >
        <span className="text-base-content cursor-help underline decoration-dotted decoration-2 underline-offset-2">
          На определенные даты
        </span>
      </Tooltip>
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

function MeetingAudienceBlock({
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

  return (
    <div className="flex flex-col gap-1.5">
      {programs.flatMap((program) => {
        if (program.full) {
          return [
            <div
              key={program.selector || program.title}
              className="border-base-300/80 rounded-box bg-base-200/25 border px-2.5 py-2"
            >
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  {program.title}
                </span>
                {program.selector ? (
                  <AudienceTreeInfoIcon
                    config={config}
                    selector={program.selector}
                    mode="program"
                  />
                ) : null}
              </div>
              <div className="text-base-content/50 mt-0.5 text-xs">
                вся программа
              </div>
            </div>,
          ];
        }

        const trackRows = program.tracks.flatMap((track) => {
          if (track.full) {
            return [
              <div
                key={track.selector + track.title}
                className="border-base-300/80 rounded-box bg-base-200/25 border px-2.5 py-2"
              >
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <span className="min-w-0 [overflow-wrap:anywhere]">
                    {track.title}
                  </span>
                  {track.selector ? (
                    <AudienceTreeInfoIcon
                      config={config}
                      selector={track.selector}
                      mode="track"
                    />
                  ) : null}
                </div>
                <div className="text-base-content/50 mt-0.5 text-xs">
                  {program.title}
                </div>
              </div>,
            ];
          }

          if (!track.groups.length) return [];

          return [
            <div
              key={`${track.selector}-groups`}
              className="border-base-300/80 rounded-box bg-base-200/25 border px-2.5 py-2"
            >
              <div className="text-sm font-medium [overflow-wrap:anywhere]">
                {track.groups.map((group) => group.title).join(", ")}
              </div>
              <div className="text-base-content/50 mt-0.5 text-xs [overflow-wrap:anywhere]">
                {track.title}, {program.title}
              </div>
            </div>,
          ];
        });

        const flatRows =
          program.flatGroups.length > 0
            ? [
                <div
                  key={`${program.programCode || "other"}-groups`}
                  className="border-base-300/80 rounded-box bg-base-200/25 border px-2.5 py-2"
                >
                  <div className="text-sm font-medium [overflow-wrap:anywhere]">
                    {program.flatGroups.map((group) => group.title).join(", ")}
                  </div>
                  {program.title ? (
                    <div className="text-base-content/50 mt-0.5 text-xs [overflow-wrap:anywhere]">
                      {program.title}
                    </div>
                  ) : null}
                </div>,
              ]
            : [];

        return [...trackRows, ...flatRows];
      })}
    </div>
  );
}

export function MeetingDetailPanel({
  meeting,
  config,
}: {
  meeting: Meeting;
  config: SchemaScheduleConfig;
}) {
  const instructorLabelById = buildInstructorLabelById(config);
  const { course, component } = resolveCourseAndComponent(config, meeting);

  const courseTitle =
    String(
      course?.name_ru ||
        course?.short_name_ru ||
        course?.name ||
        meeting.course_short_name ||
        meeting.course ||
        "",
    ).trim() || "—";
  const timeRange = meeting.end
    ? `${meeting.start}–${meeting.end}`
    : meeting.start || "—";
  const room = String(meeting.room || "").trim() || "—";
  const instructors = formatInstructors(
    meeting.instructors,
    instructorLabelById,
  );
  const pool = formatInstructorPool(
    meeting.instructor_pool || component?.instructor_pool || [],
    instructorLabelById,
  );
  const audienceSelectors = (component?.student_groups ?? [])
    .map((token) => String(token || "").trim())
    .filter(Boolean);

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
      <DetailField label="Повтор">
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <MeetingScheduleKind meeting={meeting} config={config} />
          <MeetingOverrideIndicator fields={meeting.override_fields} />
        </span>
      </DetailField>
      <DetailField label="Аудитория">{room}</DetailField>
      <DetailField label="Преподаватель">{instructors}</DetailField>

      <DetailSection title="Группы" />
      <MeetingAudienceBlock config={config} groupIds={meeting.groups || []} />

      <DetailSection title="Компонент и предмет" />
      <DetailField label="Предмет">{courseTitle}</DetailField>
      <DetailField label="Компонент">
        {String(component?.tag || meeting.tag || "").trim() || "—"}
      </DetailField>
      {audienceSelectors.length ? (
        <DetailField label="Аудитория в конфиге">
          <span className="inline-flex flex-wrap items-center gap-1.5">
            {audienceSelectors.map((selector) => (
              <span
                key={selector}
                className={cn(
                  "bg-base-200 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs",
                )}
              >
                {selector}
                {selector.startsWith("@") ? (
                  <AudienceTreeInfoIcon
                    config={config}
                    selector={selector}
                    mode={selector.includes("/") ? "track" : "program"}
                  />
                ) : null}
              </span>
            ))}
          </span>
        </DetailField>
      ) : null}
      <DetailField label="Пул преподавателей">{pool}</DetailField>
      {course?.short_name ? (
        <DetailField label="Код">{course.short_name}</DetailField>
      ) : null}
    </div>
  );
}
