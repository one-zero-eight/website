import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import type {
  SchemaScheduleConfig,
  SchemaSessionOccurrence,
  SchemaWeeklyPatternSlot,
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
import { termWeekdayKeyToWeekday } from "@/components/schedule-assistant/settings/weekdays.ts";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import clsx from "clsx";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  EditClassAudienceModal,
  EditClassAudienceSummaryRow,
  EditClassPerGroupModal,
} from "./EditClassAudienceModal.tsx";
import {
  applyCreateMeetingToCourse,
  courseComponentOptions,
  defaultAudienceForCreate,
  defaultCreatePlacement,
  parseCourseComponentKey,
  previewCreateSeriesAction,
  type ComponentScheduleStatus,
  type CreateMeetingCellContext,
  type CreateMeetingViewContext,
  type CreatePlacement,
  type CourseComponentCreateOption,
} from "./createMeetingUtils.ts";
import {
  formatAudienceTokensLabel,
  perGroupAudienceOptions,
  resolveEndTimeForStart,
  timeOptionsForConfig,
} from "./meetingEditUtils.ts";
import type { MeetingPickerIndex } from "./meetingPickerIndex.ts";
import { audienceSummaryHintProps } from "./audienceSummaryHints.ts";
import { validateSessionSeriesDraft } from "./sessionSeriesValidation.ts";
import { SessionSeriesEditor } from "./SessionSeriesEditor.tsx";
import { toApiTime } from "./sessionSeriesRows.tsx";
import type { TimetableLayoutMode } from "./TimetableLayoutSelector.tsx";
import type { Meeting } from "./timetableViewerModel.ts";
import { formatDisplayDate } from "./timetableViewerModel.ts";

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
      showHintOnTrigger
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

function statusDotClass(status: ComponentScheduleStatus) {
  if (status === "covered") return "bg-success";
  if (status === "partial") return "bg-warning";
  return "bg-base-content/25";
}

function toSelectOptions(
  options: CourseComponentCreateOption[],
): SelectDropdownOption[] {
  return options.map((item) => ({
    value: item.value,
    label: item.label,
    hint: [item.modeLabel, item.statusLabel].filter(Boolean).join(" · "),
    searchText: item.searchText,
    startAdornment: (
      <span
        className={cn(
          "mt-1.5 size-1.5 shrink-0 rounded-full",
          statusDotClass(item.status),
          !item.inCurrentView && "opacity-40",
        )}
      />
    ),
    endAdornment: item.inCurrentView ? (
      <span className="badge badge-ghost badge-xs shrink-0">вид</span>
    ) : null,
  }));
}

function seedOccurrenceFromCell(
  config: SchemaScheduleConfig,
  cell: CreateMeetingCellContext,
): SchemaSessionOccurrence {
  const groups = cell.groupId ? [cell.groupId] : undefined;
  const options = timeOptionsForConfig(config, groups);
  const preset = options.find((slot) => slot.value === cell.time);
  const start = cell.time || options[0]?.value || "09:00";
  const end =
    preset?.end || resolveEndTimeForStart(config, start, groups).slice(0, 5);
  return {
    date: cell.date,
    start_time: toApiTime(start),
    end_time: toApiTime(end),
    room: null,
    instructor: null,
  };
}

function seedWeeklyFromCell(
  config: SchemaScheduleConfig,
  cell: CreateMeetingCellContext,
): SchemaWeeklyPatternSlot {
  const groups = cell.groupId ? [cell.groupId] : undefined;
  const options = timeOptionsForConfig(config, groups);
  const preset = options.find((slot) => slot.value === cell.time);
  const start = cell.time || options[0]?.value || "09:00";
  const end =
    preset?.end || resolveEndTimeForStart(config, start, groups).slice(0, 5);
  return {
    weekday: termWeekdayKeyToWeekday(cell.weekday),
    start_time: toApiTime(start),
    end_time: toApiTime(end),
    room: null,
    instructor: null,
    edits: null,
  };
}

