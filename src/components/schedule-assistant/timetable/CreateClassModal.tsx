import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import type {
  SchemaComponent,
  SchemaScheduleConfig,
} from "@/api/schedule-assistant/types.ts";
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
import { TERM_WEEKDAY_LABEL_RU } from "@/components/schedule-assistant/settings/weekdays.ts";
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
  applyCreateMeetingToCourse,
  courseComponentOptions,
  createWouldUseOccurrences,
  parseCourseComponentKey,
  type CreateMeetingCellContext,
} from "./createMeetingUtils.ts";
import {
  CUSTOM_TIME_OPTION_VALUE,
  customTimeOptionLabel,
  formatAudienceTokensLabel,
  normalizeTypedHhmm,
  parseTimeRangeQuery,
  perGroupAudienceOptions,
  resolveEndTimeForStart,
  timeOptionsForConfig,
  weekdayOptionsForConfig,
} from "./meetingEditUtils.ts";
import { buildInstructorPickerOptions } from "./instructorPickerOptions.ts";
import type { MeetingPickerIndex } from "./meetingPickerIndex.ts";
import {
  audienceSizeForTokens,
  buildRoomPickerOptions,
} from "./roomPickerOptions.ts";
import type { Meeting } from "./timetableViewerModel.ts";
import { semesterDatesForWeekday } from "./timetableViewerModel.ts";

function CreateClassDropdown({
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

function CreateClassField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </div>
  );
}

function defaultAudienceForComponent(
  component: SchemaComponent,
  config: SchemaScheduleConfig,
  cellGroupId?: string,
) {
  const tree = buildAudienceSelectorTree(config);
  if (cellGroupId) {
    const fromCell = minimizeAudienceTokens([cellGroupId], tree);
    if (fromCell.length) return fromCell;
  }
  return minimizeAudienceTokens(component.student_groups || [], tree);
}

