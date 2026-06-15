import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import {
  SchemaCourseConfig,
  SchemaSectionProgram,
  SectionProgramLanguageAnyOf0,
} from "@/api/schedule-assistant/types.ts";
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
} from "@/components/schedule-assistant/config/useConfig.tsx";
import {
  collectKnownStudentGroupIds,
  courseComponentsYamlLintExtensions,
  validateCourseComponentsYaml,
} from "@/components/schedule-assistant/settings/courses/courseComponentsYamlLint.ts";
import {
  mutateNormalizedTrackGroups,
  normalizeTracksFromSectionProgram,
  programUsesExplicitTracks,
} from "@/components/schedule-assistant/settings/groups/normalizeTrackFromSectionProgram.ts";
import { InstructorPreferenceGrid } from "@/components/schedule-assistant/settings/instructors/InstructorPreferenceGrid.tsx";
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
  useCallback,
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
      patchRoom({ capacity: Number(value) || 0 });
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

export function CourseDetails({ courseIndex }: { courseIndex: number }) {
  const { config } = useConfig();
  const { course, courseName, isPending, isError, error } =
    useCourse(courseIndex);
  const { patchCourse } = usePatchCourseMutation(courseName);
  const { mutate: deleteCourse, isPending: isDeleting } =
    useDeleteCourseMutation();
  const { mutate: createStudentGroup } = useCreateStudentGroupMutation();
  const { deselectItem } = useSelection();
  const name = String(course?.name ?? "");
  const tags = Array.isArray(course?.course_tags)
    ? course.course_tags.join(", ")
    : "";
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
  const tagsField = useBlurSaveField(tags, (value) =>
    patchCourse({
      course_tags: value
        .split(",")
        .map((chunk) => chunk.trim())
        .filter(Boolean),
    }),
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
          <label className={`${detailControlClass} shrink-0`}>
            <span className={detailLabelUpperClass}>
              Теги курса (через запятую)
            </span>
            <input className={detailInputClass} {...tagsField} />
          </label>

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
          <label className={`${detailControlClass} shrink-0`}>
            <span className={detailLabelUpperClass}>Должность</span>
            <input className={detailInputClass} {...positionField} />
          </label>
          <div className={`${detailControlClass} min-h-0 min-w-0 shrink-0`}>
            <span className={detailLabelUpperClass}>
              Предпочтения по времени
            </span>
            <InstructorPreferenceGrid
              term={term}
              preferences={instructor?.slot_preferences ?? []}
              onChange={(slot_preferences) =>
                patchInstructor({ slot_preferences })
              }
            />
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
    <div className={settingsDetailShellClass}>
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
    </div>
  );
}
