import type { SchemaScheduleConfig } from "@/api/schedule-assistant/types.ts";
import { Modal } from "@/components/common/Modal.tsx";
import {
  SelectDropdown,
  type SelectDropdownOption,
} from "@/components/common/SelectDropdown.tsx";
import { AudienceTokensInfoIcon } from "@/components/schedule-assistant/settings/courses/audienceTreeTooltip.tsx";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { useEffect, useMemo, useState } from "react";

import { EditClassAudienceMultiSelect } from "./EditClassAudienceMultiSelect.tsx";
import {
  buildAudienceSelectorTree,
  minimizeAudienceTokens,
} from "./audienceSelectorTree.ts";
import {
  formatAudienceTokensLabel,
  meetingAudienceEqual,
} from "./meetingEditUtils.ts";
import { audienceSizeForTokens } from "./roomPickerOptions.ts";

/** Compact audience control used by event edit and component sessions. */
export function EditClassAudienceSummaryRow({
  config,
  tokens,
  displayLabel,
  disabled,
  changed,
  originalLabel,
  onRestoreOriginal,
  overridden,
  patternLabel,
  patternLabelPrefix = "в шаблоне",
  labelPrefix = "Группы",
  emptyLabel = "—",
  onEdit,
}: {
  config: SchemaScheduleConfig;
  tokens: string[];
  displayLabel: string;
  disabled?: boolean;
  changed?: boolean;
  originalLabel?: string;
  onRestoreOriginal?: () => void;
  overridden?: boolean;
  patternLabel?: string;
  patternLabelPrefix?: string;
  labelPrefix?: string;
  emptyLabel?: string;
  onEdit: () => void;
}) {
  const audienceSize = useMemo(
    () => audienceSizeForTokens(config, tokens),
    [config, tokens],
  );

  const label = displayLabel.trim() || emptyLabel;

  return (
    <div
      className={cn(
        "flex flex-col items-start gap-0.5 border-l-4 pl-2",
        changed ? "border-warning/60" : "border-transparent",
      )}
    >
      <button
        type="button"
        className="btn btn-ghost btn-xs h-auto min-h-0 justify-start gap-1 px-2"
        disabled={disabled}
        onClick={onEdit}
        title={`Изменить: ${labelPrefix}`}
      >
        <span className="inline-flex min-w-0 items-center gap-1">
          <span className="text-base-content/50 shrink-0">{labelPrefix}:</span>
          <span className="max-w-56 truncate font-medium">{label}</span>
          {audienceSize != null ? (
            <span className="text-base-content/45 shrink-0">
              · {audienceSize} студ.
            </span>
          ) : null}
          <AudienceTokensInfoIcon
            config={config}
            tokens={tokens}
            onClick={(event) => event.stopPropagation()}
          />
        </span>
        <span className="icon-[material-symbols--edit-outline-rounded] shrink-0 text-sm opacity-70" />
      </button>
      {changed && originalLabel != null ? (
        <div className="text-base-content/55 px-2.5 text-xs">
          Было:{" "}
          <button
            type="button"
            className="hover:text-base-content cursor-pointer underline decoration-dotted underline-offset-2"
            onClick={onRestoreOriginal}
          >
            {originalLabel || "—"}
          </button>
        </div>
      ) : null}
      {!changed && overridden ? (
        <div className="text-base-content/55 px-2.5 text-xs">
          {patternLabel
            ? `${patternLabelPrefix} · ${patternLabel}`
            : "переопределено в шаблоне"}
        </div>
      ) : null}
    </div>
  );
}

export function EditClassAudienceModal({
  open,
  onOpenChange,
  config,
  tokens,
  originalTokens,
  originalLabel,
  onSave,
  sectionCode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: SchemaScheduleConfig;
  tokens: string[];
  originalTokens: string[];
  originalLabel: string;
  onSave: (tokens: string[]) => void;
  sectionCode: string;
}) {
  const { showError } = useToast();
  const tree = useMemo(
    () => buildAudienceSelectorTree(config, { sectionCode }),
    [config, sectionCode],
  );
  const normalizedOriginalTokens = useMemo(
    () => minimizeAudienceTokens(originalTokens, tree),
    [originalTokens, tree],
  );
  const [draft, setDraft] = useState(tokens);
  const [openingTokens, setOpeningTokens] = useState(tokens);

  useEffect(() => {
    if (!open) return;
    const minimized = minimizeAudienceTokens(tokens, tree);
    setDraft(minimized);
    setOpeningTokens(minimized);
  }, [open, tokens, tree]);

  const draftLabel = formatAudienceTokensLabel(config, draft);
  const changedFromOriginal = !meetingAudienceEqual(
    draft,
    normalizedOriginalTokens,
  );
  const changedFromOpening = !meetingAudienceEqual(draft, openingTokens);

  function handleClose() {
    onOpenChange(false);
  }

  function handleSave() {
    const next = minimizeAudienceTokens(draft, tree);
    if (!next.length) {
      showError("Ошибка", "Укажите хотя бы одну группу.");
      return;
    }
    onSave(next);
    onOpenChange(false);
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
        else onOpenChange(next);
      }}
      title="Группы"
      containerClassName="max-w-xl"
    >
      <div className="flex flex-col gap-3">
        <div className="rounded-box border-base-300 bg-base-100 border px-3 py-2 text-sm">
          <div className="text-base-content/50 text-xs">Выбрано</div>
          <div className="text-base-content/80 mt-0.5 inline-flex min-w-0 items-center gap-1 leading-snug">
            <span className="min-w-0 wrap-break-word">
              {draft.length ? draftLabel : "—"}
            </span>
            {draft.length ? (
              <AudienceTokensInfoIcon config={config} tokens={draft} />
            ) : null}
          </div>
          {changedFromOriginal ? (
            <div className="text-base-content/60 mt-1.5 text-xs">
              Было:{" "}
              <button
                type="button"
                className="text-base-content/80 hover:text-base-content cursor-pointer underline decoration-dotted underline-offset-2"
                onClick={() => setDraft([...normalizedOriginalTokens])}
              >
                {originalLabel}
              </button>
            </div>
          ) : null}
          {changedFromOpening && !changedFromOriginal ? (
            <div className="text-base-content/60 mt-1.5 text-xs">
              При открытии:{" "}
              <button
                type="button"
                className="text-base-content/80 hover:text-base-content cursor-pointer underline decoration-dotted underline-offset-2"
                onClick={() => setDraft([...openingTokens])}
              >
                {formatAudienceTokensLabel(config, openingTokens)}
              </button>
            </div>
          ) : null}
        </div>

        <EditClassAudienceMultiSelect
          editorOnly
          config={config}
          tokens={draft}
          onChange={setDraft}
          sectionCode={sectionCode}
        />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={handleClose}>
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
      </div>
    </Modal>
  );
}

export function EditClassPerGroupModal({
  open,
  onOpenChange,
  value,
  options,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  options: SelectDropdownOption[];
  onSave: (group: string) => void;
}) {
  const { showError } = useToast();
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (!open) return;
    setDraft(value);
  }, [open, value]);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Группа"
      containerClassName="max-w-md"
    >
      <div className="flex flex-col gap-3">
        <SelectDropdown
          value={draft}
          onChange={setDraft}
          options={options}
          placeholder="Выберите группу"
          searchable
          className="w-full"
          triggerClassName="w-full"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              if (!draft.trim()) {
                showError("Ошибка", "Выберите группу.");
                return;
              }
              onSave(draft);
              onOpenChange(false);
            }}
          >
            Сохранить
          </button>
        </div>
      </div>
    </Modal>
  );
}
