import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import type { SchemaScheduleConfig } from "@/api/schedule-assistant/types.ts";
import { Modal } from "@/components/common/Modal.tsx";
import {
  SelectDropdown,
  type SelectDropdownChangeContext,
  type SelectDropdownOption,
} from "@/components/common/SelectDropdown.tsx";
import {
  useCoursesQuery,
  useUpdateCourseMutation,
} from "@/components/schedule-assistant/config/useConfig.tsx";
import type { TermWeekdayKey } from "@/components/schedule-assistant/settings/weekdays.ts";
import { useToast } from "@/components/toast";
import clsx from "clsx";
import {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  EditClassAudienceModal,
  EditClassAudienceSummaryRow,
} from "./EditClassAudienceModal.tsx";
import {
  buildAudienceSelectorTree,
  minimizeAudienceTokens,
} from "./audienceSelectorTree.ts";
import {
  applyMeetingEditsToCourse,
  CUSTOM_TIME_OPTION_VALUE,
  customTimeOptionLabel,
  formatAudienceTokensCompact,
  formatAudienceTokensLabel,
  getWeeklySlotFromMeeting,
  isMeetingAudienceOverridden,
  meetingAudienceEqual,
  meetingEditOriginalValues,
  meetingInstructorsLabel,
  meetingPatternBaseValues,
  normalizeTypedHhmm,
  parseMeetingInstanceId,
  parseTimeRangeQuery,
  perGroupAudienceOptions,
  resolveEndTimeForStart,
  timeOptionsForConfig,
  weekdayOptionsForConfig,
  type EditClassScope,
  type MeetingFieldEdits,
  type MeetingOriginalValues,
} from "./meetingEditUtils.ts";
import { MeetingOverrideIndicator } from "./meetingOverrideIndicator.tsx";
import {
  audienceSizeForTokens,
  buildRoomPickerOptions,
  roomPickerDatesForEdit,
} from "./roomPickerOptions.ts";
import { buildInstructorPickerOptions } from "./instructorPickerOptions.ts";
import type { MeetingPickerIndex } from "./meetingPickerIndex.ts";
import type { Meeting, MeetingOverrideField } from "./timetableViewerModel.ts";
import { semesterDatesForWeekday } from "./timetableViewerModel.ts";

const SCOPE_OPTIONS: { value: EditClassScope; label: string }[] = [
  { value: "single", label: "Только это занятие" },
  { value: "future", label: "Это и все следующие" },
  { value: "all", label: "Все занятия (включая прошлые)" },
];

function EditClassDropdown({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  trailingOption,
}: {
  value: string;
  onChange: (value: string, context?: SelectDropdownChangeContext) => void;
  options: SelectDropdownOption[];
  placeholder: string;
  disabled?: boolean;
  trailingOption?: (query: string) => SelectDropdownOption | null;
}) {
  return (
    <SelectDropdown
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      searchable
      trailingOption={trailingOption}
      className={clsx("w-full", disabled && "pointer-events-none opacity-50")}
      triggerClassName="w-full"
    />
  );
}

function EditClassField({
  label,
  changed,
  originalLabel,
  onRestoreOriginal,
  overridden,
  patternLabel,
  infoLabel,
  children,
}: {
  label: string;
  changed: boolean;
  originalLabel: string;
  onRestoreOriginal?: () => void;
  overridden?: boolean;
  patternLabel?: string;
  infoLabel?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "flex flex-col gap-1 rounded-lg",
        changed && "bg-warning/10 ring-warning/40 px-2 py-1.5 ring-2",
        !changed && overridden && "bg-info/10 ring-info/40 px-2 py-1.5 ring-2",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{label}</span>
        {changed ? (
          <span className="badge badge-warning badge-sm">изменено</span>
        ) : overridden ? (
          <span className="badge badge-info badge-sm">переопр.</span>
        ) : (
          <span className="text-base-content/50 text-xs">без изменений</span>
        )}
      </div>
      {changed ? (
        <div className="text-base-content/60 text-xs">
          Было:{" "}
          <button
            type="button"
            className="text-base-content/80 hover:text-base-content cursor-pointer underline decoration-dotted underline-offset-2"
            onClick={onRestoreOriginal}
          >
            {originalLabel}
          </button>
        </div>
      ) : null}
      {!changed && overridden && patternLabel ? (
        <div className="text-base-content/60 text-xs">
          В шаблоне: {patternLabel}
        </div>
      ) : null}
      {infoLabel ? (
        <div className="text-base-content/60 text-xs">{infoLabel}</div>
      ) : null}
      {children}
    </div>
  );
}