export function CreateClassModal({
  open,
  onOpenChange,
  cellContext,
  config,
  meetings,
  meetingPickerIndex,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cellContext: CreateMeetingCellContext | null;
  config: SchemaScheduleConfig;
  meetings: Meeting[];
  meetingPickerIndex: MeetingPickerIndex;
}) {
  const { data: courses } = useCoursesQuery();
  const { mutate, isPending } = useUpdateCourseMutation();
  const { showError, showSuccess } = useToast();

  const [courseComponentKey, setCourseComponentKey] = useState("");
  const [roomValue, setRoomValue] = useState("");
  const [timeValue, setTimeValue] = useState("");
  const [endTimeValue, setEndTimeValue] = useState("");
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [weekdayValue, setWeekdayValue] = useState<TermWeekdayKey | "">("");
  const [instructorValue, setInstructorValue] = useState("");
  const [audienceValue, setAudienceValue] = useState<string[]>([]);
  const [audienceModalOpen, setAudienceModalOpen] = useState(false);
  const [pickerOptionsReady, setPickerOptionsReady] = useState(false);

  const parsedComponent = useMemo(
    () => parseCourseComponentKey(courseComponentKey),
    [courseComponentKey],
  );

  const selectedCourse = useMemo(() => {
    if (!courses || !parsedComponent) return null;
    return courses[parsedComponent.courseIdx] ?? null;
  }, [courses, parsedComponent]);

  const selectedComponent = useMemo(() => {
    if (!selectedCourse || !parsedComponent) return null;
    return selectedCourse.components?.[parsedComponent.componentIdx] ?? null;
  }, [parsedComponent, selectedCourse]);

  const perGroup = selectedComponent?.per_group ?? false;

  const courseComponentDropdownOptions = useMemo(() => {
    if (!courses) return [];
    return courseComponentOptions(courses).map((item) => ({
      value: item.value,
      label: item.label,
    }));
  }, [courses]);

  const timeOptions = useMemo(
    () =>
      timeOptionsForConfig(
        config,
        cellContext?.groupId ? [cellContext.groupId] : audienceValue,
      ),
    [audienceValue, cellContext, config],
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
  }, [open, cellContext?.date, cellContext?.weekday]);

  const lastRoomOptionsRef = useRef<SelectDropdownOption[]>([]);
  const lastInstructorOptionsRef = useRef<SelectDropdownOption[]>([]);

  const roomOptions = useMemo(() => {
    if (!cellContext) {
      lastRoomOptionsRef.current = [];
      return [];
    }
    if (!open) return lastRoomOptionsRef.current;
    const weekday = (weekdayValue || cellContext.weekday) as TermWeekdayKey;
    const start = useCustomTime
      ? normalizeTypedHhmm(timeValue)
      : timeValue.trim();
    const end = useCustomTime
      ? normalizeTypedHhmm(endTimeValue)
      : endTimeValue.trim() ||
        (start
          ? resolveEndTimeForStart(config, start, audienceValue).slice(0, 5)
          : "");
    const usesOccurrences = createWouldUseOccurrences(
      selectedCourse,
      parsedComponent?.componentIdx,
      audienceValue,
      config,
    );
    const dates = usesOccurrences
      ? [cellContext.date]
      : semesterDatesForWeekday(config, weekday);
    const next = buildRoomPickerOptions({
      config,
      meetings,
      index: meetingPickerIndex,
      date: cellContext.date,
      dates: dates.length ? dates : [cellContext.date],
      start,
      end: end || undefined,
      audienceTokens: audienceValue,
      includeStatus: pickerOptionsReady,
    });
    lastRoomOptionsRef.current = next;
    return next;
  }, [
    audienceValue,
    cellContext,
    config,
    endTimeValue,
    meetingPickerIndex,
    meetings,
    open,
    parsedComponent?.componentIdx,
    pickerOptionsReady,
    selectedCourse,
    timeValue,
    useCustomTime,
    weekdayValue,
  ]);

  const instructorOptions = useMemo(() => {
    if (!cellContext) {
      lastInstructorOptionsRef.current = [];
      return [];
    }
    if (!open) return lastInstructorOptionsRef.current;
    const weekday = (weekdayValue || cellContext.weekday) as TermWeekdayKey;
    const start = useCustomTime
      ? normalizeTypedHhmm(timeValue)
      : timeValue.trim();
    const end = useCustomTime
      ? normalizeTypedHhmm(endTimeValue)
      : endTimeValue.trim() ||
        (start
          ? resolveEndTimeForStart(config, start, audienceValue).slice(0, 5)
          : "");
    const dates = semesterDatesForWeekday(config, weekday);
    const next = buildInstructorPickerOptions({
      config,
      meetings,
      index: meetingPickerIndex,
      date: cellContext.date,
      dates: dates.length ? dates : [cellContext.date],
      start,
      end: end || undefined,
      weekday,
      courseInstructors: selectedCourse?.instructors,
      includeStatus: pickerOptionsReady,
    });
    lastInstructorOptionsRef.current = next;
    return next;
  }, [
    audienceValue,
    cellContext,
    config,
    endTimeValue,
    meetingPickerIndex,
    meetings,
    open,
    pickerOptionsReady,
    selectedCourse?.instructors,
    timeValue,
    useCustomTime,
    weekdayValue,
  ]);

  const perGroupOptions = useMemo(() => {
    if (!selectedComponent) return [];
    return perGroupAudienceOptions(config, selectedComponent);
  }, [config, selectedComponent]);

  const componentAudienceLabel = useMemo(() => {
    if (!selectedComponent) return "";
    return formatAudienceTokensLabel(
      config,
      selectedComponent.student_groups || [],
    );
  }, [config, selectedComponent]);

  const audienceDisplayLabel = formatAudienceTokensLabel(config, audienceValue);
  const audienceSize = useMemo(
    () => audienceSizeForTokens(config, audienceValue),
    [audienceValue, config],
  );

  useEffect(() => {
    if (!open || !cellContext) return;
    setCourseComponentKey("");
    setRoomValue("");
    const groups = cellContext.groupId ? [cellContext.groupId] : undefined;
    const options = timeOptionsForConfig(config, groups);
    const preset = options.find((slot) => slot.value === cellContext.time);
    setTimeValue(cellContext.time);
    setEndTimeValue(preset?.end || "");
    setUseCustomTime(!preset && !!cellContext.time);
    setWeekdayValue(cellContext.weekday);
    setInstructorValue("");
    setAudienceValue(cellContext.groupId ? [cellContext.groupId] : []);
    setAudienceModalOpen(false);
  }, [cellContext, config, open]);

  useEffect(() => {
    if (!selectedComponent) return;
    setAudienceValue(
      defaultAudienceForComponent(
        selectedComponent,
        config,
        cellContext?.groupId,
      ),
    );
  }, [cellContext?.groupId, config, selectedComponent]);

  function handleClose() {
    if (isPending) return;
    setAudienceModalOpen(false);
    onOpenChange(false);
  }

  function handleSubmit() {
    if (!cellContext || !courses || !parsedComponent || !selectedCourse) {
      showError("Ошибка", "Выберите предмет и компонент.");
      return;
    }

    if (!courseComponentKey) {
      showError("Ошибка", "Выберите предмет и компонент.");
      return;
    }
    if (!roomValue.trim()) {
      showError("Ошибка", "Выберите локацию.");
      return;
    }
    if (!timeValue.trim()) {
      showError("Ошибка", "Выберите время.");
      return;
    }
    const submitStart = useCustomTime
      ? normalizeTypedHhmm(timeValue)
      : timeValue.trim();
    const submitEnd = useCustomTime
      ? normalizeTypedHhmm(endTimeValue)
      : endTimeValue.trim();
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
    if (!weekdayValue) {
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

    const updatedCourse = applyCreateMeetingToCourse(selectedCourse, config, {
      courseIdx: parsedComponent.courseIdx,
      componentIdx: parsedComponent.componentIdx,
      date: cellContext.date,
      weekday: weekdayValue,
      time: submitStart,
      endTime: useCustomTime && submitEnd ? submitEnd : undefined,
      room: roomValue,
      instructor: instructorValue,
      audience: audienceValue,
    });

    if (!updatedCourse) {
      showError("Ошибка", "Не удалось создать занятие.");
      return;
    }

    mutate(
      {
        params: { path: { course_name: selectedCourse.name } },
        body: updatedCourse,
      },
      {
        onSuccess: () => {
          showSuccess("Создано", "Занятие добавлено в расписание.");
          handleClose();
        },
        onError: (error) => {
          showError("Ошибка сохранения", formatApiErrorMessage(error));
        },
      },
    );
  }

  if (!cellContext) return null;

  const weekdayLabel =
    TERM_WEEKDAY_LABEL_RU[cellContext.weekday] || cellContext.weekday;
  const contextParts = [
    `${cellContext.date} (${weekdayLabel})`,
    timeOptions.find((slot) => slot.value === cellContext.time)?.label ||
      cellContext.time,
    cellContext.groupId ? `группа ${cellContext.groupId}` : null,
  ].filter(Boolean);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
        else onOpenChange(next);
      }}
      title="Создать занятие"
      closeOnOutsidePress={!isPending && !audienceModalOpen}
      containerClassName="max-w-xl"
    >
      <div className="flex flex-col gap-3">
        <div className="rounded-box border-base-300 bg-base-100 border px-3 py-2 text-sm">
          <div className="text-base-content/70">{contextParts.join(" · ")}</div>
        </div>

        <CreateClassField label="Предмет · компонент">
          <CreateClassDropdown
            value={courseComponentKey}
            onChange={setCourseComponentKey}
            placeholder="Выберите предмет и компонент"
            options={courseComponentDropdownOptions}
          />
        </CreateClassField>

        {selectedComponent && !perGroup ? (
          <>
            <EditClassAudienceSummaryRow
              config={config}
              tokens={audienceValue}
              displayLabel={audienceDisplayLabel}
              changed={false}
              originalLabel="—"
              overridden={false}
              patternLabel={componentAudienceLabel}
              onEdit={() => setAudienceModalOpen(true)}
            />
            <EditClassAudienceModal
              open={audienceModalOpen}
              onOpenChange={setAudienceModalOpen}
              config={config}
              tokens={audienceValue}
              originalTokens={defaultAudienceForComponent(
                selectedComponent,
                config,
                cellContext.groupId,
              )}
              originalLabel={componentAudienceLabel}
              onSave={setAudienceValue}
            />
          </>
        ) : null}

        {selectedComponent && perGroup ? (
          <CreateClassField
            label={
              audienceSize != null ? `Группа · ${audienceSize} студ.` : "Группа"
            }
          >
            {componentAudienceLabel ? (
              <div className="text-base-content/60 text-xs">
                В компоненте: {componentAudienceLabel}
              </div>
            ) : null}
            <CreateClassDropdown
              value={audienceValue[0] || ""}
              onChange={(group) => setAudienceValue(group ? [group] : [])}
              placeholder="Выберите группу"
              options={perGroupOptions}
            />
          </CreateClassField>
        ) : null}

        <CreateClassField label="Локация">
          <CreateClassDropdown
            value={roomValue}
            onChange={setRoomValue}
            placeholder="Выберите локацию"
            options={roomOptions}
          />
        </CreateClassField>

        <CreateClassField label="Время">
          <CreateClassDropdown
            value={useCustomTime ? CUSTOM_TIME_OPTION_VALUE : timeValue}
            onChange={(value, context) => {
              if (value === CUSTOM_TIME_OPTION_VALUE) {
                setUseCustomTime(true);
                const parsed = parseTimeRangeQuery(context?.searchQuery ?? "");
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
            trailingOption={(query) => ({
              value: CUSTOM_TIME_OPTION_VALUE,
              label: customTimeOptionLabel(query),
            })}
            options={timeOptions.map((slot) => ({
              value: slot.value,
              label: slot.label,
            }))}
          />
          {useCustomTime ? (
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
                onBlur={() => setEndTimeValue(normalizeTypedHhmm(endTimeValue))}
              />
            </div>
          ) : null}
        </CreateClassField>

        <CreateClassField label="День недели">
          <CreateClassDropdown
            value={weekdayValue}
            onChange={(value) => setWeekdayValue(value as TermWeekdayKey)}
            placeholder="Выберите день"
            options={weekdayOptions.map((day) => ({
              value: day.key,
              label: day.label,
            }))}
          />
        </CreateClassField>

        <CreateClassField label="Преподаватель">
          <CreateClassDropdown
            value={instructorValue}
            onChange={setInstructorValue}
            placeholder="Выберите преподавателя"
            options={instructorOptions}
          />
        </CreateClassField>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={isPending}
            onClick={handleClose}
          >
            Отмена
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={isPending}
            onClick={handleSubmit}
          >
            {isPending ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              "Создать"
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
