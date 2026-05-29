/* eslint-disable react-hooks/immutability */
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
  deleteStudentGroupFromDraft,
  mutateProgramInDraft,
  renameStudentGroupInDraft,
  useConfig,
  useCourse,
  useInstructor,
  useProgram,
  useRoom,
  useSemesterSettings,
  useStudentGroup,
  useTrack,
} from "@/components/schedule-assistant/config/useConfig.tsx";
import {
  collectKnownStudentGroupIds,
  courseComponentsYamlLintExtensions,
  validateCourseComponentsYaml,
} from "@/components/schedule-assistant/settings/courses/courseComponentsYamlLint.ts";
import { useSelection } from "@/components/schedule-assistant/settings/useSelection.tsx";
import {
  TERM_WEEKDAY_KEYS,
  TERM_WEEKDAY_LABEL_RU,
  type TermWeekdayKey,
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
const settingsDetailShellClass = "flex min-h-0 flex-1 flex-col gap-3";

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

/** Одна строка — один элемент массива; пустые строки сохраняются (вставка между слотами, новая строка в конце). */
function parseTermTimeSlotsText(raw: string): string[] {
  return raw.split("\n").map((value) => value.trim());
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
  const { room, roomState, roomIndex } = useRoom(roomId);
  const { updateConfigData } = useConfig();
  const { deselectItem } = useSelection();
  const headingTitle = room ? String(room.id) : roomId || "—";
  const headingSubtitle = "Аудитория";

  if (!room) {
    return (
      <SettingsSidebarDetailFrame
        title={headingTitle}
        subtitle={headingSubtitle}
      >
        <div className={settingsDetailShellClass}>
          <div className="text-base-content/70 text-sm">
            Аудитория не найдена в конфигурации.
          </div>
        </div>
      </SettingsSidebarDetailFrame>
    );
  }

  return (
    <SettingsSidebarDetailFrame title={headingTitle} subtitle={headingSubtitle}>
      <div className={settingsDetailShellClass}>
        <label className={`${detailControlClass} shrink-0`}>
          <span className={detailLabelUpperClass}>Идентификатор</span>
          <input
            className={detailInputClass}
            value={String(room?.id ?? "")}
            onChange={(event) => {
              if (!roomState) return;
              roomState.id = event.target.value;
            }}
          />
        </label>
        <label className={`${detailControlClass} shrink-0`}>
          <span className={detailLabelUpperClass}>Название</span>
          <input
            className={detailInputClass}
            value={String(room?.name ?? "")}
            onChange={(event) => {
              if (!roomState) return;
              roomState.name = event.target.value;
            }}
          />
        </label>
        <label className={`${detailControlClass} shrink-0`}>
          <span className={detailLabelUpperClass}>Вместимость</span>
          <input
            type="number"
            className={detailInputClass}
            value={room?.capacity != null ? String(room.capacity) : ""}
            onChange={(event) => {
              if (!roomState) return;
              roomState.capacity = Number(event.target.value) || 0;
            }}
          />
        </label>
        <SettingsDetailDeleteButton
          label="Удалить аудиторию"
          onClick={() => {
            updateConfigData((draft) => {
              draft.rooms.splice(roomIndex, 1);
            });
            deselectItem();
          }}
        />
      </div>
    </SettingsSidebarDetailFrame>
  );
}

export function CourseDetails({ courseIndex }: { courseIndex: number }) {
  const { config, updateConfigData } = useConfig();
  const { course, courseState } = useCourse(courseIndex);
  const { deselectItem } = useSelection();
  const name = String(course?.name ?? "");
  const tags = Array.isArray(course?.course_tags)
    ? course.course_tags.join(", ")
    : "";
  const components = Array.isArray(course?.components) ? course.components : [];
  const componentTags = components
    .map((comp: { tag?: string }) => comp?.tag)
    .filter(Boolean);
  const headingTitle = String(course?.name || `Курс #${courseIndex + 1}`);
  const headingSubtitle = componentTags.length ? componentTags.join(", ") : "—";
  const knownStudentGroupIds = useMemo(
    () => collectKnownStudentGroupIds(config),
    [config],
  );

  const componentsSignature = stringify(components, { lineWidth: 0 });
  const [yamlText, setYamlText] = useState(componentsSignature);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleCreateStudentGroup = useCallback(
    (groupId: string) => {
      const normalized = groupId.trim();
      if (!normalized) return;
      updateConfigData((draft) => {
        const exists = draft.students_groups.some(
          (candidate) => String(candidate.code) === normalized,
        );
        if (exists) return;
        draft.students_groups.push({
          code: normalized,
          kind: "core",
          name: normalized,
          estimated_size: null,
          students: [],
        });
      });
    },
    [updateConfigData],
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
    setParseError(null);
  }, [courseIndex, componentsSignature]);

  function handleCommitYaml() {
    const result = validateCourseComponentsYaml(yamlText);
    if (!result.ok) {
      setParseError(result.error);
      return;
    }
    setParseError(null);
    updateConfigData((draft) => {
      draft.courses[courseIndex].components =
        result.value as SchemaCourseConfig["components"];
    });
  }

  return (
    <SettingsSidebarDetailFrame title={headingTitle} subtitle={headingSubtitle}>
      <div className={settingsDetailShellClass}>
        <label className={`${detailControlClass} shrink-0`}>
          <span className={detailLabelUpperClass}>Название</span>
          <input
            className={detailInputClass}
            value={name}
            onChange={(event) => {
              if (!courseState) return;
              courseState.name = event.target.value;
            }}
          />
        </label>
        <label className={`${detailControlClass} shrink-0`}>
          <span className={detailLabelUpperClass}>
            Теги курса (через запятую)
          </span>
          <input
            className={detailInputClass}
            value={tags}
            onChange={(event) => {
              if (!courseState) return;
              courseState.course_tags = event.target.value
                .split(",")
                .map((chunk) => chunk.trim())
                .filter(Boolean);
            }}
          />
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
                keymap.of(lintKeymap),
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
            updateConfigData((draft) => {
              draft.courses.splice(courseIndex, 1);
            });
            deselectItem();
          }}
        />
      </div>
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
  const { studentGroup, studentGroupState } = useStudentGroup(groupId);
  const { updateConfigData } = useConfig();
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

  const emailLineCount = students
    .split("\n")
    .map((line: string) => line.trim())
    .filter(Boolean).length;

  return (
    <SettingsSidebarDetailFrame title={headingTitle} subtitle={headingSubtitle}>
      <div className={settingsDetailShellClass}>
        <label className={`${detailControlClass} shrink-0`}>
          <span className={detailLabelUpperClass}>Название</span>
          <input
            className={detailInputClass}
            value={name}
            onChange={(event) => {
              if (!studentGroupState) return;
              studentGroupState.name = event.target.value;
            }}
          />
        </label>
        <label className={`${detailControlClass} shrink-0`}>
          <span className={detailLabelUpperClass}>Код</span>
          <input
            className={detailInputClass}
            value={code}
            onChange={(event) => {
              const newId = event.target.value.trim();
              if (!newId || newId === groupId) return;
              updateConfigData((draft) => {
                renameStudentGroupInDraft(draft, groupId, newId);
              });
              selectItem({
                kind: "group",
                sectionCode,
                programIndex,
                trackIndex,
                groupId: newId,
              });
            }}
          />
        </label>
        <label className={`${detailControlClass} shrink-0`}>
          <span className={detailLabelUpperClass}>Тип</span>
          <input
            className={detailInputClass}
            value={kind}
            onChange={(event) => {
              if (!studentGroupState) return;
              studentGroupState.kind = event.target.value;
            }}
          />
        </label>
        <label className={`${detailControlClass} shrink-0`}>
          <span className={detailLabelUpperClass}>Оценка размера</span>
          <input
            type="text"
            inputMode="numeric"
            className={detailInputClass}
            value={estimatedSize}
            onChange={(event) => {
              if (!studentGroupState) return;
              const parsed = Number(event.target.value.trim());
              studentGroupState.estimated_size = Number.isFinite(parsed)
                ? parsed
                : null;
            }}
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
            value={students}
            onChange={(event) => {
              if (!studentGroupState) return;
              studentGroupState.students = event.target.value
                .split("\n")
                .map((chunk) => chunk.trim())
                .filter(Boolean);
            }}
          />
        </label>

        <SettingsDetailDeleteButton
          label="Удалить группу"
          onClick={() => {
            updateConfigData((draft) => {
              deleteStudentGroupFromDraft(draft, groupId);
            });
            deselectItem();
          }}
        />
      </div>
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
  const { updateConfigData } = useConfig();
  const { program, programState } = useProgram(sectionCode, programIndex);
  const { selectItem, deselectItem } = useSelection();
  const name = String(program?.name ?? "");
  const code = String(program?.code ?? "");
  const programIdentity = program ? programStableId(program) : code;
  const headingTitle = String(program?.name || programIdentity);
  const headingSubtitle = `Программа · ${sectionCode}`;
  const kind = program && "kind" in program ? String(program.kind ?? "") : "";
  const language = String(program?.language ?? "");
  const year = program?.year != null ? String(program.year) : "";
  const tracks = (Array.isArray(program?.tracks) ? program.tracks : []).map(
    (track, trackIdx: number) => ({
      id: String(trackIdx),
      title: String(track?.name || "Track"),
    }),
  );

  return (
    <SettingsSidebarDetailFrame title={headingTitle} subtitle={headingSubtitle}>
      <div className={settingsDetailShellClass}>
        <label className={`${detailControlClass} shrink-0`}>
          <span className={detailLabelUpperClass}>Название</span>
          <input
            className={detailInputClass}
            value={name}
            onChange={(event) => {
              if (!programState) return;
              programState.name = event.target.value;
            }}
          />
        </label>
        <label className={`${detailControlClass} shrink-0`}>
          <span className={detailLabelUpperClass}>Код</span>
          <input
            className={detailInputClass}
            value={code}
            onChange={(event) => {
              if (!programState) return;
              programState.code = event.target.value;
            }}
          />
        </label>
        <label className={`${detailControlClass} shrink-0`}>
          <span className={detailLabelUpperClass}>Тип</span>
          <input
            className={detailInputClass}
            value={kind}
            onChange={(event) => {
              if (!programState || !("kind" in programState)) return;
              (programState as Record<string, unknown>).kind =
                event.target.value;
            }}
          />
        </label>
        <label className={`${detailControlClass} shrink-0`}>
          <span className={detailLabelUpperClass}>Язык</span>
          <input
            className={detailInputClass}
            value={language}
            onChange={(event) => {
              if (!programState) return;
              programState.language =
                event.target.value === "en"
                  ? SectionProgramLanguageAnyOf0.en
                  : event.target.value === "ru"
                    ? SectionProgramLanguageAnyOf0.ru
                    : null;
            }}
          />
        </label>
        <label className={`${detailControlClass} shrink-0`}>
          <span className={detailLabelUpperClass}>Год</span>
          <input
            className={detailInputClass}
            value={year}
            onChange={(event) => {
              if (!programState) return;
              const parsed = Number(event.target.value);
              programState.year = Number.isFinite(parsed) ? parsed : null;
            }}
          />
        </label>

        <SettingsDetailNestedList
          sectionTitle="Треки"
          addButtonLabel="Добавить трек"
          onAdd={() =>
            updateConfigData((draft) => {
              mutateProgramInDraft(
                draft,
                sectionCode,
                programIndex,
                (target) => {
                  target.tracks.push({
                    code: `new-track-${target.tracks.length + 1}`,
                    name: `Новый трек ${target.tracks.length + 1}`,
                    kind: null,
                    groups: [],
                  });
                },
              );
            })
          }
          emptyHint="Нет треков"
          isEmpty={!tracks.length}
        >
          {tracks.map((track: { id: string; title: string }, index: number) => (
            <SettingsDetailReorderRow
              key={track.id}
              disableMoveUp={index === 0}
              disableMoveDown={index === tracks.length - 1}
              onMoveUp={() =>
                updateConfigData((draft) => {
                  mutateProgramInDraft(
                    draft,
                    sectionCode,
                    programIndex,
                    (target) => {
                      const [moved] = target.tracks.splice(index, 1);
                      target.tracks.splice(index - 1, 0, moved);
                    },
                  );
                })
              }
              onMoveDown={() =>
                updateConfigData((draft) => {
                  mutateProgramInDraft(
                    draft,
                    sectionCode,
                    programIndex,
                    (target) => {
                      const [moved] = target.tracks.splice(index, 1);
                      target.tracks.splice(index + 1, 0, moved);
                    },
                  );
                })
              }
              onDelete={() =>
                updateConfigData((draft) => {
                  mutateProgramInDraft(
                    draft,
                    sectionCode,
                    programIndex,
                    (target) => {
                      target.tracks.splice(index, 1);
                    },
                  );
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
          ))}
        </SettingsDetailNestedList>

        <SettingsDetailDeleteButton
          label="Удалить программу"
          onClick={() => {
            updateConfigData((draft) => {
              const section = draft.sections.find(
                (candidate) => candidate.code === sectionCode,
              )!;
              section.programs.splice(programIndex, 1);
            });
            deselectItem();
          }}
        />
      </div>
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
  const { config, updateConfigData } = useConfig();
  const { track, trackState } = useTrack(sectionCode, programIndex, trackIndex);
  const { program } = useProgram(sectionCode, programIndex);
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

  return (
    <SettingsSidebarDetailFrame title={headingTitle} subtitle={headingSubtitle}>
      <div className={settingsDetailShellClass}>
        <label className={`${detailControlClass} shrink-0`}>
          <span className={detailLabelUpperClass}>Название</span>
          <input
            className={detailInputClass}
            value={name}
            onChange={(event) => {
              if (!trackState) return;
              trackState.name = event.target.value;
            }}
          />
        </label>
        <label className={`${detailControlClass} shrink-0`}>
          <span className={detailLabelUpperClass}>Код</span>
          <input
            className={detailInputClass}
            value={code}
            onChange={(event) => {
              if (!trackState || !("code" in trackState)) return;
              (trackState as Record<string, unknown>).code = event.target.value;
            }}
          />
        </label>
        <label className={`${detailControlClass} shrink-0`}>
          <span className={detailLabelUpperClass}>Тип</span>
          <input
            className={detailInputClass}
            value={kind}
            onChange={(event) => {
              if (!trackState || !("kind" in trackState)) return;
              (trackState as Record<string, unknown>).kind = event.target.value;
            }}
          />
        </label>

        <SettingsDetailNestedList
          sectionTitle="Группы"
          addButtonLabel="Добавить группу"
          onAdd={() =>
            updateConfigData((draft) => {
              mutateProgramInDraft(
                draft,
                sectionCode,
                programIndex,
                (target) => {
                  const draftTrack = target.tracks[trackIndex];
                  const existingIds = [...draftTrack.groups];
                  const { code: newGroupId, name: newGroupName } =
                    nextGroupIdentifiers(
                      existingIds,
                      (id) => {
                        const entity = draft.students_groups.find(
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
                  draftTrack.groups.push(newGroupId);
                  draft.students_groups.push({
                    code: newGroupId,
                    kind: "core",
                    name: newGroupName,
                    estimated_size: null,
                    students: [],
                  });
                },
              );
            })
          }
          emptyHint="Нет групп"
          isEmpty={!groups.length}
        >
          {groups.map((group: { id: string; title: string }, index: number) => (
            <SettingsDetailReorderRow
              key={group.id}
              disableMoveUp={index === 0}
              disableMoveDown={index === groups.length - 1}
              onMoveUp={() => {
                if (index <= 0) return;
                const reordered = [...trackGroups];
                const [moved] = reordered.splice(index, 1);
                reordered.splice(index - 1, 0, moved);
                updateConfigData((draft) => {
                  mutateProgramInDraft(
                    draft,
                    sectionCode,
                    programIndex,
                    (target) => {
                      target.tracks[trackIndex].groups = reordered;
                    },
                  );
                });
              }}
              onMoveDown={() => {
                if (index >= trackGroups.length - 1) return;
                const reordered = [...trackGroups];
                const [moved] = reordered.splice(index, 1);
                reordered.splice(index + 1, 0, moved);
                updateConfigData((draft) => {
                  mutateProgramInDraft(
                    draft,
                    sectionCode,
                    programIndex,
                    (target) => {
                      target.tracks[trackIndex].groups = reordered;
                    },
                  );
                });
              }}
              onDelete={() =>
                updateConfigData((draft) => {
                  mutateProgramInDraft(
                    draft,
                    sectionCode,
                    programIndex,
                    (target) => {
                      const draftTrack = target.tracks[trackIndex];
                      draftTrack.groups = draftTrack.groups.filter(
                        (current) => current !== String(group.id),
                      );
                    },
                  );
                  draft.students_groups = draft.students_groups.filter(
                    (candidate) => candidate.code !== String(group.id),
                  );
                })
              }
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
          ))}
        </SettingsDetailNestedList>

        <SettingsDetailDeleteButton
          label="Удалить трек"
          onClick={() => {
            updateConfigData((draft) => {
              mutateProgramInDraft(
                draft,
                sectionCode,
                programIndex,
                (target) => {
                  target.tracks.splice(trackIndex, 1);
                },
              );
            });
            deselectItem();
          }}
        />
      </div>
    </SettingsSidebarDetailFrame>
  );
}

export function InstructorDetails({
  instructorIndex,
}: {
  instructorIndex: number;
}) {
  const { instructor, instructorState } = useInstructor(instructorIndex);
  const { updateConfigData } = useConfig();
  const { deselectItem } = useSelection();
  const headingTitle =
    instructor?.name_ru ??
    instructor?.name_en ??
    instructor?.email ??
    instructor?.id ??
    "";
  const headingSubtitle = "Преподаватель";

  return (
    <SettingsSidebarDetailFrame title={headingTitle} subtitle={headingSubtitle}>
      <div className={settingsDetailShellClass}>
        <label className={`${detailControlClass} shrink-0`}>
          <span className={detailLabelUpperClass}>Имя (на русском)</span>
          <input
            className={detailInputClass}
            value={instructor?.name_ru ?? ""}
            onChange={(event) => {
              if (!instructorState) return;
              instructorState.name_ru = event.target.value.trim() || null;
            }}
          />
        </label>
        <label className={`${detailControlClass} shrink-0`}>
          <span className={detailLabelUpperClass}>Имя (на английском)</span>
          <input
            className={detailInputClass}
            value={instructor?.name_en ?? ""}
            onChange={(event) => {
              if (!instructorState) return;
              instructorState.name_en = event.target.value.trim() || null;
            }}
          />
        </label>
        <label className={`${detailControlClass} shrink-0`}>
          <span className={detailLabelUpperClass}>Идентификатор</span>
          <input
            className={detailInputClass}
            value={instructor?.id ?? ""}
            onChange={(event) => {
              if (!instructorState) return;
              instructorState.id = event.target.value.trim();
            }}
          />
        </label>
        <label className={`${detailControlClass} shrink-0`}>
          <span className={detailLabelUpperClass}>Корпоративная почта</span>
          <input
            className={detailInputClass}
            value={instructor?.email ?? ""}
            onChange={(event) => {
              if (!instructorState) return;
              instructorState.email = event.target.value.trim() || null;
            }}
          />
        </label>
        <label className={`${detailControlClass} shrink-0`}>
          <span className={detailLabelUpperClass}>Алиас Telegram</span>
          <input
            className={detailInputClass}
            value={instructor?.alias ?? ""}
            onChange={(event) => {
              if (!instructorState) return;
              instructorState.alias = event.target.value.trim() || null;
            }}
          />
        </label>
        <label className={`${detailControlClass} shrink-0`}>
          <span className={detailLabelUpperClass}>Должность</span>
          <input
            className={detailInputClass}
            value={instructor?.position ?? ""}
            onChange={(event) => {
              if (!instructorState) return;
              instructorState.position = event.target.value.trim() || null;
            }}
          />
        </label>
        <SettingsDetailDeleteButton
          label="Удалить преподавателя"
          onClick={() => {
            updateConfigData((draft) => {
              draft.instructors.splice(instructorIndex, 1);
            });
            deselectItem();
          }}
        />
      </div>
    </SettingsSidebarDetailFrame>
  );
}

export function SemesterDetails() {
  const { term, termState } = useSemesterSettings();
  const termName = String(term?.name ?? "");
  const startDate = toDateInputValue(term?.semester?.start_date);
  const endDate = toDateInputValue(term?.semester?.end_date);
  const days = TERM_WEEKDAY_KEYS.filter((key) =>
    (term?.days || []).includes(key),
  );
  const startingDay = term?.starting_day ?? "";
  const timeSlots = Array.isArray(term?.time_slots)
    ? term.time_slots.join("\n")
    : "";

  function handleToggleDay(key: TermWeekdayKey) {
    if (!termState) return;
    termState.days = toggleTermWeekday(days, key);
  }

  const timeSlotsTextareaRef = useAutosizeTextareaRef(timeSlots);

  return (
    <div className={settingsDetailShellClass}>
      <label className={`${detailControlClass} shrink-0`}>
        <span className={detailLabelUpperClass}>Название семестра</span>
        <input
          className={detailInputClass}
          value={termName}
          onChange={(event) => {
            if (!termState) return;
            termState.name = event.target.value;
          }}
          onKeyDown={handleEscapeBlur}
        />
      </label>
      <label className={`${detailControlClass} shrink-0`}>
        <span className={detailLabelUpperClass}>Начало периода</span>
        <input
          type="date"
          className={detailInputClass}
          value={startDate}
          onChange={(event) => {
            if (!termState) return;
            termState.semester.start_date = event.target.value;
          }}
          onKeyDown={handleEscapeBlur}
        />
      </label>
      <label className={`${detailControlClass} shrink-0`}>
        <span className={detailLabelUpperClass}>Окончание периода</span>
        <input
          type="date"
          className={detailInputClass}
          value={endDate}
          onChange={(event) => {
            if (!termState) return;
            termState.semester.end_date = event.target.value;
          }}
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
                onClick={() => {
                  if (!termState) return;
                  termState.starting_day = key;
                }}
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
          value={timeSlots}
          onKeyDown={handleEscapeBlur}
          onChange={(event) => {
            if (!termState) return;
            termState.time_slots = parseTermTimeSlotsText(event.target.value);
          }}
        />
      </label>
    </div>
  );
}