function buildFieldEdits(
  originals: MeetingOriginalValues,
  roomValue: string,
  timeValue: string,
  endTimeValue: string,
  weekdayValue: string,
  instructorValue: string,
  audienceValue: string[],
  cancelChecked: boolean,
): MeetingFieldEdits {
  if (cancelChecked) return { cancel: true };

  const edits: MeetingFieldEdits = {};
  if (roomValue !== originals.room) edits.room = roomValue;
  if (timeValue !== originals.time || endTimeValue !== originals.endTime) {
    edits.time = timeValue;
    if (endTimeValue) edits.endTime = endTimeValue;
  }
  if (weekdayValue !== originals.weekday)
    edits.weekday = weekdayValue as TermWeekdayKey;
  if (instructorValue !== originals.instructor) {
    edits.instructor = instructorValue;
  }
  if (!meetingAudienceEqual(audienceValue, originals.audience)) {
    edits.audience = audienceValue;
  }
  return edits;
}

function hasMeetingEdits(edits: MeetingFieldEdits) {
  if (edits.cancel) return true;
  return (
    edits.room !== undefined ||
    edits.time !== undefined ||
    edits.endTime !== undefined ||
    edits.weekday !== undefined ||
    edits.instructor !== undefined ||
    edits.audience !== undefined
  );
}

