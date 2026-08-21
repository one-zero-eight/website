import type {
  SchemaComponent,
  SchemaCourseConfig,
  SchemaInstructor,
  SchemaScheduleConfig,
} from "@/api/schedule-assistant/types.ts";
import {
  CourseComponentAccordionItem,
  CourseComponentDetailsFields,
  CourseComponentsAccordionList,
} from "@/components/schedule-assistant/courses/CourseComponentDetailsView.tsx";
import { ComponentEditModal } from "@/components/schedule-assistant/settings/courses/ComponentEditModal.tsx";
import { ComponentsYamlModal } from "@/components/schedule-assistant/settings/courses/ComponentsYamlModal.tsx";
import {
  formatComponentProgressHint,
  listComponentSeriesDisplayItems,
} from "@/components/schedule-assistant/timetable/meetingComponentContext.ts";
import { buildInstructorLabelById } from "@/components/schedule-assistant/timetable/timetableViewerModel.ts";
import { useEffect, useMemo, useRef, useState } from "react";

const detailCaptionUpperClass =
  "text-xs font-medium uppercase tracking-wide text-base-content/70";
const detailLabelUpperClass = `label-text ${detailCaptionUpperClass}`;
const detailControlClass = "form-control w-full gap-1.5 px-1 py-0.5";

function createEmptyComponent(tag: string): SchemaComponent {
  return {
    tag,
    per_week: null,
    per_semester: null,
    instructor_pool: [],
    audience: [],
    per_group: false,
    sessions: null,
  };
}

function moveIndex<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length || from === to) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (!item) return items;
  next.splice(to, 0, item);
  return next;
}