export function CreateClassModal({
  open,
  onOpenChange,
  cellContext,
  config,
  meetings,
  meetingPickerIndex,
  layoutMode,
  viewContext,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cellContext: CreateMeetingCellContext | null;
  config: SchemaScheduleConfig;
  meetings: Meeting[];
  meetingPickerIndex: MeetingPickerIndex;
  layoutMode: TimetableLayoutMode;
  viewContext?: CreateMeetingViewContext;
}) {
  const { data: courses } = useCoursesQuery();
  const { mutate, isPending } = useUpdateCourseMutation();
  const { showError, showSuccess } = useToast();

  const [courseComponentKey, setCourseComponentKey] = useState("");
  const [audienceValue, setAudienceValue] = useState<string[]>([]);
  const [audienceModalOpen, setAudienceModalOpen] = useState(false);
  const [placement, setPlacement] = useState<CreatePlacement>(() =>
    layoutMode === "calendar" ? "occurrences" : "weekly",
  );
  const [weeklySlots, setWeeklySlots] = useState<SchemaWeeklyPatternSlot[]>([]);
  const [occurrences, setOccurrences] = useState<SchemaSessionOccurrence[]>([]);

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

  const createOptions = useMemo(() => {
    if (!courses) return [];
    return courseComponentOptions(courses, config, {
      ...viewContext,
      groupId: cellContext?.groupId ?? viewContext?.groupId,
    });
  }, [cellContext?.groupId, config, courses, viewContext]);

  const courseComponentDropdownOptions = useMemo(
    () => toSelectOptions(createOptions),
    [createOptions],
  );

  const selectedOption = useMemo(
    () => createOptions.find((item) => item.value === courseComponentKey),
    [courseComponentKey, createOptions],
  );

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

  const seriesAction = useMemo(() => {
    if (!selectedComponent || !audienceValue.length) {
      return selectedOption?.seriesAction ?? null;
    }
    return previewCreateSeriesAction(selectedComponent, audienceValue, config);
  }, [audienceValue, config, selectedComponent, selectedOption?.seriesAction]);

  useEffect(() => {
    if (!open || !cellContext) return;
    setCourseComponentKey("");
    setAudienceValue(cellContext.groupId ? [cellContext.groupId] : []);
    setAudienceModalOpen(false);
    setWeeklySlots([seedWeeklyFromCell(config, cellContext)]);
    setOccurrences([seedOccurrenceFromCell(config, cellContext)]);
  }, [cellContext, config, open]);

  useEffect(() => {
    if (!selectedComponent) return;
    setAudienceValue(
      defaultAudienceForCreate(selectedComponent, config, cellContext?.groupId),
    );
  }, [cellContext?.groupId, config, selectedComponent]);

  useEffect(() => {
    if (!open) return;
    setPlacement(
      defaultCreatePlacement(
        selectedCourse,
        parsedComponent?.componentIdx,
        audienceValue,
        config,
        layoutMode,
      ),
    );
  }, [
    audienceValue,
    config,
    layoutMode,
    open,
    parsedComponent?.componentIdx,
    selectedCourse,
  ]);

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
    if (!audienceValue.length) {
      showError(
        "Ошибка",
        perGroup ? "Выберите группу." : "Укажите хотя бы одну группу.",
      );
      return;
    }

    const seriesError = validateSessionSeriesDraft({
      placement,
      weeklySlots,
      occurrences,
    });
    if (seriesError) {
      showError("Ошибка", seriesError);
      return;
    }

    const updatedCourse = applyCreateMeetingToCourse(selectedCourse, config, {
      courseIdx: parsedComponent.courseIdx,
      componentIdx: parsedComponent.componentIdx,
      audience: audienceValue,
      placement,
      weeklySlots: placement === "weekly" ? weeklySlots : undefined,
      occurrences: placement === "occurrences" ? occurrences : undefined,
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
          showSuccess(
            "Создано",
            seriesAction === "append"
              ? "Занятие добавлено в существующую серию."
              : "Создана новая серия занятий.",
          );
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
    `${formatDisplayDate(cellContext.date)} (${weekdayLabel})`,
    timeOptionsForConfig(
      config,
      cellContext.groupId ? [cellContext.groupId] : [],
    ).find((slot) => slot.value === cellContext.time)?.label ||
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
      overlayClassName="!flex items-start justify-center overflow-hidden py-4"
      containerClassName="max-h-[calc(100dvh-2rem)] max-w-xl overflow-y-auto"
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
          {selectedOption ? (
            <p className="text-base-content/55 text-xs">
              {selectedOption.inCurrentView ? "Текущий вид · " : null}
              {selectedOption.modeLabel
                ? `${selectedOption.modeLabel} · `
                : null}
              расписание: {selectedOption.statusLabel}
              {seriesAction === "append"
                ? " · добавится в существующую серию"
                : " · будет создана новая серия"}
            </p>
          ) : (
            <p className="text-base-content/55 text-xs">
              Сначала предметы текущего вида. Точка: нет / частично / есть
              занятия.
            </p>
          )}
        </CreateClassField>

        {selectedComponent && !perGroup ? (
          <EditClassAudienceModal
            open={audienceModalOpen}
            onOpenChange={setAudienceModalOpen}
            config={config}
            tokens={audienceValue}
            originalTokens={defaultAudienceForCreate(
              selectedComponent,
              config,
              cellContext.groupId,
            )}
            originalLabel={componentAudienceLabel}
            onSave={setAudienceValue}
          />
        ) : null}

        {selectedComponent && perGroup ? (
          <EditClassPerGroupModal
            open={audienceModalOpen}
            onOpenChange={setAudienceModalOpen}
            value={audienceValue[0] || ""}
            options={perGroupOptions}
            onSave={(group) => setAudienceValue(group ? [group] : [])}
          />
        ) : null}

        <SessionSeriesEditor
          config={config}
          meetings={meetings}
          meetingIndex={meetingPickerIndex}
          placement={placement}
          onPlacementChange={setPlacement}
          afterPlacement={
            selectedComponent ? (
              <EditClassAudienceSummaryRow
                config={config}
                tokens={audienceValue}
                displayLabel={audienceDisplayLabel}
                changed={false}
                originalLabel="—"
                {...audienceSummaryHintProps({
                  perGroup,
                  componentLabel: componentAudienceLabel,
                  context: "component",
                })}
                overridden={Boolean(componentAudienceLabel)}
                onEdit={() => setAudienceModalOpen(true)}
              />
            ) : null
          }
          weeklySlots={weeklySlots}
          onWeeklySlotsChange={setWeeklySlots}
          occurrences={occurrences}
          onOccurrencesChange={setOccurrences}
          audienceTokens={audienceValue}
          courseInstructors={selectedCourse?.instructors}
          instructorPool={selectedComponent?.instructor_pool}
          newOccurrenceDefaults={{
            date: cellContext.date,
            start_time: occurrences[0]?.start_time,
            end_time: occurrences[0]?.end_time,
            room: occurrences[0]?.room ?? null,
            instructor: occurrences[0]?.instructor ?? null,
          }}
          newWeeklyDefaults={{
            weekday:
              weeklySlots[0]?.weekday ??
              termWeekdayKeyToWeekday(cellContext.weekday),
            start_time: weeklySlots[0]?.start_time,
            end_time: weeklySlots[0]?.end_time,
            room: weeklySlots[0]?.room ?? null,
            instructor: weeklySlots[0]?.instructor ?? null,
          }}
        />

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
            ) : seriesAction === "append" ? (
              "Добавить"
            ) : (
              "Создать"
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