export function EditClassModal({
  open,
  onOpenChange,
  meeting,
  config,
  meetings,
  meetingPickerIndex,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: Meeting | null;
  config: SchemaScheduleConfig;
  meetings: Meeting[];
  meetingPickerIndex: MeetingPickerIndex;
}) {
  const { data: courses } = useCoursesQuery();
  const { mutate, isPending } = useUpdateCourseMutation();
  const { showError, showSuccess } = useToast();
  const [scope, setScope] = useState<EditClassScope>("single");
  const [roomValue, setRoomValue] = useState("");
  const [timeValue, setTimeValue] = useState("");
  const [endTimeValue, setEndTimeValue] = useState("");
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [weekdayValue, setWeekdayValue] = useState("");
  const [instructorValue, setInstructorValue] = useState("");
  const [audienceValue, setAudienceValue] = useState<string[]>([]);
  const [cancelChecked, setCancelChecked] = useState(false);
  const [audienceModalOpen, setAudienceModalOpen] = useState(false);
  const [pickerOptionsReady, setPickerOptionsReady] = useState(false);

  const meetingRef = useMemo(
    () => (meeting ? parseMeetingInstanceId(meeting.instance_id) : null),
    [meeting],
  );

  const meetingComponent = useMemo(() => {
    if (!meeting || !courses || !meetingRef) return null;
    const course = courses.find((item) => item.name === meeting.course);
    return course?.components?.[meetingRef.componentIdx] ?? null;
  }, [courses, meeting, meetingRef]);

  const meetingSeries = useMemo(() => {
    if (!meetingComponent || !meetingRef) return null;
    return meetingComponent.sessions?.[meetingRef.seriesIdx] ?? null;
  }, [meetingComponent, meetingRef]);

  const originals = useMemo(() => {
    if (!meeting) return null;
    return meetingEditOriginalValues(meeting, meetingComponent, meetingSeries);
  }, [meeting, meetingComponent, meetingSeries]);

  const perGroup = meetingComponent?.per_group ?? false;

  const perGroupOptions = useMemo(() => {
    if (!meetingComponent) return [];
    return perGroupAudienceOptions(config, meetingComponent);
  }, [config, meetingComponent]);

  const timeOptions = useMemo(
    () =>
      timeOptionsForConfig(
        config,
        audienceValue.length ? audienceValue : meeting?.groups,
      ),
    [audienceValue, config, meeting?.groups],
  );
  const weekdayOptions = useMemo(
    () => weekdayOptionsForConfig(config),
    [config],
  );

  useEffect(() => {
    if (!open) return;
    setPickerOptionsReady(false);
    let cancelled = false;
    let innerFrame = 0;
    const outerFrame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => {
        startTransition(() => {
          if (!cancelled) setPickerOptionsReady(true);
        });
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(outerFrame);
      cancelAnimationFrame(innerFrame);
    };
  }, [open, meeting?.instance_id]);

  const lastRoomOptionsRef = useRef<SelectDropdownOption[]>([]);
  const lastInstructorOptionsRef = useRef<SelectDropdownOption[]>([]);

  const roomOptions = useMemo(() => {
    if (!meeting) {
      lastRoomOptionsRef.current = [];
      return [];
    }
    // Keep last options while the close transition is still mounted.
    if (!open) return lastRoomOptionsRef.current;
    const weekday = (weekdayValue ||
      originals?.weekday ||
      "Mon") as TermWeekdayKey;
    const audienceTokens = audienceValue.length
      ? audienceValue
      : meeting.groups;
    const start = useCustomTime
      ? normalizeTypedHhmm(timeValue)
      : timeValue.trim();
    const end = useCustomTime
      ? normalizeTypedHhmm(endTimeValue)
      : endTimeValue.trim() ||
        (start
          ? resolveEndTimeForStart(config, start, audienceTokens).slice(0, 5)
          : "");
    const dates = roomPickerDatesForEdit({
      config,
      weekday,
    });
    const next = buildRoomPickerOptions({
      config,
      meetings,
      index: meetingPickerIndex,
      date: meeting.date,
      dates: dates.length ? dates : [meeting.date],
      start,
      end: end || undefined,
      audienceTokens,
      excludeInstanceId: meeting.instance_id,
      excludeRef: meetingRef,
      includeRoomIds: meeting.room ? [meeting.room] : undefined,
      includeStatus: pickerOptionsReady,
    });
    lastRoomOptionsRef.current = next;
    return next;
  }, [
    audienceValue,
    config,
    endTimeValue,
    meeting,
    meetingPickerIndex,
    meetingRef,
    meetings,
    open,
    originals?.weekday,
    pickerOptionsReady,
    timeValue,
    useCustomTime,
    weekdayValue,
  ]);

  const audienceSize = useMemo(
    () => audienceSizeForTokens(config, audienceValue),
    [audienceValue, config],
  );

  const instructorOptions = useMemo(() => {
    if (!meeting) {
      lastInstructorOptionsRef.current = [];
      return [];
    }
    if (!open) return lastInstructorOptionsRef.current;
    const currentInstructor = String(
      typeof meeting.instructors === "string"
        ? meeting.instructors
        : meeting.instructors?.[0] || "",
    ).trim();
    const course = courses?.find((item) => item.name === meeting.course);
    const weekday = (weekdayValue ||
      originals?.weekday ||
      "Mon") as TermWeekdayKey;
    const audienceTokens = audienceValue.length
      ? audienceValue
      : meeting.groups;
    const start = useCustomTime
      ? normalizeTypedHhmm(timeValue)
      : timeValue.trim();
    const end = useCustomTime
      ? normalizeTypedHhmm(endTimeValue)
      : endTimeValue.trim() ||
        (start
          ? resolveEndTimeForStart(config, start, audienceTokens).slice(0, 5)
          : "");
    const dates = semesterDatesForWeekday(config, weekday);
    const next = buildInstructorPickerOptions({
      config,
      meetings,
      index: meetingPickerIndex,
      date: meeting.date,
      dates: dates.length ? dates : [meeting.date],
      start,
      end: end || undefined,
      weekday,
      courseInstructors: course?.instructors,
      excludeInstanceId: meeting.instance_id,
      excludeRef: meetingRef,
      includeInstructorIds: currentInstructor ? [currentInstructor] : undefined,
      includeStatus: pickerOptionsReady,
    });
    lastInstructorOptionsRef.current = next;
    return next;
  }, [
    audienceValue,
    config,
    courses,
    endTimeValue,
    meeting,
    meetingPickerIndex,
    meetingRef,
    meetings,
    open,
    originals?.weekday,
    pickerOptionsReady,
    timeValue,
    useCustomTime,
    weekdayValue,
  ]);

  const patternBase = useMemo(() => {
    if (!meeting) return null;
    const slot = getWeeklySlotFromMeeting(courses, meeting);
    if (!slot) return null;
    return meetingPatternBaseValues(slot);
  }, [courses, meeting]);

  const overrideFields = meeting?.override_fields;

  useEffect(() => {
    if (!open || !meeting || !originals) return;
    setScope("single");
    setRoomValue(originals.room);
    setTimeValue(originals.time);
    setEndTimeValue(originals.endTime);
    const isPreset = timeOptionsForConfig(config, meeting.groups).some(
      (slot) =>
        slot.value === originals.time &&
        (!originals.endTime || slot.end === originals.endTime),
    );
    setUseCustomTime(!isPreset && !!originals.time);
    setWeekdayValue(originals.weekday);
    setInstructorValue(originals.instructor);
    setAudienceValue(
      minimizeAudienceTokens(
        [...originals.audience],
        buildAudienceSelectorTree(config),
      ),
    );
    setCancelChecked(false);
  }, [config, meeting, open, originals]);

  function handleClose() {
    if (isPending) return;
    setAudienceModalOpen(false);
    onOpenChange(false);
  }

  function handleSubmit() {
    if (!meeting || !meetingRef || !courses || !originals) return;
    const course = courses.find((item) => item.name === meeting.course);
    if (!course) {
      showError("Ошибка", "Курс не найден в конфигурации.");
      return;
    }

    const submitStart = useCustomTime
      ? normalizeTypedHhmm(timeValue)
      : timeValue.trim();
    const submitEnd = useCustomTime
      ? normalizeTypedHhmm(endTimeValue)
      : endTimeValue.trim();

    if (!cancelChecked) {
      if (!roomValue.trim()) {
        showError("Ошибка", "Выберите аудиторию.");
        return;
      }
      if (!submitStart) {
        showError("Ошибка", "Выберите время.");
        return;
      }
      if (useCustomTime) {
        if (!submitEnd) {
          showError("Ошибка", "Укажите время окончания.");
          return;
        }
        if (
          !/^\d{2}:\d{2}$/.test(submitStart) ||
          !/^\d{2}:\d{2}$/.test(submitEnd)
        ) {
          showError(
            "Ошибка",
            "Время должно быть в формате ЧЧ:ММ (например 09:00).",
          );
          return;
        }
      }
      if (!weekdayValue.trim()) {
        showError("Ошибка", "Выберите день недели.");
        return;
      }
      if (!instructorValue.trim()) {
        showError("Ошибка", "Выберите преподавателя.");
        return;
      }
      if (!audienceValue.length) {
        showError(
          "Ошибка",
          perGroup ? "Выберите группу." : "Укажите хотя бы одну группу.",
        );
        return;
      }
    }

    const edits = buildFieldEdits(
      originals,
      roomValue,
      submitStart,
      submitEnd,
      weekdayValue,
      instructorValue,
      audienceValue,
      cancelChecked,
    );

    if (!hasMeetingEdits(edits)) {
      showError("Ошибка", "Нет изменений для сохранения.");
      return;
    }

    const updatedCourse = applyMeetingEditsToCourse(
      course,
      meetingRef,
      meeting,
      config,
      scope,
      edits,
    );
    if (!updatedCourse) {
      showError("Ошибка", "Не удалось применить изменение к занятию.");
      return;
    }

    mutate(
      {
        params: { path: { course_name: course.name } },
        body: updatedCourse,
      },
      {
        onSuccess: () => {
          showSuccess("Сохранено", "Изменения занятия применены.");
          handleClose();
        },
        onError: (error) => {
          showError("Ошибка сохранения", formatApiErrorMessage(error));
        },
      },
    );
  }

  if (!meeting || !originals) return null;

  const instructorsLabel = meetingInstructorsLabel(meeting.instructors);
  const title = `${meeting.course} (${meeting.tag})`;

  const roomChanged = !cancelChecked && roomValue !== originals.room;
  const timeChanged =
    !cancelChecked &&
    (timeValue !== originals.time || endTimeValue !== originals.endTime);
  const weekdayChanged = !cancelChecked && weekdayValue !== originals.weekday;
  const instructorChanged =
    !cancelChecked && instructorValue !== originals.instructor;
  const audienceChanged =
    !cancelChecked && !meetingAudienceEqual(audienceValue, originals.audience);

  const originalRoomLabel = originals.room || "—";
  const originalTimeLabel =
    timeOptions.find(
      (slot) =>
        slot.value === originals.time &&
        (!originals.endTime || slot.end === originals.endTime),
    )?.label ||
    (originals.endTime
      ? `${originals.time}–${originals.endTime}`
      : originals.time) ||
    "—";
  const originalWeekdayLabel =
    weekdayOptions.find((day) => day.key === originals.weekday)?.label ||
    originals.weekday;
  const originalInstructorLabel =
    instructorOptions.find((item) => item.value === originals.instructor)
      ?.label ||
    originals.instructor ||
    "—";
  const originalAudienceLabel = formatAudienceTokensLabel(
    config,
    originals.audience,
  );
  const audienceDisplayLabel = formatAudienceTokensLabel(config, audienceValue);

  const fieldEdits = buildFieldEdits(
    originals,
    roomValue,
    timeValue,
    endTimeValue,
    weekdayValue,
    instructorValue,
    audienceValue,
    cancelChecked,
  );
  const canSave = hasMeetingEdits(fieldEdits);

  function isFieldOverridden(field: MeetingOverrideField) {
    return overrideFields?.includes(field) ?? false;
  }

  function patternRoomLabel() {
    if (!patternBase) return "";
    return patternBase.room || "—";
  }

  function patternTimeLabel() {
    if (!patternBase) return "";
    return (
      timeOptions.find((slot) => slot.value === patternBase.time)?.label ||
      patternBase.time ||
      "—"
    );
  }

  function patternWeekdayLabel() {
    if (!patternBase) return "";
    return (
      weekdayOptions.find((day) => day.key === patternBase.weekday)?.label ||
      patternBase.weekday
    );
  }

  function patternInstructorLabel() {
    if (!patternBase) return "";
    return (
      instructorOptions.find((item) => item.value === patternBase.instructor)
        ?.label ||
      patternBase.instructor ||
      "—"
    );
  }

  function patternAudienceLabel() {
    if (!meetingComponent) return "";
    return formatAudienceTokensCompact(meetingComponent.student_groups || []);
  }

  const groupsOverridden = isMeetingAudienceOverridden(
    config,
    meetingComponent,
    meetingSeries,
  );

  const componentAudienceLabel = patternAudienceLabel();

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
        else onOpenChange(next);
      }}
      title="Редактировать занятие"
      closeOnOutsidePress={!isPending && !audienceModalOpen}
      containerClassName="max-w-2xl"
    >
      <div className="flex flex-col gap-3">
        <div className="rounded-box border-base-300 bg-base-100 border px-3 py-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-medium">{title}</div>
            <MeetingOverrideIndicator fields={overrideFields} />
          </div>
          <div className="text-base-content/70 mt-1">
            {meeting.date} {meeting.start}
            {meeting.room ? ` · ${meeting.room}` : ""}
            {instructorsLabel ? ` · ${instructorsLabel}` : ""}
          </div>
        </div>

        {perGroup ? null : (
          <>
            <EditClassAudienceSummaryRow
              config={config}
              tokens={audienceValue}
              displayLabel={audienceDisplayLabel}
              disabled={cancelChecked}
              changed={audienceChanged}
              originalLabel={originalAudienceLabel}
              onRestoreOriginal={() =>
                setAudienceValue(
                  minimizeAudienceTokens(
                    [...originals.audience],
                    buildAudienceSelectorTree(config),
                  ),
                )
              }
              overridden={groupsOverridden}
              patternLabel={componentAudienceLabel}
              onEdit={() => setAudienceModalOpen(true)}
            />
            <EditClassAudienceModal
              open={audienceModalOpen}
              onOpenChange={setAudienceModalOpen}
              config={config}
              tokens={audienceValue}
              originalTokens={originals.audience}
              originalLabel={originalAudienceLabel}
              onSave={setAudienceValue}
            />
          </>
        )}

        <div className="flex flex-col gap-3">
          {perGroup ? (
            <EditClassField
              label={
                audienceSize != null
                  ? `Группа · ${audienceSize} студ.`
                  : "Группа"
              }
              changed={audienceChanged}
              originalLabel={originalAudienceLabel}
              onRestoreOriginal={() =>
                setAudienceValue(
                  minimizeAudienceTokens(
                    [...originals.audience],
                    buildAudienceSelectorTree(config),
                  ),
                )
              }
              infoLabel={
                componentAudienceLabel
                  ? `В компоненте: ${componentAudienceLabel}`
                  : undefined
              }
            >
              <EditClassDropdown
                value={audienceValue[0] || ""}
                onChange={(group) => setAudienceValue(group ? [group] : [])}
                placeholder="Выберите группу"
                disabled={cancelChecked}
                options={perGroupOptions}
              />
            </EditClassField>
          ) : null}
          <EditClassField
            label="Аудитория"
            changed={roomChanged}
            originalLabel={originalRoomLabel}
            onRestoreOriginal={() => setRoomValue(originals.room)}
            overridden={isFieldOverridden("room")}
            patternLabel={patternRoomLabel()}
          >
            <EditClassDropdown
              value={roomValue}
              onChange={setRoomValue}
              placeholder="Выберите аудиторию"
              disabled={cancelChecked}
              options={roomOptions}
            />
          </EditClassField>

          <EditClassField
            label="Время"
            changed={timeChanged}
            originalLabel={originalTimeLabel}
            onRestoreOriginal={() => {
              setTimeValue(originals.time);
              setEndTimeValue(originals.endTime);
              const isPreset = timeOptions.some(
                (slot) =>
                  slot.value === originals.time &&
                  (!originals.endTime || slot.end === originals.endTime),
              );
              setUseCustomTime(!isPreset && !!originals.time);
            }}
            overridden={isFieldOverridden("time")}
            patternLabel={patternTimeLabel()}
          >
            <EditClassDropdown
              value={useCustomTime ? CUSTOM_TIME_OPTION_VALUE : timeValue}
              onChange={(value, context) => {
                if (value === CUSTOM_TIME_OPTION_VALUE) {
                  setUseCustomTime(true);
                  const parsed = parseTimeRangeQuery(
                    context?.searchQuery ?? "",
                  );
                  if (parsed.start) setTimeValue(parsed.start);
                  if (parsed.end) setEndTimeValue(parsed.end);
                  return;
                }
                setUseCustomTime(false);
                setTimeValue(value);
                const preset = timeOptions.find((slot) => slot.value === value);
                setEndTimeValue(preset?.end || "");
              }}
              placeholder="Выберите время"
              disabled={cancelChecked}
              trailingOption={(query) => ({
                value: CUSTOM_TIME_OPTION_VALUE,
                label: customTimeOptionLabel(query),
              })}
              options={timeOptions.map((slot) => ({
                value: slot.value,
                label: slot.label,
              }))}
            />
            {useCustomTime && !cancelChecked ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="09:00"
                  className="input input-bordered input-sm w-24 font-mono"
                  value={timeValue}
                  onChange={(event) => setTimeValue(event.target.value)}
                  onBlur={() => setTimeValue(normalizeTypedHhmm(timeValue))}
                />
                <span className="text-base-content/50 shrink-0">–</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="14:30"
                  className="input input-bordered input-sm w-24 font-mono"
                  value={endTimeValue}
                  onChange={(event) => setEndTimeValue(event.target.value)}
                  onBlur={() =>
                    setEndTimeValue(normalizeTypedHhmm(endTimeValue))
                  }
                />
              </div>
            ) : null}
          </EditClassField>

          <EditClassField
            label="День недели"
            changed={weekdayChanged}
            originalLabel={originalWeekdayLabel}
            onRestoreOriginal={() => setWeekdayValue(originals.weekday)}
            overridden={isFieldOverridden("weekday")}
            patternLabel={patternWeekdayLabel()}
          >
            <EditClassDropdown
              value={weekdayValue}
              onChange={setWeekdayValue}
              placeholder="Выберите день"
              disabled={cancelChecked}
              options={weekdayOptions.map((day) => ({
                value: day.key,
                label: day.label,
              }))}
            />
          </EditClassField>

          <EditClassField
            label="Преподаватель"
            changed={instructorChanged}
            originalLabel={originalInstructorLabel}
            onRestoreOriginal={() => setInstructorValue(originals.instructor)}
            overridden={isFieldOverridden("instructor")}
            patternLabel={patternInstructorLabel()}
          >
            <EditClassDropdown
              value={instructorValue}
              onChange={setInstructorValue}
              placeholder="Выберите преподавателя"
              disabled={cancelChecked}
              options={instructorOptions}
            />
          </EditClassField>

          <div
            className={clsx(
              "flex flex-col gap-1 rounded-lg",
              cancelChecked && "bg-error/10 ring-error/40 px-2 py-1.5 ring-2",
            )}
          >
            <label className="label cursor-pointer justify-start gap-2 px-0 py-0">
              <input
                type="checkbox"
                className="checkbox checkbox-sm checkbox-error"
                checked={cancelChecked}
                onChange={(event) => setCancelChecked(event.target.checked)}
              />
              <span className="text-sm font-medium">Отменить занятие</span>
              {cancelChecked ? (
                <span className="badge badge-error badge-sm">изменено</span>
              ) : (
                <span className="text-base-content/50 text-xs">
                  без изменений
                </span>
              )}
            </label>
            {cancelChecked ? (
              <div className="text-base-content/60 text-xs">
                Занятие будет отменено для выбранного диапазона.
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Применить к</span>
          <div className="flex flex-col gap-1">
            {SCOPE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="label cursor-pointer justify-start gap-2 rounded-lg border border-transparent px-1 py-0.5"
              >
                <input
                  type="radio"
                  name="edit-class-scope"
                  className="radio radio-sm"
                  checked={scope === option.value}
                  onChange={() => setScope(option.value)}
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-1 flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={isPending}
            onClick={handleClose}
          >
            Закрыть
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={isPending || !canSave}
            onClick={handleSubmit}
          >
            {isPending ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              "Сохранить"
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
