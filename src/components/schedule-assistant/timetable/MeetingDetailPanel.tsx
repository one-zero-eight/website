import type {
  TimetableViewConfig as SchemaScheduleConfig,
  TimetableViewComponent as SchemaComponent,
} from "./timetableViewTypes.ts";
import {
  CourseComponentAccordionItem,
  CourseComponentDetailsFields,
  CourseComponentsAccordionList,
  DetailField,
  DetailSection,
  SeriesScheduleItemsList,
} from "@/components/schedule-assistant/courses/CourseComponentDetailsView.tsx";
import {
  useConfig,
  usePatchCourseMutation,
} from "@/components/schedule-assistant/config/useConfig.tsx";
import { ComponentEditModal } from "@/components/schedule-assistant/settings/courses/ComponentEditModal.tsx";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/ui/cn";
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
  meetingMetadataSubgridClass,
  meetingMetadataOverrideClass,
} from "./MeetingMetadata.tsx";
import {
  formatMeetingDateShort,
  formatMeetingInstructorsLabel,
  MeetingInstanceMetadata,
  shortMeetingWeekday,
} from "./MeetingInstanceMetadata.tsx";
import {
  buildInstructorLabelById,
  dayKey,
  everyWeekdayPhraseRu,
  resolveInstructorLabel,
  weekdayLabelRu,
  type Meeting,
} from "./timetableViewerModel.ts";

function MeetingDateListItem({
  meeting,
  config,
  instructorLabels,
}: {
  meeting: Meeting;
  config: SchemaScheduleConfig;
  instructorLabels: Record<string, string>;
}) {
  const instructors = formatMeetingInstructorsLabel(
    meeting.instructors,
    instructorLabels,
  );
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
                {formatMeetingDateShort(meeting.date)}
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
  if (ref?.kind === "wp")
    return meeting.alternation
      ? `Через неделю · ${weekdayLabelRu(weekday)}`
      : everyWeekdayPhraseRu(weekday);
  return weekdayLabelRu(weekday);
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
  canEdit,
}: {
  canEdit: boolean;
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
  const [editIndex, setEditIndex] = useState<number | null>(null);
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
          const hint = canEdit
            ? formatComponentProgressHint(config, sibling)
            : undefined;
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
                canEdit ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs btn-square"
                    title="Редактировать"
                    onClick={() => setEditIndex(idx)}
                  >
                    <span className="icon-[material-symbols--edit-outline-rounded] text-base" />
                  </button>
                ) : undefined
              }
            >
              <CourseComponentDetailsFields
                config={config}
                component={sibling}
                instructorLabelById={instructorLabelById}
                assignedInstructors={assigned}
                showAudienceAlways
                showPlanningDetails={canEdit}
                seriesItems={seriesNavItems}
                onNavigateToMeeting={onNavigateToMeeting}
                compact
              />
            </CourseComponentAccordionItem>
          );
        })}
      </CourseComponentsAccordionList>
      {canEdit && editIndex !== null ? (
        <EditableCourseComponent
          courseIndex={courseIdx}
          componentIndex={editIndex}
          onClose={() => setEditIndex(null)}
        />
      ) : null}
    </>
  );
}

function EditableCourseComponent({
  courseIndex,
  componentIndex,
  onClose,
}: {
  courseIndex: number;
  componentIndex: number;
  onClose: () => void;
}) {
  const { config } = useConfig();
  const course = config?.courses?.[courseIndex];
  const component = course?.components[componentIndex];
  const { patchCourse } = usePatchCourseMutation(course?.name);
  if (!config || !course || !component) return null;
  return (
    <ComponentEditModal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      config={config}
      courseIndex={courseIndex}
      componentIndex={componentIndex}
      component={component}
      tagOptions={(config.term.course_component_tags ?? []).filter(Boolean)}
      instructors={config.instructors ?? []}
      courseInstructors={course.instructors}
      onSave={(nextComponent) => {
        const components = [...course.components];
        components[componentIndex] = nextComponent;
        patchCourse({ components });
      }}
    />
  );
}

export function MeetingDetailPanel({
  meeting,
  config,
  allMeetings,
  onNavigateToMeeting,
  onEdit,
  onSelectInstructor,
}: {
  meeting: Meeting;
  config: SchemaScheduleConfig;
  allMeetings: Meeting[];
  onNavigateToMeeting: (meeting: Meeting) => void;
  onEdit?: () => void;
  onSelectInstructor?: (instructorId: string) => void;
}) {
  const instructorLabelById = buildInstructorLabelById(config);
  const { course } = resolveCourseAndComponent(config, meeting);
  const meetingRef = parseMeetingInstanceId(meeting.instance_id);

  const courseTitle = courseDisplayTitle(course, meeting);

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
      <div className="flex flex-col gap-0.5">
        <MeetingInstanceMetadata
          config={config}
          date={meeting.date}
          start={meeting.start}
          end={meeting.end}
          room={meeting.room}
          groups={meeting.groups}
          instructors={meeting.instructors}
          weekly={meetingRef?.kind === "wp"}
          scheduleTooltip={schedule}
          onSelectInstructor={onSelectInstructor}
        />
        <button
          type="button"
          className="text-base-content/60 hover:text-primary flex items-center gap-1.5 justify-self-start rounded-md text-xs transition-colors"
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
            className="min-w-0"
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

      {meeting.notes?.trim() ? (
        <>
          <DetailSection title="Заметка" />
          <p className="wrap-anywhere whitespace-pre-wrap">{meeting.notes}</p>
        </>
      ) : null}

      <DetailSection title="Предмет" />
      <DetailField label="Название" truncate>
        {courseTitle}
      </DetailField>
      <DetailField label="Короткое название" truncate>
        {courseShortName}
      </DetailField>
      {course?.moodle_url?.trim() ? (
        <DetailField label="Moodle">
          <a
            className="link link-primary wrap-anywhere"
            href={course.moodle_url.trim()}
            target="_blank"
            rel="noreferrer"
          >
            {course.moodle_url.trim()}
          </a>
        </DetailField>
      ) : null}
      <DetailField label="Преподаватели">
        {staff.length ? (
          <span className="flex flex-col gap-0.5">
            {staff.map((entry) => (
              <span key={`${entry.id}:${entry.role}`}>
                {onSelectInstructor ? (
                  <button
                    type="button"
                    className="hover:text-primary text-left underline decoration-dotted underline-offset-2"
                    onClick={() => onSelectInstructor(entry.id)}
                  >
                    {resolveInstructorLabel(entry.id, instructorLabelById)}
                  </button>
                ) : (
                  resolveInstructorLabel(entry.id, instructorLabelById)
                )}
                <span className="text-base-content/55"> · {entry.role}</span>
              </span>
            ))}
          </span>
        ) : (
          "—"
        )}
      </DetailField>
      <CourseComponentsAccordion
        canEdit={!!onEdit}
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
