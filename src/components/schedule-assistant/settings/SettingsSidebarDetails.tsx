import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { $scheduleAssistant } from "@/api/schedule-assistant";
import {
  SchemaCourseConfig,
  SchemaInstructorListItem,
  SchemaRoomAttributeDef,
  SchemaSectionProgram,
  SectionProgramLanguageAnyOf0,
} from "@/api/schedule-assistant/types.ts";
import { Modal } from "@/components/common/Modal.tsx";
import { SelectDropdown } from "@/components/common/SelectDropdown.tsx";
import { useToast } from "@/components/toast";
import {
  nextGroupIdentifiers,
  programCodeForGroupIdentifiers,
} from "@/components/schedule-assistant/config/groupIdentifiers.ts";
import {
  formatTermTimeSlots,
  parseTermTimeSlotsText,
  useConfig,
  useCourse,
  useCreateStudentGroupMutation,
  useDeleteCourseMutation,
  useDeleteInstructorMutation,
  useDeleteProgramFromSection,
  useDeleteRoomMutation,
  useDeleteStudentGroupCascade,
  useInstructor,
  usePatchCourseMutation,
  usePatchInstructorMutation,
  usePatchRoomMutation,
  usePatchStudentGroupMutation,
  usePatchTermMutation,
  useProgram,
  useRenameStudentGroup,
  useRoom,
  useSemesterSettings,
  useStudentGroup,
  useTrack,
  useUpdateProgramMutation,
  useInstructorsQuery,
} from "@/components/schedule-assistant/config/useConfig.tsx";
import {
  collectKnownStudentGroupIds,
  courseComponentsYamlLintExtensions,
  validateCourseComponentsYaml,
} from "@/components/schedule-assistant/settings/courses/courseComponentsYamlLint.ts";
import {
  countCourseLessonsByInstructor,
  formatLessonBreakdown,
  type InstructorLessonBreakdown,
} from "@/components/schedule-assistant/settings/courses/courseInstructorLessonCounts.ts";
import { RoomAttributesConfigModal } from "@/components/schedule-assistant/settings/rooms/RoomAttributesConfigModal.tsx";
import {
  buildRoomFeaturesFromDefs,
  resolveRoomFeatureValue,
  type RoomFeatureValue,
} from "@/components/schedule-assistant/settings/rooms/roomAttributes.ts";
import {
  mutateNormalizedTrackGroups,
  normalizeTracksFromSectionProgram,
  programUsesExplicitTracks,
} from "@/components/schedule-assistant/settings/groups/normalizeTrackFromSectionProgram.ts";
import { InstructorPreferenceGrid } from "@/components/schedule-assistant/settings/instructors/InstructorPreferenceGrid.tsx";
import {
  createInstructorsSearchIndex,
  instructorDisplayName,
  searchInstructors,
} from "@/components/schedule-assistant/settings/instructors/instructorsSearchUtils.ts";
import { useRegisterSettingsDirty } from "@/components/schedule-assistant/settings/settingsSaveStatus.tsx";
import { useBlurSaveField } from "@/components/schedule-assistant/settings/useBlurSaveField.ts";
import { useSelection } from "@/components/schedule-assistant/settings/useSelection.tsx";
import {
  normalizeTermWeekdays,
  TERM_WEEKDAY_KEYS,
  TERM_WEEKDAY_LABEL_RU,
  type TermWeekdayKey,
  termWeekdayKeysToWeekdays,
  termWeekdayKeyToWeekday,
  toggleTermWeekday,
} from "@/components/schedule-assistant/settings/weekdays.ts";
import { yaml } from "@codemirror/lang-yaml";
import { lintKeymap } from "@codemirror/lint";
import { EditorView, keymap } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import clsx from "clsx";
import {
  type KeyboardEvent,
  type ReactNode,
  Fragment,
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { stringify } from "yaml";

function programStableId(program: SchemaSectionProgram): string {
  return String(program?.code || "").trim();
}

const detailCaptionUpperClass =
  "text-xs font-medium uppercase tracking-wide text-base-content/70";
const detailLabelUpperClass = `label-text ${detailCaptionUpperClass}`;
const detailControlClass = "form-control w-full gap-1.5 px-1 py-0.5";
const detailInputClass =
  "input input-bordered input-sm w-full px-3 py-2 text-sm font-normal leading-normal [color-scheme:inherit]";
const detailTimeSlotsTextareaClass =
  "textarea textarea-bordered min-h-[2.75rem] w-full resize-none overflow-hidden px-3 py-2 text-sm font-normal leading-normal [color-scheme:inherit]";

/** Общая оболочка формы деталей настроек (программа, трек, группа, аудитория, преподаватель). */
const settingsDetailShellClass =
  "flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto";

/** Заголовок секции + кнопка добавления + прокручиваемый список (треки программы, группы трека). */
function SettingsDetailNestedList({
  sectionTitle,
  addButtonLabel,
  onAdd,
  emptyHint,
  isEmpty,
  children,
}: {
  sectionTitle: string;
  addButtonLabel: string;
  onAdd: () => void;
  emptyHint: string;
  isEmpty: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 shrink-0 flex-col gap-2">
      <div className="flex shrink-0 items-center justify-between gap-2 px-0.5">
        <span className={detailCaptionUpperClass}>{sectionTitle}</span>
        <button
          type="button"
          className="btn btn-outline btn-xs"
          onClick={onAdd}
        >
          {addButtonLabel}
        </button>
      </div>
      <div className="rounded-box border-base-300 max-h-[min(50vh,22rem)] overflow-x-hidden overflow-y-auto border">
        {isEmpty ? (
          <div className="text-base-content/70 px-3 py-2 text-sm">
            {emptyHint}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}

function SettingsDetailDeleteButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="btn btn-outline btn-error btn-sm mt-auto w-full shrink-0 sm:w-auto"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

/** Строка вложенного списка: основной контент + вверх / вниз / удалить. */
function SettingsDetailReorderRow({
  children,
  disableMoveUp,
  disableMoveDown,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  children: ReactNode;
  disableMoveUp: boolean;
  disableMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="border-base-300 flex items-start justify-between gap-2 border-b px-2.5 py-1.5 last:border-b-0">
      {children}
      <div className="join shrink-0 gap-1">
        <button
          type="button"
          className="btn btn-ghost btn-xs btn-square"
          disabled={disableMoveUp}
          onClick={onMoveUp}
        >
          <span className="icon-[material-symbols--keyboard-arrow-up-rounded] text-lg" />
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-xs btn-square"
          disabled={disableMoveDown}
          onClick={onMoveDown}
        >
          <span className="icon-[material-symbols--keyboard-arrow-down-rounded] text-lg" />
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-xs btn-square text-error"
          onClick={onDelete}
        >
          <span className="icon-[material-symbols--delete-outline-rounded] text-lg" />
        </button>
      </div>
    </div>
  );
}

const selectableRowButtonClass = clsx(
  "btn btn-ghost hover:bg-base-200 h-auto min-h-0 min-w-0 flex-1 flex-col items-stretch justify-center whitespace-normal rounded-btn px-2 py-1.5 text-left normal-case",
);

function SettingsDetailSelectableRowButton({
  title,
  subtitle,
  onClick,
}: {
  title: string;
  subtitle?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={selectableRowButtonClass}
      onClick={onClick}
    >
      <div className="text-sm leading-snug font-medium wrap-break-word">
        {title}
      </div>
      {subtitle && subtitle !== title ? (
        <div className="text-base-content/60 text-xs leading-snug wrap-break-word">
          {subtitle}
        </div>
      ) : null}
    </button>
  );
}

function useAutosizeTextareaRef(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return ref;
}

function DetailQueryState({
  isPending,
  isError,
  error,
  children,
}: {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  children: ReactNode;
}) {
  if (isPending) {
    return <div className="skeleton h-32 w-full" />;
  }
  if (isError) {
    return (
      <div className="alert alert-error alert-soft text-sm">
        {formatApiErrorMessage(error)}
      </div>
    );
  }
  return children;
}

/** Escape: снять фокус (у `type="date"` браузер часто не убирает фокус сам). */
function handleEscapeBlur(
  event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
) {
  if (event.key !== "Escape") return;
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.blur();
}
/** Растягивается по высоте во flex-контейнере (детали группы). */
const detailStudentsTextareaClass =
  "textarea textarea-bordered min-h-[5rem] w-full flex-1 resize-none px-3 py-2 text-sm font-normal leading-normal [color-scheme:inherit]";

function toDateInputValue(raw: unknown): string {
  if (raw == null || raw === "") return "";
  const s = String(raw).trim();
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return iso ? iso[1] : "";
}

export function GroupNotFoundNotice() {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="rounded-box border-warning/40 bg-warning/10 text-base-content/80 border p-3 text-sm">
        Выбранная группа не существует. Ее можно создать во вкладке
        &quot;Группы&quot;.
      </div>
    </div>
  );
}

export function SelectItemNotice() {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="text-base-content/70 text-sm">
        Выберите элемент слева, чтобы отредактировать.
      </div>
    </div>
  );
}

function SettingsSidebarHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="px-0.5">
      <h3 className="text-base-content text-base leading-snug font-semibold tracking-tight">
        {title}
      </h3>
      {subtitle ? (
        <p className="text-base-content/70 mt-0.5 text-sm font-normal">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export function SettingsSidebarDetailFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <>
      <SettingsSidebarHeading title={title} subtitle={subtitle} />
      <div className="schedule-assistant-settings-detail flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-1.5 pb-0.5 text-sm">
        {children}
      </div>
    </>
  );
}

export function RoomDetails({ roomId }: { roomId: string }) {
  const { room, isPending, isError, error } = useRoom(roomId);
  const { term } = useSemesterSettings();
  const { patchRoom } = usePatchRoomMutation(roomId);
  const { mutate: deleteRoom, isPending: isDeleting } = useDeleteRoomMutation();
  const { deselectItem } = useSelection();
  const headingTitle = room ? String(room.id) : roomId || "—";
  const headingSubtitle = "Аудитория";
  const idField = useBlurSaveField(String(room?.id ?? ""), (value) => {
    if (!room) return;
    patchRoom({ id: value });
  });
  const nameField = useBlurSaveField(String(room?.name ?? ""), (value) => {
    if (!room) return;
    patchRoom({ name: value });
  });
  const capacityField = useBlurSaveField(
    room?.capacity != null ? String(room.capacity) : "",
    (value) => {
      if (!room) return;
      const trimmed = value.trim();
      if (trimmed === "") {
        patchRoom({ capacity: null });
        return;
      }
      const capacity = Number(trimmed);
      if (!Number.isFinite(capacity)) return;
      patchRoom({ capacity });
    },
  );

  return (
    <SettingsSidebarDetailFrame title={headingTitle} subtitle={headingSubtitle}>
      <DetailQueryState isPending={isPending} isError={isError} error={error}>
        {!room ? (
          <div className={settingsDetailShellClass}>
            <div className="text-base-content/70 text-sm">
              Аудитория не найдена в конфигурации.
            </div>
          </div>
        ) : (
          <div className={settingsDetailShellClass}>
            <label className={`${detailControlClass} shrink-0`}>
              <span className={detailLabelUpperClass}>Идентификатор</span>
              <input className={detailInputClass} {...idField} />
            </label>
            <label className={`${detailControlClass} shrink-0`}>
              <span className={detailLabelUpperClass}>Название</span>
              <input className={detailInputClass} {...nameField} />
            </label>
            <label className={`${detailControlClass} shrink-0`}>
              <span className={detailLabelUpperClass}>Вместимость</span>
              <input
                type="number"
                className={detailInputClass}
                {...capacityField}
              />
            </label>
            <RoomFeaturesEditor
              attributes={term?.room_attributes ?? []}
              features={room.features ?? {}}
              onChange={(features) => patchRoom({ features })}
            />
            <SettingsDetailDeleteButton
              label="Удалить аудиторию"
              onClick={() => {
                deleteRoom({ params: { path: { room_id: roomId } } });
                deselectItem();
              }}
            />
            {isDeleting ? (
              <span className="loading loading-spinner loading-sm" />
            ) : null}
          </div>
        )}
      </DetailQueryState>
    </SettingsSidebarDetailFrame>
  );
}

function RoomFeatureStringListEditor({
  values,
  onChange,
}: {
  values: string[];
  onChange: (values: string[] | null) => void;
}) {
  const [draft, setDraft] = useState("");

  function handleAdd() {
    const next = draft.trim();
    if (!next || values.includes(next)) return;
    onChange([...values, next]);
    setDraft("");
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      {values.length === 0 ? (
        <div className="text-base-content/50 text-sm">Не задано</div>
      ) : (
        <ul className="flex flex-col gap-1">
          {values.map((value, index) => (
            <li key={`${value}-${index}`} className="flex items-center gap-2">
              <span className="bg-base-200 rounded-box px-2 py-1 text-sm">
                {value}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => {
                  const next = values.filter(
                    (_, valueIndex) => valueIndex !== index,
                  );
                  onChange(next.length ? next : null);
                }}
              >
                Удалить
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${detailInputClass} min-w-40 flex-1`}
          placeholder="Добавить значение"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            handleAdd();
          }}
        />
        <button
          type="button"
          className="btn btn-outline btn-secondary btn-sm"
          disabled={!draft.trim()}
          onClick={handleAdd}
        >
          Добавить
        </button>
      </div>
    </div>
  );
}

function RoomFeaturesEditor({
  attributes,
  features,
  onChange,
}: {
  attributes: SchemaRoomAttributeDef[];
  features: { [key: string]: RoomFeatureValue };
  onChange: (features: { [key: string]: RoomFeatureValue }) => void;
}) {
  const [configOpen, setConfigOpen] = useState(false);
  const defs = attributes.filter((item) => item.key.trim());

  function handleValueChange(key: string, value: RoomFeatureValue | null) {
    onChange(
      buildRoomFeaturesFromDefs(defs, {
        ...features,
        [key]: value,
      }),
    );
  }

  return (
    <div className={`${detailControlClass} shrink-0`}>
      <div className="flex items-center gap-1">
        <span className={detailLabelUpperClass}>Атрибуты</span>
        <button
          type="button"
          className="btn btn-ghost btn-xs btn-square"
          title="Настроить атрибуты"
          onClick={() => setConfigOpen(true)}
        >
          <span className="icon-[material-symbols--settings-outline] text-base" />
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {defs.length === 0 ? (
          <div className="text-base-content/60 text-sm">
            Определите атрибуты через шестерёнку — они будут общими для всех
            аудиторий.
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {defs.map((def) => {
              const value = resolveRoomFeatureValue(def, features);
              return (
                <li key={def.key} className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-start gap-2">
                    <span className="bg-base-200 rounded-box shrink-0 px-2 py-1 text-sm font-medium">
                      {def.key}
                    </span>
                    {def.type === "boolean" ? (
                      <div className="min-w-40 flex-1">
                        <SelectDropdown
                          value={
                            value === null
                              ? ""
                              : value === true
                                ? "true"
                                : "false"
                          }
                          options={[
                            { value: "", label: "Не задано" },
                            { value: "true", label: "Да" },
                            { value: "false", label: "Нет" },
                          ]}
                          onChange={(next) =>
                            handleValueChange(
                              def.key,
                              next === "" ? null : next === "true",
                            )
                          }
                          triggerClassName="btn btn-outline btn-sm w-full justify-between font-normal"
                        />
                      </div>
                    ) : null}
                    {def.type === "string" ? (
                      <input
                        key={`${def.key}:${value === null ? "" : String(value)}`}
                        className={`${detailInputClass} min-w-0 flex-1`}
                        defaultValue={
                          value === null
                            ? ""
                            : typeof value === "string"
                              ? value
                              : String(value)
                        }
                        placeholder="Не задано"
                        onBlur={(e) => {
                          const next = e.target.value;
                          handleValueChange(
                            def.key,
                            next.trim() === "" ? null : next,
                          );
                        }}
                      />
                    ) : null}
                    {def.type === "number" ? (
                      <input
                        type="number"
                        className={`${detailInputClass} min-w-0 flex-1`}
                        value={typeof value === "number" ? value : ""}
                        placeholder="Не задано"
                        onChange={(e) => {
                          const raw = e.target.value.trim();
                          if (raw === "") {
                            handleValueChange(def.key, null);
                            return;
                          }
                          const next = Number(raw);
                          if (!Number.isFinite(next)) return;
                          handleValueChange(def.key, Math.trunc(next));
                        }}
                      />
                    ) : null}
                    {def.type === "enum" ? (
                      <div className="min-w-40 flex-1">
                        <SelectDropdown
                          value={typeof value === "string" ? value : ""}
                          options={[
                            { value: "", label: "Не задано" },
                            ...(def.enum_values ?? []).map((item) => ({
                              value: item,
                              label: item,
                            })),
                          ]}
                          onChange={(next) =>
                            handleValueChange(
                              def.key,
                              next === "" ? null : next,
                            )
                          }
                          triggerClassName="btn btn-outline btn-sm w-full justify-between font-normal"
                        />
                      </div>
                    ) : null}
                    {def.type === "list" ? (
                      <RoomFeatureStringListEditor
                        values={Array.isArray(value) ? value : []}
                        onChange={(next) => handleValueChange(def.key, next)}
                      />
                    ) : null}
                  </div>
                  {def.hint ? (
                    <div className="text-base-content/50 text-xs">
                      {def.hint}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <RoomAttributesConfigModal
        open={configOpen}
        onOpenChange={setConfigOpen}
        attributes={attributes}
      />
    </div>
  );
}

export function CourseDetails({ courseIndex }: { courseIndex: number }) {
  const { config } = useConfig();
  const { term } = useSemesterSettings();
  const { data: instructors = [] } = useInstructorsQuery();
  const { course, courseName, isPending, isError, error } =
    useCourse(courseIndex);
  const { patchCourse } = usePatchCourseMutation(courseName);
  const { mutate: deleteCourse, isPending: isDeleting } =
    useDeleteCourseMutation();
  const { mutate: createStudentGroup } = useCreateStudentGroupMutation();
  const { deselectItem } = useSelection();
  const name = String(course?.name ?? "");
  const components = Array.isArray(course?.components) ? course.components : [];
  const componentTags = components
    .map((comp: { tag?: string }) => comp?.tag)
    .filter(Boolean);
  const headingTitle =
    String(
      course?.name_ru ||
        course?.name ||
        course?.short_name_ru ||
        course?.short_name,
    ) || `Курс #${courseIndex + 1}`;
  const headingSubtitle = componentTags.length ? componentTags.join(", ") : "—";
  const knownStudentGroupIds = useMemo(
    () => collectKnownStudentGroupIds(config),
    [config],
  );

  const componentsSignature = stringify(components, { lineWidth: 0 });
  const [yamlText, setYamlText] = useState(componentsSignature);
  const [committedYaml, setCommittedYaml] = useState(componentsSignature);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleCreateStudentGroup = useCallback(
    (groupId: string) => {
      const normalized = groupId.trim();
      if (!normalized) return;
      const exists = (config?.students_groups ?? []).some(
        (candidate) => String(candidate.code) === normalized,
      );
      if (exists) return;
      createStudentGroup({
        body: {
          code: normalized,
          kind: "core",
          name: normalized,
          estimated_size: null,
          students: [],
        },
      });
    },
    [config?.students_groups, createStudentGroup],
  );
  const yamlLintExtensions = useMemo(
    () =>
      courseComponentsYamlLintExtensions(
        knownStudentGroupIds,
        handleCreateStudentGroup,
      ),
    [knownStudentGroupIds, handleCreateStudentGroup],
  );

  useEffect(() => {
    setYamlText(componentsSignature);
    setCommittedYaml(componentsSignature);
    setParseError(null);
  }, [courseIndex, componentsSignature]);

  useRegisterSettingsDirty(yamlText !== committedYaml);

  const nameField = useBlurSaveField(name, (value) =>
    patchCourse({ name: value }),
  );
  const shortNameField = useBlurSaveField(course?.short_name ?? "", (value) =>
    patchCourse({ short_name: value.trim() || null }),
  );
  const nameRuField = useBlurSaveField(course?.name_ru ?? "", (value) =>
    patchCourse({ name_ru: value.trim() || null }),
  );
  const shortNameRuField = useBlurSaveField(
    course?.short_name_ru ?? "",
    (value) => patchCourse({ short_name_ru: value.trim() || null }),
  );

  function handleCommitYaml() {
    const result = validateCourseComponentsYaml(yamlText);
    if (!result.ok) {
      setParseError(result.error);
      return;
    }
    setParseError(null);
    setCommittedYaml(yamlText);
    patchCourse({
      components: result.value as SchemaCourseConfig["components"],
    });
  }

  return (
    <SettingsSidebarDetailFrame title={headingTitle} subtitle={headingSubtitle}>
      <DetailQueryState isPending={isPending} isError={isError} error={error}>
        <div className={settingsDetailShellClass}>
          <label className={`${detailControlClass} shrink-0`}>
            <span className={detailLabelUpperClass}>Название</span>
            <input className={detailInputClass} {...nameField} />
          </label>
          <label className={`${detailControlClass} shrink-0`}>
            <span className={detailLabelUpperClass}>
              Короткое название (EN)
            </span>
            <input className={detailInputClass} {...shortNameField} />
          </label>
          <label className={`${detailControlClass} shrink-0`}>
            <span className={detailLabelUpperClass}>Название (RU)</span>
            <input className={detailInputClass} {...nameRuField} />
          </label>
          <label className={`${detailControlClass} shrink-0`}>
            <span className={detailLabelUpperClass}>
              Короткое название (RU)
            </span>
            <input className={detailInputClass} {...shortNameRuField} />
          </label>

          <CourseInstructorsEditor
            assignments={course?.instructors ?? []}
            roleOptions={(term?.course_instructor_roles ?? []).filter(Boolean)}
            tagOrder={(term?.course_component_tags ?? []).filter(Boolean)}
            lessonCounts={countCourseLessonsByInstructor(course, term)}
            instructors={instructors}
            onChange={(courseInstructors) =>
              patchCourse({ instructors: courseInstructors })
            }
          />

          <div
            className={`${detailControlClass} flex min-h-0 min-w-0 flex-1 flex-col gap-1.5`}
          >
            <span className={detailLabelUpperClass}>Компоненты (YAML)</span>
            <div className="rounded-box overflow-scroll border">
              <CodeMirror
                value={yamlText}
                height="auto"
                theme="light"
                className=""
                extensions={[
                  yaml(),
                  EditorView.lineWrapping,
                  ...yamlLintExtensions,
                  keymap.of(lintKeymap as Parameters<typeof keymap.of>[0]),
                ]}
                onChange={(value) => setYamlText(value)}
                onBlur={handleCommitYaml}
                basicSetup={{ foldGutter: true }}
              />
            </div>
            {parseError ? (
              <div className="text-error text-xs wrap-break-word">
                {parseError}
              </div>
            ) : null}
          </div>

          <SettingsDetailDeleteButton
            label="Удалить курс"
            onClick={() => {
              if (!courseName) return;
              deleteCourse({ params: { path: { course_name: courseName } } });
              deselectItem();
            }}
          />
          {isDeleting ? (
            <span className="loading loading-spinner loading-sm" />
          ) : null}
        </div>
      </DetailQueryState>
    </SettingsSidebarDetailFrame>
  );
}

function CourseInstructorsEditor({
  assignments,
  roleOptions,
  tagOrder,
  instructors,
  lessonCounts,
  onChange,
}: {
  assignments: { id: string; role: string }[];
  roleOptions: string[];
  tagOrder: string[];
  instructors: SchemaInstructorListItem[];
  lessonCounts: Map<string, InstructorLessonBreakdown>;
  onChange: (assignments: { id: string; role: string }[]) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState(assignments);
  const [draftRole, setDraftRole] = useState(roleOptions[0] ?? "");
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const labelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const instructor of instructors) {
      map.set(instructor.id, instructorDisplayName(instructor));
    }
    return map;
  }, [instructors]);

  const roleRank = useMemo(() => {
    const map = new Map<string, number>();
    roleOptions.forEach((role, index) => map.set(role, index));
    return map;
  }, [roleOptions]);

  const searchIndex = useMemo(
    () => createInstructorsSearchIndex(instructors),
    [instructors],
  );

  const assignedIds = useMemo(
    () => new Set(draft.map((item) => item.id)),
    [draft],
  );

  const searchResults = useMemo(() => {
    const trimmed = deferredSearchQuery.trim();
    if (!trimmed) return [];
    return searchInstructors(searchIndex, trimmed)
      .filter((item) => !assignedIds.has(item.id))
      .slice(0, 8);
  }, [assignedIds, deferredSearchQuery, searchIndex]);

  const sortedDraft = useMemo(() => {
    return draft
      .map((item, index) => ({ item, index }))
      .sort((left, right) => {
        const leftRank = roleRank.get(left.item.role) ?? 999;
        const rightRank = roleRank.get(right.item.role) ?? 999;
        if (leftRank !== rightRank) return leftRank - rightRank;
        const leftName = (
          labelById.get(left.item.id) ?? left.item.id
        ).toLocaleLowerCase("ru");
        const rightName = (
          labelById.get(right.item.id) ?? right.item.id
        ).toLocaleLowerCase("ru");
        return leftName.localeCompare(rightName, "ru");
      });
  }, [draft, labelById, roleRank]);

  function handleOpenModal() {
    setDraft(assignments.map((item) => ({ ...item })));
    setDraftRole(roleOptions[0] ?? "");
    setSearchQuery("");
    setModalOpen(true);
  }

  function handleSave() {
    onChange(draft);
    setModalOpen(false);
  }

  function handleAddInstructor(instructorId: string) {
    const role = draftRole.trim() || roleOptions[0] || "";
    if (!instructorId || !role || assignedIds.has(instructorId)) return;
    setDraft((current) => [...current, { id: instructorId, role }]);
    setSearchQuery("");
  }

  function roleSelectOptions(currentRole: string) {
    const options = roleOptions.map((role) => ({ value: role, label: role }));
    if (currentRole && !roleOptions.includes(currentRole)) {
      options.push({
        value: currentRole,
        label: `${currentRole} (вне списка)`,
      });
    }
    return options;
  }

  function lessonsLabel(instructorId: string) {
    return formatLessonBreakdown(lessonCounts.get(instructorId), tagOrder);
  }

  return (
    <div className={`${detailControlClass} shrink-0`}>
      <div className="flex items-center justify-between gap-2">
        <span className={detailLabelUpperClass}>Преподаватели курса</span>
        <button
          type="button"
          className="btn btn-ghost btn-xs btn-square"
          onClick={handleOpenModal}
          title="Редактировать"
        >
          <span className="icon-[material-symbols--edit-outline-rounded] text-base" />
        </button>
      </div>
      {assignments.length === 0 ? (
        <div className="text-base-content/60 text-sm">
          Пока никого не назначили на предмет.
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5 px-0.5">
          {assignments.map((assignment, index) => (
            <li
              key={`${assignment.id}-${index}`}
              className="flex min-w-0 items-start justify-between gap-2 text-sm leading-snug"
            >
              <span className="min-w-0 wrap-break-word">
                {labelById.get(assignment.id) ?? assignment.id}
              </span>
              <div className="text-base-content/55 shrink-0 text-right text-xs leading-tight">
                <div className="whitespace-nowrap">{assignment.role}</div>
                <div className="whitespace-nowrap">
                  {lessonsLabel(assignment.id)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Преподаватели курса"
        overlayClassName="!flex items-start justify-center overflow-y-auto pt-[max(1rem,12vh)]"
        containerClassName="max-h-[calc(100dvh-2rem-12vh)] max-w-xl overflow-y-auto"
      >
        <div className="flex flex-col gap-3">
          <div className="px-1">
            {sortedDraft.length === 0 ? (
              <div className="text-base-content/60 py-1 text-sm">
                Пока никого не назначили на предмет.
              </div>
            ) : (
              <ul className="divide-base-300 border-base-300 divide-y overflow-hidden rounded-lg border">
                {sortedDraft.map(({ item: assignment, index }) => (
                  <li
                    key={`${assignment.id}-${index}`}
                    className="flex items-center gap-2 px-2.5 py-1.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm leading-tight font-medium">
                        {labelById.get(assignment.id) ?? assignment.id}
                      </div>
                      <div className="text-base-content/55 truncate text-xs leading-tight">
                        {lessonsLabel(assignment.id)}
                      </div>
                    </div>
                    {roleOptions.length > 0 ? (
                      <select
                        className="select select-bordered select-xs w-44 shrink-0"
                        value={assignment.role}
                        onChange={(e) => {
                          const role = e.target.value;
                          setDraft((current) =>
                            current.map((entry, itemIndex) =>
                              itemIndex === index ? { ...entry, role } : entry,
                            ),
                          );
                        }}
                      >
                        {roleSelectOptions(assignment.role).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="input input-bordered input-xs w-36 shrink-0"
                        value={assignment.role}
                        onChange={(e) => {
                          const role = e.target.value;
                          setDraft((current) =>
                            current.map((entry, itemIndex) =>
                              itemIndex === index ? { ...entry, role } : entry,
                            ),
                          );
                        }}
                      />
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs btn-square text-base-content/50 hover:text-error shrink-0"
                      title="Удалить"
                      onClick={() =>
                        setDraft((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                    >
                      <span className="icon-[material-symbols--close] text-base" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-base-300 space-y-2 border-t px-1 pt-3">
            <div className="text-base-content/70 text-xs font-medium tracking-wide uppercase">
              Добавить
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <input
                  type="search"
                  className="input input-bordered input-sm w-full pr-8 [&::-webkit-search-cancel-button]:hidden"
                  value={searchQuery}
                  placeholder="Поиск преподавателя…"
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
                {searchQuery ? (
                  <button
                    type="button"
                    className="text-base-content/40 hover:text-base-content/70 absolute top-1/2 right-2 flex -translate-y-1/2 items-center rounded-sm transition-colors"
                    onClick={() => setSearchQuery("")}
                  >
                    <span className="icon-[material-symbols--close] text-lg" />
                  </button>
                ) : null}
              </div>
              {roleOptions.length > 0 ? (
                <select
                  className="select select-bordered select-sm w-44 shrink-0"
                  value={draftRole}
                  onChange={(e) => setDraftRole(e.target.value)}
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="input input-bordered input-sm w-44 shrink-0"
                  placeholder="Роль"
                  value={draftRole}
                  onChange={(e) => setDraftRole(e.target.value)}
                />
              )}
            </div>

            {deferredSearchQuery.trim() ? (
              searchResults.length > 0 ? (
                <ul className="border-base-300 divide-base-300 max-h-48 divide-y overflow-y-auto rounded-lg border">
                  {searchResults.map((instructor) => {
                    const name = instructorDisplayName(instructor);
                    const subtitle = [
                      instructor.position?.trim(),
                      instructor.email?.trim(),
                    ]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <li key={instructor.id}>
                        <button
                          type="button"
                          className="hover:bg-base-300/50 flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors"
                          onClick={() => handleAddInstructor(instructor.id)}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm leading-tight">
                              {name}
                            </div>
                            {subtitle ? (
                              <div className="text-base-content/55 truncate text-xs leading-tight">
                                {subtitle}
                              </div>
                            ) : null}
                          </div>
                          <span className="icon-[material-symbols--add] text-base-content/45 shrink-0 text-lg" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="text-base-content/60 text-sm">
                  Ничего не найдено.
                </div>
              )
            ) : (
              <div className="text-base-content/50 text-xs">
                Начните вводить имя, email или алиас.
              </div>
            )}
          </div>
        </div>

        <div className="mt-2 flex justify-end gap-2 px-1">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setModalOpen(false)}
          >
            Отмена
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
          >
            Сохранить
          </button>
        </div>
      </Modal>
    </div>
  );
}

export function GroupDetails({
  groupId,
  sectionCode,
  programIndex,
  trackIndex,
  titleFallback,
}: {
  groupId: string;
  sectionCode: string;
  programIndex: number;
  trackIndex: number;
  titleFallback?: string;
}) {
  const { studentGroup, isPending, isError, error } = useStudentGroup(groupId);
  const { patchStudentGroup } = usePatchStudentGroupMutation(groupId);
  const { renameStudentGroup } = useRenameStudentGroup();
  const { deleteStudentGroupCascade, isPending: isDeleting } =
    useDeleteStudentGroupCascade();
  const { track } = useTrack(sectionCode, programIndex, trackIndex);
  const { selectItem, deselectItem } = useSelection();
  const code = groupId;
  const name = String(studentGroup?.name ?? titleFallback ?? "");
  const headingTitle = String(studentGroup?.name ?? titleFallback ?? groupId);
  const headingSubtitle = `Группа · ${String(track?.name || "Track")}`;
  const kind = String(studentGroup?.kind ?? "");
  const estimatedSize =
    studentGroup?.estimated_size != null
      ? String(studentGroup.estimated_size)
      : "";
  const students = Array.isArray(studentGroup?.students)
    ? studentGroup.students.join("\n")
    : "";

  const nameField = useBlurSaveField(name, (value) =>
    patchStudentGroup({ name: value }),
  );
  const codeField = useBlurSaveField(code, (value) => {
    const newId = value.trim();
    if (!newId || newId === groupId) return;
    void renameStudentGroup(groupId, newId).then(() => {
      selectItem({
        kind: "group",
        sectionCode,
        programIndex,
        trackIndex,
        groupId: newId,
      });
    });
  });
  const kindField = useBlurSaveField(kind, (value) =>
    patchStudentGroup({ kind: value }),
  );
  const estimatedSizeField = useBlurSaveField(estimatedSize, (value) => {
    const parsed = Number(value.trim());
    patchStudentGroup({
      estimated_size: Number.isFinite(parsed) ? parsed : null,
    });
  });
  const studentsField = useBlurSaveField(students, (value) =>
    patchStudentGroup({
      students: value
        .split("\n")
        .map((chunk) => chunk.trim())
        .filter(Boolean),
    }),
  );

  const emailLineCount = studentsField.value
    .split("\n")
    .map((line: string) => line.trim())
    .filter(Boolean).length;

  return (
    <SettingsSidebarDetailFrame title={headingTitle} subtitle={headingSubtitle}>
      <DetailQueryState isPending={isPending} isError={isError} error={error}>
        <div className={settingsDetailShellClass}>
          <label className={`${detailControlClass} shrink-0`}>
            <span className={detailLabelUpperClass}>Название</span>
            <input className={detailInputClass} {...nameField} />
          </label>
          <label className={`${detailControlClass} shrink-0`}>
            <span className={detailLabelUpperClass}>Код</span>
            <input className={detailInputClass} {...codeField} />
          </label>
          <label className={`${detailControlClass} shrink-0`}>
            <span className={detailLabelUpperClass}>Тип</span>
            <input className={detailInputClass} {...kindField} />
          </label>
          <label className={`${detailControlClass} shrink-0`}>
            <span className={detailLabelUpperClass}>Оценка размера</span>
            <input
              type="text"
              inputMode="numeric"
              className={detailInputClass}
              {...estimatedSizeField}
            />
          </label>
          <label
            className={`${detailControlClass} flex min-h-0 flex-1 flex-col gap-1.5`}
          >
            <span className={detailLabelUpperClass}>
              Студенты (по одному email в строке)
              <span className="text-base-content/55 ml-1.5 font-medium tabular-nums">
                · {emailLineCount}
              </span>
            </span>
            <textarea
              className={detailStudentsTextareaClass}
              {...studentsField}
            />
          </label>

          <SettingsDetailDeleteButton
            label="Удалить группу"
            onClick={() => {
              void deleteStudentGroupCascade(groupId).then(() => {
                deselectItem();
              });
            }}
          />
          {isDeleting ? (
            <span className="loading loading-spinner loading-sm" />
          ) : null}
        </div>
      </DetailQueryState>
    </SettingsSidebarDetailFrame>
  );
}

export function ProgramDetails({
  sectionCode,
  programIndex,
}: {
  sectionCode: string;
  programIndex: number;
}) {
  const { program, isPending, isError, error } = useProgram(
    sectionCode,
    programIndex,
  );
  const { updateProgram } = useUpdateProgramMutation(sectionCode, programIndex);
  const { deleteProgram, isPending: isDeleting } = useDeleteProgramFromSection(
    sectionCode,
    programIndex,
  );
  const { selectItem, deselectItem } = useSelection();
  const name = String(program?.name ?? "");
  const code = String(program?.code ?? "");
  const programIdentity = program ? programStableId(program) : code;
  const headingTitle = String(program?.name || programIdentity);
  const headingSubtitle = `Программа · ${sectionCode}`;
  const kind = program && "kind" in program ? String(program.kind ?? "") : "";
  const language = String(program?.language ?? "");
  const year = program?.year != null ? String(program.year) : "";
  const tracks = (
    program ? normalizeTracksFromSectionProgram(program) : []
  ).map((track, trackIdx) => ({
    id: String(trackIdx),
    title: String(track?.name || "Track"),
  }));
  const nameField = useBlurSaveField(name, (value) =>
    updateProgram((target) => {
      target.name = value;
    }),
  );
  const codeField = useBlurSaveField(code, (value) =>
    updateProgram((target) => {
      target.code = value;
    }),
  );
  const kindField = useBlurSaveField(kind, (value) =>
    updateProgram((target) => {
      if (!("kind" in target)) return;
      (target as Record<string, unknown>).kind = value;
    }),
  );
  const languageField = useBlurSaveField(language, (value) =>
    updateProgram((target) => {
      target.language =
        value === "en"
          ? SectionProgramLanguageAnyOf0.en
          : value === "ru"
            ? SectionProgramLanguageAnyOf0.ru
            : null;
    }),
  );
  const yearField = useBlurSaveField(year, (value) =>
    updateProgram((target) => {
      const parsed = Number(value);
      target.year = Number.isFinite(parsed) ? parsed : null;
    }),
  );
  const timeSlots = formatTermTimeSlots(program?.time_slots ?? undefined);
  const timeSlotsField = useBlurSaveField(timeSlots, (value) =>
    updateProgram((target) => {
      const parsed = parseTermTimeSlotsText(value);
      target.time_slots = parsed.length ? parsed : null;
    }),
  );
  const timeSlotsTextareaRef = useAutosizeTextareaRef(timeSlotsField.value);

  return (
    <SettingsSidebarDetailFrame title={headingTitle} subtitle={headingSubtitle}>
      <DetailQueryState isPending={isPending} isError={isError} error={error}>
        <div className={settingsDetailShellClass}>
          <label className={`${detailControlClass} shrink-0`}>
            <span className={detailLabelUpperClass}>Название</span>
            <input className={detailInputClass} {...nameField} />
          </label>
          <label className={`${detailControlClass} shrink-0`}>
            <span className={detailLabelUpperClass}>Код</span>
            <input className={detailInputClass} {...codeField} />
          </label>
          <label className={`${detailControlClass} shrink-0`}>
            <span className={detailLabelUpperClass}>Тип</span>
            <input className={detailInputClass} {...kindField} />
          </label>
          <label className={`${detailControlClass} shrink-0`}>
            <span className={detailLabelUpperClass}>Язык</span>
            <input className={detailInputClass} {...languageField} />
          </label>
          <label className={`${detailControlClass} shrink-0`}>
            <span className={detailLabelUpperClass}>Год</span>
            <input className={detailInputClass} {...yearField} />
          </label>
          <label className={`${detailControlClass} shrink-0`}>
            <span className={detailLabelUpperClass}>Таймслоты программы</span>
            <textarea
              ref={timeSlotsTextareaRef}
              className={detailTimeSlotsTextareaClass}
              {...timeSlotsField}
              onKeyDown={handleEscapeBlur}
              placeholder="Пусто = слоты семестра. Пример: 09:10-10:40, 10:50-12:20"
            />
          </label>

          <SettingsDetailNestedList
            sectionTitle="Треки"
            addButtonLabel="Добавить трек"
            onAdd={() =>
              updateProgram((target) => {
                target.tracks.push({
                  code: `new-track-${target.tracks.length + 1}`,
                  name: `Новый трек ${target.tracks.length + 1}`,
                  kind: null,
                  groups: [],
                });
              })
            }
            emptyHint="Нет треков"
            isEmpty={!tracks.length}
          >
            {tracks.map(
              (track: { id: string; title: string }, index: number) => (
                <SettingsDetailReorderRow
                  key={track.id}
                  disableMoveUp={index === 0}
                  disableMoveDown={index === tracks.length - 1}
                  onMoveUp={() =>
                    updateProgram((target) => {
                      const [moved] = target.tracks.splice(index, 1);
                      target.tracks.splice(index - 1, 0, moved);
                    })
                  }
                  onMoveDown={() =>
                    updateProgram((target) => {
                      const [moved] = target.tracks.splice(index, 1);
                      target.tracks.splice(index + 1, 0, moved);
                    })
                  }
                  onDelete={() =>
                    updateProgram((target) => {
                      target.tracks.splice(index, 1);
                    })
                  }
                >
                  <SettingsDetailSelectableRowButton
                    title={track.title}
                    onClick={() =>
                      selectItem({
                        kind: "track",
                        sectionCode,
                        programIndex,
                        trackIndex: Number(track.id),
                      })
                    }
                  />
                </SettingsDetailReorderRow>
              ),
            )}
          </SettingsDetailNestedList>

          <SettingsDetailDeleteButton
            label="Удалить программу"
            onClick={() => {
              deleteProgram();
              deselectItem();
            }}
          />
          {isDeleting ? (
            <span className="loading loading-spinner loading-sm" />
          ) : null}
        </div>
      </DetailQueryState>
    </SettingsSidebarDetailFrame>
  );
}

export function TrackDetails({
  sectionCode,
  programIndex,
  trackIndex,
  titleFallback,
}: {
  sectionCode: string;
  programIndex: number;
  trackIndex: number;
  titleFallback?: string;
}) {
  const { config } = useConfig();
  const { track, program, isPending, isError, error } = useTrack(
    sectionCode,
    programIndex,
    trackIndex,
  );
  const { updateProgram } = useUpdateProgramMutation(sectionCode, programIndex);
  const { mutate: createStudentGroup } = useCreateStudentGroupMutation();
  const { deleteStudentGroupCascade } = useDeleteStudentGroupCascade();
  const { selectItem, deselectItem } = useSelection();
  const name = String(track?.name ?? titleFallback ?? "");
  const programTitleForSubtitle = String(
    program?.name || (program ? programStableId(program) : ""),
  );
  const headingTitle = name;
  const headingSubtitle = `Трек · ${programTitleForSubtitle}`;
  const code = track && "code" in track ? String(track.code ?? "") : "";
  const kind = track && "kind" in track ? String(track.kind ?? "") : "";
  const trackGroups = Array.isArray(track?.groups) ? track.groups : [];
  const studentsGroups = Array.isArray(config?.students_groups)
    ? config.students_groups
    : [];
  const groups = trackGroups.map((groupId: string) => {
    const groupEntity = studentsGroups.find(
      (candidate) => String(candidate.code) === String(groupId),
    );
    return {
      id: String(groupId),
      title: String(groupEntity?.name || groupId),
    };
  });
  const nameField = useBlurSaveField(name, (value) =>
    updateProgram((target) => {
      if (programUsesExplicitTracks(target)) {
        target.tracks[trackIndex].name = value;
        return;
      }
      if (trackIndex !== 0) return;
      target.code = value;
    }),
  );
  const codeField = useBlurSaveField(code, (value) =>
    updateProgram((target) => {
      const draftTrack = target.tracks[trackIndex];
      if (!("code" in draftTrack)) return;
      (draftTrack as Record<string, unknown>).code = value;
    }),
  );
  const kindField = useBlurSaveField(kind, (value) =>
    updateProgram((target) => {
      const draftTrack = target.tracks[trackIndex];
      if (!("kind" in draftTrack)) return;
      (draftTrack as Record<string, unknown>).kind = value;
    }),
  );

  return (
    <SettingsSidebarDetailFrame title={headingTitle} subtitle={headingSubtitle}>
      <DetailQueryState isPending={isPending} isError={isError} error={error}>
        <div className={settingsDetailShellClass}>
          <label className={`${detailControlClass} shrink-0`}>
            <span className={detailLabelUpperClass}>Название</span>
            <input className={detailInputClass} {...nameField} />
          </label>
          <label className={`${detailControlClass} shrink-0`}>
            <span className={detailLabelUpperClass}>Код</span>
            <input className={detailInputClass} {...codeField} />
          </label>
          <label className={`${detailControlClass} shrink-0`}>
            <span className={detailLabelUpperClass}>Тип</span>
            <input className={detailInputClass} {...kindField} />
          </label>

          <SettingsDetailNestedList
            sectionTitle="Группы"
            addButtonLabel="Добавить группу"
            onAdd={() => {
              if (!program || !track) return;
              const draftTrack = structuredClone(track);
              const existingIds = [...draftTrack.groups];
              const { code: newGroupId, name: newGroupName } =
                nextGroupIdentifiers(
                  existingIds,
                  (id) => {
                    const entity = studentsGroups.find(
                      (candidate) => candidate.code === id,
                    );
                    return entity?.name ?? undefined;
                  },
                  {
                    programCode: programCodeForGroupIdentifiers(
                      program,
                      sectionCode,
                      programIndex,
                    ),
                    track: draftTrack,
                  },
                );
              updateProgram((target) => {
                mutateNormalizedTrackGroups(target, trackIndex, (groups) => [
                  ...groups,
                  newGroupId,
                ]);
              });
              createStudentGroup({
                body: {
                  code: newGroupId,
                  kind: "core",
                  name: newGroupName,
                  estimated_size: null,
                  students: [],
                },
              });
            }}
            emptyHint="Нет групп"
            isEmpty={!groups.length}
          >
            {groups.map(
              (group: { id: string; title: string }, index: number) => (
                <SettingsDetailReorderRow
                  key={group.id}
                  disableMoveUp={index === 0}
                  disableMoveDown={index === groups.length - 1}
                  onMoveUp={() => {
                    if (index <= 0) return;
                    const reordered = [...trackGroups];
                    const [moved] = reordered.splice(index, 1);
                    reordered.splice(index - 1, 0, moved);
                    updateProgram((target) => {
                      mutateNormalizedTrackGroups(
                        target,
                        trackIndex,
                        () => reordered,
                      );
                    });
                  }}
                  onMoveDown={() => {
                    if (index >= trackGroups.length - 1) return;
                    const reordered = [...trackGroups];
                    const [moved] = reordered.splice(index, 1);
                    reordered.splice(index + 1, 0, moved);
                    updateProgram((target) => {
                      mutateNormalizedTrackGroups(
                        target,
                        trackIndex,
                        () => reordered,
                      );
                    });
                  }}
                  onDelete={() => {
                    void deleteStudentGroupCascade(String(group.id));
                  }}
                >
                  <SettingsDetailSelectableRowButton
                    title={group.title}
                    subtitle={group.id !== group.title ? group.id : undefined}
                    onClick={() =>
                      selectItem({
                        kind: "group",
                        sectionCode,
                        programIndex,
                        trackIndex,
                        groupId: String(group.id),
                      })
                    }
                  />
                </SettingsDetailReorderRow>
              ),
            )}
          </SettingsDetailNestedList>

          <SettingsDetailDeleteButton
            label="Удалить трек"
            onClick={() => {
              updateProgram((target) => {
                target.tracks.splice(trackIndex, 1);
              });
              deselectItem();
            }}
          />
        </div>
      </DetailQueryState>
    </SettingsSidebarDetailFrame>
  );
}

function SharePreferenceLinkButton({
  instructorId,
}: {
  instructorId: string | undefined;
}) {
  const { showError, showSuccess } = useToast();
  const { mutate, isPending } = $scheduleAssistant.useMutation(
    "post",
    "/instructor-preferences/{instructor_id}/share-link",
  );

  return (
    <button
      type="button"
      className="btn btn-outline btn-secondary btn-sm mt-2 w-fit"
      disabled={!instructorId || isPending}
      onClick={() => {
        if (!instructorId) return;
        mutate(
          { params: { path: { instructor_id: instructorId } } },
          {
            onSuccess: async (data) => {
              const url = `${window.location.origin}/schedule-assistant/preferences/${data.token}`;
              await navigator.clipboard.writeText(url);
              showSuccess("Ссылка скопирована", url);
            },
            onError: (error) => {
              showError("Ошибка", formatApiErrorMessage(error));
            },
          },
        );
      }}
    >
      {isPending ? (
        <span className="loading loading-spinner loading-sm" />
      ) : (
        "Скопировать ссылку для преподавателя"
      )}
    </button>
  );
}

export function InstructorDetails({
  instructorIndex,
}: {
  instructorIndex: number;
}) {
  const { instructor, instructorId, isPending, isError, error } =
    useInstructor(instructorIndex);
  const { patchInstructor } = usePatchInstructorMutation(instructorId);
  const { term } = useSemesterSettings();
  const { mutate: deleteInstructor, isPending: isDeleting } =
    useDeleteInstructorMutation();
  const { deselectItem } = useSelection();
  const headingTitle =
    instructor?.name_ru ??
    instructor?.name_en ??
    instructor?.email ??
    instructor?.id ??
    "";
  const headingSubtitle = "Преподаватель";
  const nameRuField = useBlurSaveField(instructor?.name_ru ?? "", (value) =>
    patchInstructor({ name_ru: value.trim() || null }),
  );
  const nameEnField = useBlurSaveField(instructor?.name_en ?? "", (value) =>
    patchInstructor({ name_en: value.trim() || null }),
  );
  const idField = useBlurSaveField(instructor?.id ?? "", (value) =>
    patchInstructor({ id: value.trim() }),
  );
  const emailField = useBlurSaveField(instructor?.email ?? "", (value) =>
    patchInstructor({ email: value.trim() || null }),
  );
  const aliasField = useBlurSaveField(instructor?.alias ?? "", (value) =>
    patchInstructor({ alias: value.trim() || null }),
  );
  const positionField = useBlurSaveField(instructor?.position ?? "", (value) =>
    patchInstructor({ position: value.trim() || null }),
  );
  const positionOptions = (term?.instructor_positions ?? []).filter(Boolean);

  return (
    <SettingsSidebarDetailFrame title={headingTitle} subtitle={headingSubtitle}>
      <DetailQueryState isPending={isPending} isError={isError} error={error}>
        <div className={settingsDetailShellClass}>
          <label className={`${detailControlClass} shrink-0`}>
            <span className={detailLabelUpperClass}>Имя (на русском)</span>
            <input className={detailInputClass} {...nameRuField} />
          </label>
          <label className={`${detailControlClass} shrink-0`}>
            <span className={detailLabelUpperClass}>Имя (на английском)</span>
            <input className={detailInputClass} {...nameEnField} />
          </label>
          <label className={`${detailControlClass} shrink-0`}>
            <span className={detailLabelUpperClass}>Идентификатор</span>
            <input className={detailInputClass} {...idField} />
          </label>
          <label className={`${detailControlClass} shrink-0`}>
            <span className={detailLabelUpperClass}>Корпоративная почта</span>
            <input className={detailInputClass} {...emailField} />
          </label>
          <label className={`${detailControlClass} shrink-0`}>
            <span className={detailLabelUpperClass}>Алиас Telegram</span>
            <input className={detailInputClass} {...aliasField} />
          </label>
          <div className={`${detailControlClass} shrink-0`}>
            <span className={detailLabelUpperClass}>Должность</span>
            {positionOptions.length > 0 ? (
              <SelectDropdown
                value={instructor?.position ?? ""}
                onChange={(value) =>
                  patchInstructor({
                    position: value.trim() || null,
                  })
                }
                options={[
                  { value: "", label: "Не задано" },
                  ...positionOptions.map((position) => ({
                    value: position,
                    label: position,
                  })),
                  ...(instructor?.position &&
                  !positionOptions.includes(instructor.position)
                    ? [
                        {
                          value: instructor.position,
                          label: `${instructor.position} (вне списка)`,
                        },
                      ]
                    : []),
                ]}
                placeholder="Не задано"
                triggerClassName="w-full"
              />
            ) : (
              <input className={detailInputClass} {...positionField} />
            )}
          </div>
          <div className={`${detailControlClass} min-h-0 min-w-0 shrink-0`}>
            <span className={detailLabelUpperClass}>
              Предпочтения по времени
            </span>
            <InstructorPreferenceGrid
              term={term ?? undefined}
              preferences={instructor?.slot_preferences ?? []}
              onChange={(slot_preferences) =>
                patchInstructor({ slot_preferences })
              }
            />
            <SharePreferenceLinkButton instructorId={instructorId} />
          </div>
          <SettingsDetailDeleteButton
            label="Удалить преподавателя"
            onClick={() => {
              if (!instructorId) return;
              deleteInstructor({
                params: { path: { instructor_id: instructorId } },
              });
              deselectItem();
            }}
          />
          {isDeleting ? (
            <span className="loading loading-spinner loading-sm" />
          ) : null}
        </div>
      </DetailQueryState>
    </SettingsSidebarDetailFrame>
  );
}

export function SemesterDetails() {
  const { term, isPending, isError, error } = useSemesterSettings();
  const { patchTerm } = usePatchTermMutation();
  const termName = String(term?.name ?? "");
  const startDate = toDateInputValue(term?.semester?.start_date);
  const endDate = toDateInputValue(term?.semester?.end_date);
  const days = normalizeTermWeekdays(term?.days);
  const startingDay =
    normalizeTermWeekdays(term?.starting_day ? [term.starting_day] : [])[0] ??
    "";
  const timeSlots = formatTermTimeSlots(term?.time_slots);
  const termNameField = useBlurSaveField(termName, (value) =>
    patchTerm((current) => ({ ...current, name: value })),
  );
  const startDateField = useBlurSaveField(startDate, (value) =>
    patchTerm((current) => ({
      ...current,
      semester: {
        ...current.semester,
        start_date: value,
      },
    })),
  );
  const endDateField = useBlurSaveField(endDate, (value) =>
    patchTerm((current) => ({
      ...current,
      semester: {
        ...current.semester,
        end_date: value,
      },
    })),
  );
  const timeSlotsField = useBlurSaveField(timeSlots, (value) =>
    patchTerm((current) => ({
      ...current,
      time_slots: parseTermTimeSlotsText(value),
    })),
  );

  function handleToggleDay(key: TermWeekdayKey) {
    patchTerm((current) => ({
      ...current,
      days: termWeekdayKeysToWeekdays(toggleTermWeekday(days, key)),
    }));
  }

  const timeSlotsTextareaRef = useAutosizeTextareaRef(timeSlotsField.value);

  if (isPending) {
    return <div className="skeleton h-40 w-full" />;
  }

  if (isError) {
    return (
      <div className="alert alert-error alert-soft text-sm">
        {formatApiErrorMessage(error)}
      </div>
    );
  }

  return (
    <div className={`${settingsDetailShellClass} pb-6`}>
      <label className={`${detailControlClass} shrink-0`}>
        <span className={detailLabelUpperClass}>Название семестра</span>
        <input
          className={detailInputClass}
          {...termNameField}
          onKeyDown={handleEscapeBlur}
        />
      </label>
      <label className={`${detailControlClass} shrink-0`}>
        <span className={detailLabelUpperClass}>Начало периода</span>
        <input
          type="date"
          className={detailInputClass}
          {...startDateField}
          onKeyDown={handleEscapeBlur}
        />
      </label>
      <label className={`${detailControlClass} shrink-0`}>
        <span className={detailLabelUpperClass}>Окончание периода</span>
        <input
          type="date"
          className={detailInputClass}
          {...endDateField}
          onKeyDown={handleEscapeBlur}
        />
      </label>
      <div className={`${detailControlClass} shrink-0`}>
        <span className={detailLabelUpperClass}>Учебные дни</span>
        <div className="flex flex-wrap gap-2">
          {TERM_WEEKDAY_KEYS.map((key) => {
            const active = days.includes(key);
            return (
              <button
                key={key}
                type="button"
                className={clsx(
                  "btn btn-sm border-base-300 min-w-[2.75rem] font-medium transition-colors",
                  active
                    ? "btn-secondary text-secondary-content"
                    : "btn-outline bg-base-100 text-base-content/55 hover:border-base-content/30",
                )}
                onClick={() => handleToggleDay(key)}
              >
                {TERM_WEEKDAY_LABEL_RU[key]}
              </button>
            );
          })}
        </div>
      </div>
      <div className={`${detailControlClass} shrink-0`}>
        <span className={detailLabelUpperClass}>Начальный день недели</span>
        <div className="flex flex-wrap gap-2">
          {TERM_WEEKDAY_KEYS.map((key) => {
            const active = startingDay == key;
            return (
              <button
                key={key}
                type="button"
                className={clsx(
                  "btn btn-sm border-base-300 min-w-[2.75rem] font-medium transition-colors",
                  active
                    ? "btn-secondary text-secondary-content"
                    : "btn-outline bg-base-100 text-base-content/55 hover:border-base-content/30",
                )}
                onClick={() =>
                  patchTerm((current) => ({
                    ...current,
                    starting_day: termWeekdayKeyToWeekday(key),
                  }))
                }
              >
                {TERM_WEEKDAY_LABEL_RU[key]}
              </button>
            );
          })}
        </div>
      </div>
      <label className={`${detailControlClass} shrink-0`}>
        <span className={detailLabelUpperClass}>Таймслоты</span>
        <textarea
          ref={timeSlotsTextareaRef}
          className={detailTimeSlotsTextareaClass}
          {...timeSlotsField}
          onKeyDown={handleEscapeBlur}
        />
      </label>
      <div className={`${detailControlClass} shrink-0 pb-1`}>
        <span className={detailLabelUpperClass}>Вид таблицы по умолчанию</span>
        <div className="grid w-fit grid-cols-[auto_auto] items-center gap-x-2 gap-y-2 p-0.5">
          {(term?.sections ?? []).map((section, sectionIndex) => (
            <Fragment key={section.code || sectionIndex}>
              <span className="text-sm font-medium whitespace-nowrap">
                {section.name || section.code}
              </span>
              <select
                className="select select-bordered select-sm focus:outline-offset-0"
                value={section.default_layout ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  patchTerm((current) => {
                    const next = structuredClone(current);
                    const target = next.sections?.[sectionIndex];
                    if (!target) return current;
                    target.default_layout =
                      value === "groups" || value === "calendar" ? value : null;
                    return next;
                  });
                }}
              >
                <option value="">Не задано</option>
                <option value="groups">По группам</option>
                <option value="calendar">По дням</option>
              </select>
            </Fragment>
          ))}
          {(term?.sections ?? []).length === 0 ? (
            <div className="text-base-content/60 col-span-2 text-sm">
              Нет секций
            </div>
          ) : null}
        </div>
      </div>
      <StringListEditor
        title="Должности преподавателей"
        emptyHint="Список пуст — должность можно вводить свободно."
        addPlaceholder="Новая должность"
        values={term?.instructor_positions ?? []}
        onChange={(instructor_positions) =>
          patchTerm((current) => ({ ...current, instructor_positions }))
        }
      />
      <StringListEditor
        title="Роли преподавателя на курсе"
        emptyHint="Список пуст — роль на курсе можно задавать свободно."
        addPlaceholder="Новая роль"
        values={term?.course_instructor_roles ?? []}
        onChange={(course_instructor_roles) =>
          patchTerm((current) => ({ ...current, course_instructor_roles }))
        }
      />
      <StringListEditor
        title="Теги компонентов курса"
        emptyHint="Список пуст — тег компонента можно задавать свободно."
        addPlaceholder="Новый тег"
        values={term?.course_component_tags ?? []}
        onChange={(course_component_tags) =>
          patchTerm((current) => ({ ...current, course_component_tags }))
        }
      />
    </div>
  );
}

function StringListEditor({
  title,
  emptyHint,
  addPlaceholder,
  values,
  onChange,
}: {
  title: string;
  emptyHint: string;
  addPlaceholder: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className={`${detailControlClass} shrink-0 pb-1`}>
      <span className={detailLabelUpperClass}>{title}</span>
      <div className="grid w-fit grid-cols-[auto_auto] items-center gap-x-2 gap-y-2 p-0.5">
        {values.length === 0 ? (
          <div className="text-base-content/60 col-span-2 text-sm">
            {emptyHint}
          </div>
        ) : (
          values.map((value, index) => (
            <Fragment key={`${value}-${index}`}>
              <span className="text-sm font-medium whitespace-nowrap">
                {value}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-xs justify-self-start"
                onClick={() =>
                  onChange(
                    values.filter((_, valueIndex) => valueIndex !== index),
                  )
                }
              >
                Удалить
              </button>
            </Fragment>
          ))
        )}
        <input
          className="input input-bordered input-sm w-44 max-w-full px-3 py-1.5 text-sm leading-normal font-normal [color-scheme:inherit] focus:outline-offset-0"
          placeholder={addPlaceholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            const next = draft.trim();
            if (!next || values.includes(next)) return;
            onChange([...values, next]);
            setDraft("");
          }}
        />
        <button
          type="button"
          className="btn btn-outline btn-secondary btn-sm justify-self-start"
          disabled={!draft.trim()}
          onClick={() => {
            const next = draft.trim();
            if (!next || values.includes(next)) return;
            onChange([...values, next]);
            setDraft("");
          }}
        >
          Добавить
        </button>
      </div>
    </div>
  );
}
