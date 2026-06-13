import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import type { SchemaScheduleConfig } from "@/api/schedule-assistant/types.ts";
import { Modal } from "@/components/common/Modal.tsx";
import {
  useCoursesQuery,
  useUpdateCourseMutation,
} from "@/components/schedule-assistant/config/useConfig.tsx";
import type { TermWeekdayKey } from "@/components/schedule-assistant/settings/weekdays.ts";
import { useToast } from "@/components/toast";
import clsx from "clsx";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import {
  applyMeetingEditsToCourse,
  meetingInstructorsLabel,
  meetingOriginalValues,
  parseMeetingInstanceId,
  timeOptionsForConfig,
  weekdayOptionsForConfig,
  type EditClassScope,
  type MeetingFieldEdits,
  type MeetingOriginalValues,
} from "./meetingEditUtils.ts";
import type { Meeting } from "./timetableViewerModel.ts";

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
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  disabled?: boolean;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const currentLabel =
    options.find((option) => option.value === value)?.label ?? placeholder;

  function handleOptionClick(nextValue: string) {
    onChange(nextValue);
    if (detailsRef.current) detailsRef.current.open = false;
  }

  return (
    <details
      ref={detailsRef}
      className={clsx(
        "dropdown w-full",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <summary className="select select-bordered select-xs flex h-8 min-h-8 w-full cursor-pointer list-none items-center justify-between px-3 text-sm font-normal [&::-webkit-details-marker]:hidden">
        <span className={clsx("truncate", !value && "text-base-content/50")}>
          {currentLabel}
        </span>
        <span className="icon-[material-symbols--expand-more] shrink-0 text-base" />
      </summary>
      <ul className="dropdown-content border-base-300 bg-base-100 rounded-box mt-1 max-h-56 w-full overflow-y-auto border p-1 shadow-sm">
        {options.map((option) => (
          <li key={option.value}>
            <button
              type="button"
              className={clsx(
                "hover:bg-base-200 w-full rounded-md px-2 py-1.5 text-left text-sm",
                value === option.value && "bg-base-200 font-semibold",
              )}
              onClick={() => handleOptionClick(option.value)}
            >
              {option.label}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}

function EditClassField({
  label,
  changed,
  originalLabel,
  children,
}: {
  label: string;
  changed: boolean;
  originalLabel: string;
  children: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "flex flex-col gap-1 rounded-lg",
        changed && "bg-warning/10 ring-warning/40 px-2 py-1.5 ring-2",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{label}</span>
        {changed ? (
          <span className="badge badge-warning badge-sm">изменено</span>
        ) : (
          <span className="text-base-content/50 text-xs">без изменений</span>
        )}
      </div>
      {changed ? (
        <div className="text-base-content/60 text-xs">
          Было: {originalLabel}
        </div>
      ) : null}
      {children}
    </div>
  );
}

function buildFieldEdits(
  originals: MeetingOriginalValues,
  roomValue: string,
  timeValue: string,
  weekdayValue: string,
  instructorValue: string,
  cancelChecked: boolean,
): MeetingFieldEdits {
  if (cancelChecked) return { cancel: true };

  const edits: MeetingFieldEdits = {};
  if (roomValue !== originals.room) edits.room = roomValue;
  if (timeValue !== originals.time) edits.time = timeValue;
  if (weekdayValue !== originals.weekday)
    edits.weekday = weekdayValue as TermWeekdayKey;
  if (instructorValue !== originals.instructor) {
    edits.instructor = instructorValue;
  }
  return edits;
}

function hasMeetingEdits(edits: MeetingFieldEdits) {
  if (edits.cancel) return true;
  return (
    edits.room !== undefined ||
    edits.time !== undefined ||
    edits.weekday !== undefined ||
    edits.instructor !== undefined
  );
}

export function EditClassModal({
  open,
  onOpenChange,
  meeting,
  config,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: Meeting | null;
  config: SchemaScheduleConfig;
}) {
  const { data: courses } = useCoursesQuery();
  const { mutate, isPending } = useUpdateCourseMutation();
  const { showError, showSuccess } = useToast();
  const [scope, setScope] = useState<EditClassScope>("single");
  const [roomValue, setRoomValue] = useState("");
  const [timeValue, setTimeValue] = useState("");
  const [weekdayValue, setWeekdayValue] = useState("");
  const [instructorValue, setInstructorValue] = useState("");
  const [cancelChecked, setCancelChecked] = useState(false);

  const meetingRef = useMemo(
    () => (meeting ? parseMeetingInstanceId(meeting.instance_id) : null),
    [meeting],
  );

  const originals = useMemo(
    () => (meeting ? meetingOriginalValues(meeting) : null),
    [meeting],
  );

  const timeOptions = useMemo(() => timeOptionsForConfig(config), [config]);
  const weekdayOptions = useMemo(
    () => weekdayOptionsForConfig(config),
    [config],
  );
  const roomOptions = useMemo(() => {
    const ids = (config.rooms || [])
      .map((room) => String(room.id || "").trim())
      .filter(Boolean);
    const currentRoom = String(meeting?.room || "").trim();
    if (currentRoom && !ids.includes(currentRoom)) ids.push(currentRoom);
    return ids.sort((a, b) => a.localeCompare(b, "ru"));
  }, [config.rooms, meeting?.room]);
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const instructorOptions = useMemo(() => {
    const items = (config.instructors || [])
      .map((instructor) => ({
        id: String(instructor.id || "").trim(),
        label:
          instructor.name_ru ||
          instructor.name_en ||
          instructor.email ||
          instructor.id,
      }))
      .filter((item) => item.id);
    const currentInstructor = String(
      typeof meeting?.instructors === "string"
        ? meeting.instructors
        : meeting?.instructors?.[0] || "",
    ).trim();
    if (
      currentInstructor &&
      !items.some((item) => item.id === currentInstructor)
    ) {
      items.push({ id: currentInstructor, label: currentInstructor });
    }
    return items;
  }, [config.instructors, meeting?.instructors]);

  useEffect(() => {
    if (!open || !meeting || !originals) return;
    setScope("single");
    setRoomValue(originals.room);
    setTimeValue(originals.time);
    setWeekdayValue(originals.weekday);
    setInstructorValue(originals.instructor);
    setCancelChecked(false);
  }, [meeting, open, originals]);

  function handleClose() {
    if (isPending) return;
    onOpenChange(false);
  }

  function handleSubmit() {
    if (!meeting || !meetingRef || !courses || !originals) return;
    const course = courses.find((item) => item.name === meeting.course);
    if (!course) {
      showError("Ошибка", "Курс не найден в конфигурации.");
      return;
    }

    const edits = buildFieldEdits(
      originals,
      roomValue,
      timeValue,
      weekdayValue,
      instructorValue,
      cancelChecked,
    );

    if (!hasMeetingEdits(edits)) {
      showError("Ошибка", "Нет изменений для сохранения.");
      return;
    }

    if (!cancelChecked) {
      if (!roomValue.trim()) {
        showError("Ошибка", "Выберите аудиторию.");
        return;
      }
      if (!timeValue.trim()) {
        showError("Ошибка", "Выберите время.");
        return;
      }
      if (!weekdayValue.trim()) {
        showError("Ошибка", "Выберите день недели.");
        return;
      }
      if (!instructorValue.trim()) {
        showError("Ошибка", "Выберите преподавателя.");
        return;
      }
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
  const timeChanged = !cancelChecked && timeValue !== originals.time;
  const weekdayChanged = !cancelChecked && weekdayValue !== originals.weekday;
  const instructorChanged =
    !cancelChecked && instructorValue !== originals.instructor;

  const originalRoomLabel = originals.room || "—";
  const originalTimeLabel =
    timeOptions.find((slot) => slot.value === originals.time)?.label ||
    originals.time ||
    "—";
  const originalWeekdayLabel =
    weekdayOptions.find((day) => day.key === originals.weekday)?.label ||
    originals.weekday;
  const originalInstructorLabel =
    instructorOptions.find((item) => item.id === originals.instructor)?.label ||
    originals.instructor ||
    "—";

  const fieldEdits = buildFieldEdits(
    originals,
    roomValue,
    timeValue,
    weekdayValue,
    instructorValue,
    cancelChecked,
  );
  const canSave = hasMeetingEdits(fieldEdits);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
        else onOpenChange(next);
      }}
      title="Редактировать занятие"
      closeOnOutsidePress={!isPending}
      containerClassName="max-w-xl"
    >
      <div className="flex flex-col gap-3">
        <div className="rounded-box border-base-300 bg-base-100 border px-3 py-2 text-sm">
          <div className="font-medium">{title}</div>
          <div className="text-base-content/70 mt-1">
            {meeting.date} {meeting.start}
            {meeting.room ? ` · ${meeting.room}` : ""}
            {instructorsLabel ? ` · ${instructorsLabel}` : ""}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <EditClassField
            label="Аудитория"
            changed={roomChanged}
            originalLabel={originalRoomLabel}
          >
            <EditClassDropdown
              value={roomValue}
              onChange={setRoomValue}
              placeholder="Выберите аудиторию"
              disabled={cancelChecked}
              options={roomOptions.map((roomId) => ({
                value: roomId,
                label: roomId,
              }))}
            />
          </EditClassField>

          <EditClassField
            label="Время"
            changed={timeChanged}
            originalLabel={originalTimeLabel}
          >
            <EditClassDropdown
              value={timeValue}
              onChange={setTimeValue}
              placeholder="Выберите время"
              disabled={cancelChecked}
              options={timeOptions.map((slot) => ({
                value: slot.value,
                label: slot.label,
              }))}
            />
          </EditClassField>

          <EditClassField
            label="День недели"
            changed={weekdayChanged}
            originalLabel={originalWeekdayLabel}
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
          >
            <EditClassDropdown
              value={instructorValue}
              onChange={setInstructorValue}
              placeholder="Выберите преподавателя"
              disabled={cancelChecked}
              options={instructorOptions.map((instructor) => ({
                value: instructor.id,
                label: instructor.label,
              }))}
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
