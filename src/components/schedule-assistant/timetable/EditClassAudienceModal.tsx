import type { SchemaScheduleConfig } from "@/api/schedule-assistant/types.ts";
import { Modal } from "@/components/common/Modal.tsx";
import { useToast } from "@/components/toast";
import clsx from "clsx";
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

export function EditClassAudienceSummaryRow({
  displayLabel,
  disabled,
  changed,
  originalLabel,
  onRestoreOriginal,
  overridden,
  patternLabel,
  onEdit,
}: {
  displayLabel: string;
  disabled?: boolean;
  changed: boolean;
  originalLabel: string;
  onRestoreOriginal?: () => void;
  overridden?: boolean;
  patternLabel?: string;
  onEdit: () => void;
}) {
  return (
    <div
      className={clsx(
        "flex flex-col gap-1 rounded-lg text-sm",
        changed && "bg-warning/10 ring-warning/40 px-2 py-1.5 ring-2",
        !changed && overridden && "bg-info/10 ring-info/40 px-2 py-1.5 ring-2",
      )}
    >
      <div className="flex flex-wrap items-start gap-2">
        <div className="text-base-content/70 min-w-0 flex-1 leading-snug wrap-break-word">
          <span className="text-base-content/50">Группы:</span> {displayLabel}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {changed ? (
            <span className="badge badge-warning badge-sm">изменено</span>
          ) : overridden ? (
            <span className="badge badge-info badge-sm">переопр.</span>
          ) : null}
          <button
            type="button"
            className="btn btn-ghost btn-xs btn-square"
            disabled={disabled}
            onClick={onEdit}
          >
            <span className="icon-[material-symbols--edit-outline-rounded] text-base" />
          </button>
        </div>
      </div>
      {changed ? (
        <div className="text-base-content/60 text-xs">
          Было:{" "}
          <button
            type="button"
            className="text-base-content/80 hover:text-base-content cursor-pointer underline decoration-dotted underline-offset-2"
            onClick={onRestoreOriginal}
          >
            {originalLabel}
          </button>
        </div>
      ) : null}
      {!changed && overridden && patternLabel ? (
        <div className="text-base-content/60 text-xs">
          В шаблоне: {patternLabel}
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: SchemaScheduleConfig;
  tokens: string[];
  originalTokens: string[];
  originalLabel: string;
  onSave: (tokens: string[]) => void;
}) {
  const { showError } = useToast();
  const tree = useMemo(() => buildAudienceSelectorTree(config), [config]);
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
          <div className="text-base-content/80 mt-0.5 min-w-0 leading-snug wrap-break-word">
            {draft.length ? draftLabel : "—"}
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