function ComponentRowMenu({
  canMoveUp,
  canMoveDown,
  onEdit,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  canMoveUp: boolean;
  canMoveDown: boolean;
  onEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative flex shrink-0 items-center gap-0.5">
      <button
        type="button"
        className="btn btn-ghost btn-xs btn-square"
        title="Редактировать"
        onClick={onEdit}
      >
        <span className="icon-[material-symbols--edit-outline-rounded] text-base" />
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-xs btn-square"
        title="Ещё"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="icon-[material-symbols--more-vert] text-base" />
      </button>
      {open ? (
        <div className="border-base-300 bg-base-100 rounded-box absolute top-full right-0 z-20 mt-1 min-w-36 border py-1 shadow-md">
          <button
            type="button"
            className="hover:bg-base-200 flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm disabled:opacity-40"
            disabled={!canMoveUp}
            onClick={() => {
              onMoveUp();
              setOpen(false);
            }}
          >
            <span className="icon-[material-symbols--arrow-upward-rounded] text-base" />
            Выше
          </button>
          <button
            type="button"
            className="hover:bg-base-200 flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm disabled:opacity-40"
            disabled={!canMoveDown}
            onClick={() => {
              onMoveDown();
              setOpen(false);
            }}
          >
            <span className="icon-[material-symbols--arrow-downward-rounded] text-base" />
            Ниже
          </button>
          <button
            type="button"
            className="hover:bg-base-200 text-error flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm"
            onClick={() => {
              onDelete();
              setOpen(false);
            }}
          >
            <span className="icon-[material-symbols--delete-outline-rounded] text-base" />
            Удалить
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function CourseComponentsEditor({
  config,
  courseIndex,
  components,
  tagOptions,
  instructors,
  courseInstructors,
  onChange,
  onCreateStudentGroup,
}: {
  config: SchemaScheduleConfig;
  courseIndex: number;
  components: SchemaCourseConfig["components"];
  tagOptions: string[];
  instructors: SchemaInstructor[];
  courseInstructors: SchemaCourseConfig["instructors"];
  onChange: (components: SchemaCourseConfig["components"]) => void;
  onCreateStudentGroup?: (groupId: string) => void;
}) {
  const list = useMemo(() => components ?? [], [components]);
  const instructorLabelById = useMemo(
    () => buildInstructorLabelById(config),
    [config],
  );
  const [yamlOpen, setYamlOpen] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [createDraft, setCreateDraft] = useState<SchemaComponent | null>(null);

  const isCreating = createDraft !== null;
  const editingComponent = isCreating
    ? createDraft
    : editIndex === null
      ? null
      : (list[editIndex] ?? null);

  const defaultTag = tagOptions[0] || "lec";

  function handleAdd() {
    setEditIndex(null);
    setCreateDraft(createEmptyComponent(defaultTag));
  }

  function handleCloseModal() {
    setEditIndex(null);
    setCreateDraft(null);
  }

  function handleDelete(index: number) {
    onChange(list.filter((_, i) => i !== index));
    if (editIndex === index) setEditIndex(null);
    else if (editIndex !== null && editIndex > index) {
      setEditIndex(editIndex - 1);
    }
    if (openIndex === index) setOpenIndex(null);
    else if (openIndex !== null && openIndex > index) {
      setOpenIndex(openIndex - 1);
    }
  }

  return (
    <div className={`${detailControlClass} shrink-0`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className={detailLabelUpperClass}>Компоненты</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => setYamlOpen(true)}
            title="Редактировать YAML"
          >
            YAML
          </button>
          <button
            type="button"
            className="btn btn-primary btn-xs"
            onClick={handleAdd}
          >
            Добавить
          </button>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="text-base-content/60 text-sm">
          Пока нет компонентов. Добавьте lec/tut/lab или откройте YAML.
        </div>
      ) : (
        <CourseComponentsAccordionList>
          {list.map((component, index) => {
            const tag =
              String(component.tag || "").trim() || `Компонент ${index + 1}`;
            const hint = formatComponentProgressHint(component);
            const open = openIndex === index;
            return (
              <CourseComponentAccordionItem
                key={`${component.tag}-${index}`}
                tag={tag}
                hint={hint || undefined}
                badge={
                  component.per_group ? (
                    <span className="badge badge-ghost badge-xs shrink-0">
                      per group
                    </span>
                  ) : undefined
                }
                open={open}
                onToggle={() => setOpenIndex(open ? null : index)}
                trailing={
                  <ComponentRowMenu
                    canMoveUp={index > 0}
                    canMoveDown={index < list.length - 1}
                    onEdit={() => {
                      setCreateDraft(null);
                      setEditIndex(index);
                    }}
                    onMoveUp={() => onChange(moveIndex(list, index, index - 1))}
                    onMoveDown={() =>
                      onChange(moveIndex(list, index, index + 1))
                    }
                    onDelete={() => handleDelete(index)}
                  />
                }
              >
                <CourseComponentDetailsFields
                  config={config}
                  component={component}
                  instructorLabelById={instructorLabelById}
                  showAudienceAlways
                  seriesItems={listComponentSeriesDisplayItems(
                    config,
                    component,
                    instructorLabelById,
                  )}
                  compact
                />
              </CourseComponentAccordionItem>
            );
          })}
        </CourseComponentsAccordionList>
      )}

      <ComponentEditModal
        open={!!editingComponent}
        onOpenChange={(open) => {
          if (!open) handleCloseModal();
        }}
        config={config}
        courseIndex={courseIndex}
        componentIndex={isCreating ? list.length : editIndex}
        component={editingComponent}
        isNew={isCreating}
        tagOptions={tagOptions}
        instructors={instructors}
        courseInstructors={courseInstructors}
        onSave={(component) => {
          if (isCreating) {
            onChange([...list, component]);
            return;
          }
          if (editIndex === null) return;
          const next = [...list];
          next[editIndex] = component;
          onChange(next);
        }}
      />

      <ComponentsYamlModal
        open={yamlOpen}
        onOpenChange={setYamlOpen}
        config={config}
        components={list}
        onSave={onChange}
        onCreateStudentGroup={onCreateStudentGroup}
      />
    </div>
  );
}
