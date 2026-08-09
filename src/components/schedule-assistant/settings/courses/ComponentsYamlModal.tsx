import type {
  SchemaCourseConfig,
  SchemaScheduleConfig,
} from "@/api/schedule-assistant/types.ts";
import { Modal } from "@/components/common/Modal.tsx";
import {
  collectKnownStudentGroupIds,
  courseComponentsYamlLintExtensions,
  validateCourseComponentsYaml,
} from "@/components/schedule-assistant/settings/courses/courseComponentsYamlLint.ts";
import { yaml } from "@codemirror/lang-yaml";
import { lintKeymap } from "@codemirror/lint";
import { EditorView, keymap } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { useEffect, useMemo, useRef, useState } from "react";
import { stringify } from "yaml";

export function ComponentsYamlModal({
  open,
  onOpenChange,
  config,
  components,
  onSave,
  onCreateStudentGroup,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: SchemaScheduleConfig | null | undefined;
  components: SchemaCourseConfig["components"];
  onSave: (components: SchemaCourseConfig["components"]) => void;
  onCreateStudentGroup?: (groupId: string) => void;
}) {
  const signature = useMemo(
    () => stringify(components ?? [], { lineWidth: 0 }),
    [components],
  );
  const [yamlText, setYamlText] = useState(signature);
  const [parseError, setParseError] = useState<string | null>(null);
  const createGroupRef = useRef(onCreateStudentGroup);
  createGroupRef.current = onCreateStudentGroup;

  useEffect(() => {
    if (!open) return;
    setYamlText(signature);
    setParseError(null);
  }, [open, signature]);

  const knownStudentGroupIds = useMemo(
    () => collectKnownStudentGroupIds(config),
    [config],
  );

  const extensions = useMemo(
    () => [
      yaml(),
      EditorView.lineWrapping,
      ...courseComponentsYamlLintExtensions(knownStudentGroupIds, (groupId) =>
        createGroupRef.current?.(groupId),
      ),
      keymap.of(lintKeymap),
    ],
    [knownStudentGroupIds],
  );

  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => {
      const result = validateCourseComponentsYaml(yamlText);
      setParseError(result.ok ? null : result.error);
    }, 280);
    return () => window.clearTimeout(handle);
  }, [open, yamlText]);

  const isDirty = yamlText !== signature;
  const canSave = isDirty && !parseError;

  function handleClose() {
    onOpenChange(false);
  }

  function handleSave() {
    if (!canSave) return;
    const result = validateCourseComponentsYaml(yamlText);
    if (!result.ok) {
      setParseError(result.error);
      return;
    }
    setParseError(null);
    onSave(result.value as SchemaCourseConfig["components"]);
    onOpenChange(false);
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
        else onOpenChange(next);
      }}
      title="Компоненты (YAML)"
      overlayClassName="!flex items-start justify-center overflow-y-auto pt-[max(1rem,8vh)]"
      containerClassName="max-h-[calc(100dvh-2rem-8vh)] max-w-3xl overflow-y-auto"
    >
      <div className="flex flex-col gap-3">
        <div className="rounded-box overflow-hidden border">
          <CodeMirror
            value={yamlText}
            height="320px"
            theme="light"
            extensions={extensions}
            onChange={setYamlText}
            basicSetup={{ foldGutter: true }}
          />
        </div>
        {parseError ? (
          <div className="text-error text-xs wrap-break-word">{parseError}</div>
        ) : null}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={handleClose}>
            Отмена
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canSave}
            onClick={handleSave}
          >
            Сохранить
          </button>
        </div>
      </div>
    </Modal>
  );
}
