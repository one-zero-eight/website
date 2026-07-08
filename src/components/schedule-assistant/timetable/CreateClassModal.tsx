import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import type {
  SchemaComponent,
  SchemaScheduleConfig,
} from "@/api/schedule-assistant/types.ts";
import { Modal } from "@/components/common/Modal.tsx";
import { SelectDropdown } from "@/components/common/SelectDropdown.tsx";
import {
  useCoursesQuery,
  useUpdateCourseMutation,
} from "@/components/schedule-assistant/config/useConfig.tsx";
import { TERM_WEEKDAY_LABEL_RU } from "@/components/schedule-assistant/settings/weekdays.ts";
import type { TermWeekdayKey } from "@/components/schedule-assistant/settings/weekdays.ts";
import { useToast } from "@/components/toast";
import clsx from "clsx";
import { useEffect, useMemo, useState, type ReactNode } from "react";

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
  parseCourseComponentKey,
  type CreateMeetingCellContext,
} from "./createMeetingUtils.ts";
import {
  formatAudienceTokensLabel,
  perGroupAudienceOptions,
  timeOptionsForConfig,
  weekdayOptionsForConfig,
} from "./meetingEditUtils.ts";

function CreateClassDropdown({
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
  return (
    <SelectDropdown
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      searchable
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cellContext: CreateMeetingCellContext | null;
  config: SchemaScheduleConfig;
}) {
  const { data: courses } = useCoursesQuery();
  const { mutate, isPending } = useUpdateCourseMutation();
  const { showError, showSuccess } = useToast();

  const [courseComponentKey, setCourseComponentKey] = useState("");
  const [roomValue, setRoomValue] = useState("");
  const [timeValue, setTimeValue] = useState("");
  const [weekdayValue, setWeekdayValue] = useState<TermWeekdayKey | "">("");
  const [instructorValue, setInstructorValue] = useState("");
  const [audienceValue, setAudienceValue] = useState<string[]>([]);
  const [audienceModalOpen, setAudienceModalOpen] = useState(false);

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

  const timeOptions = useMemo(() => timeOptionsForConfig(config), [config]);
  const weekdayOptions = useMemo(
    () => weekdayOptionsForConfig(config),
    [config],
  );

  const roomOptions = useMemo(() => {
    return (config.rooms || [])
      .map((room) => String(room.id || "").trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "ru"));
  }, [config.rooms]);

  const instructorOptions = useMemo(() => {
    return (config.instructors || [])
      .map((instructor) => ({
        id: String(instructor.id || "").trim(),
        label:
          instructor.name_ru ||
          instructor.name_en ||
          instructor.email ||
          instructor.id,
      }))
      .filter((item) => item.id);
  }, [config.instructors]);

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

  useEffect(() => {
    if (!open || !cellContext) return;
    setCourseComponentKey("");
    setRoomValue("");
    setTimeValue(cellContext.time);
    setWeekdayValue(cellContext.weekday);
    setInstructorValue("");
    setAudienceValue(cellContext.groupId ? [cellContext.groupId] : []);
    setAudienceModalOpen(false);
  }, [cellContext, open]);

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
      showError("Ошибка", "Выберите аудиторию.");
      return;
    }
    if (!timeValue.trim()) {
      showError("Ошибка", "Выберите время.");
      return;
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
      time: timeValue,
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
          <CreateClassField label="Группа">
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

        <CreateClassField label="Аудитория">
          <CreateClassDropdown
            value={roomValue}
            onChange={setRoomValue}
            placeholder="Выберите аудиторию"
            options={roomOptions.map((roomId) => ({
              value: roomId,
              label: roomId,
            }))}
          />
        </CreateClassField>

        <CreateClassField label="Время">
          <CreateClassDropdown
            value={timeValue}
            onChange={setTimeValue}
            placeholder="Выберите время"
            options={timeOptions.map((slot) => ({
              value: slot.value,
              label: slot.label,
            }))}
          />
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
            options={instructorOptions.map((instructor) => ({
              value: instructor.id,
              label: instructor.label,
            }))}
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
