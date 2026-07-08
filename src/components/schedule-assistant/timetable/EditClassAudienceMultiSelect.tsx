import type { SchemaScheduleConfig } from "@/api/schedule-assistant/types.ts";
import clsx from "clsx";
import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type Ref,
} from "react";

import {
  buildAudienceSelectorTree,
  filterAudienceSelectorTree,
  flattenAudienceSelectorTree,
  isGroupEffectivelySelected,
  isProgramEffectivelySelected,
  isTrackEffectivelySelected,
  minimizeAudienceTokens,
  toggleAudienceSelection,
  type AudienceSelectableItem,
} from "./audienceSelectorTree.ts";

export function EditClassAudienceMultiSelect({
  config,
  tokens,
  onChange,
  disabled,
  editorOnly = false,
  displayLabel,
  changed = false,
  originalLabel,
  onRestoreOriginal,
  overridden = false,
  patternLabel,
}: {
  config: SchemaScheduleConfig;
  tokens: string[];
  onChange: (tokens: string[]) => void;
  disabled?: boolean;
  editorOnly?: boolean;
  displayLabel?: string;
  changed?: boolean;
  originalLabel?: string;
  onRestoreOriginal?: () => void;
  overridden?: boolean;
  patternLabel?: string;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);

  const tree = useMemo(() => buildAudienceSelectorTree(config), [config]);
  const filteredTree = useMemo(
    () => filterAudienceSelectorTree(tree, searchQuery),
    [tree, searchQuery],
  );
  const selectableItems = useMemo(
    () => flattenAudienceSelectorTree(filteredTree),
    [filteredTree],
  );
  const itemIndexByKey = useMemo(() => {
    const map = new Map<string, number>();
    selectableItems.forEach((item, index) => map.set(item.key, index));
    return map;
  }, [selectableItems]);
  const selected = useMemo(
    () => new Set(minimizeAudienceTokens(tokens, tree)),
    [tokens, tree],
  );

  const activeHighlightedIndex =
    selectableItems.length > 0
      ? Math.min(highlightedIndex, selectableItems.length - 1)
      : null;

  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery, selectableItems.length]);

  useEffect(() => {
    if (activeHighlightedIndex === null) return;
    const list = listRef.current;
    const item = itemRefs.current[activeHighlightedIndex];
    if (!list || !item) return;

    const listRect = list.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();

    if (itemRect.top < listRect.top) {
      list.scrollTop -= listRect.top - itemRect.top;
    } else if (itemRect.bottom > listRect.bottom) {
      list.scrollTop += itemRect.bottom - listRect.bottom;
    }
  }, [activeHighlightedIndex]);

  function focusSearchInput() {
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }

  function commitSelection(next: string[]) {
    onChange(minimizeAudienceTokens(next, tree));
  }

  function handleToggleItem(item: AudienceSelectableItem) {
    if (disabled) return;
    commitSelection(toggleAudienceSelection(item, selected, tree));
  }

  function moveHighlight(delta: number) {
    if (!selectableItems.length) return;
    setHighlightedIndex((prev) => {
      const next = prev + delta;
      if (next < 0) return selectableItems.length - 1;
      if (next >= selectableItems.length) return 0;
      return next;
    });
  }

  function handleListNavigationKeyDown(event: KeyboardEvent) {
    if (!selectableItems.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveHighlight(1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveHighlight(-1);
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      moveHighlight(event.shiftKey ? -1 : 1);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const item = selectableItems[activeHighlightedIndex ?? 0];
      if (item) handleToggleItem(item);
      focusSearchInput();
    }
  }

  function renderCheckbox(
    item: AudienceSelectableItem,
    props: {
      title: string;
      subtitle?: string;
      checked: boolean;
      className?: string;
    },
  ) {
    const index = itemIndexByKey.get(item.key);
    if (index === undefined) return null;
    return (
      <AudienceCheckboxRow
        ref={(node) => {
          itemRefs.current[index] = node;
        }}
        title={props.title}
        subtitle={props.subtitle}
        checked={props.checked}
        highlighted={activeHighlightedIndex === index}
        disabled={disabled}
        className={props.className}
        onToggle={() => handleToggleItem(item)}
        onHighlight={() => {
          setHighlightedIndex(index);
          focusSearchInput();
        }}
      />
    );
  }

  return (
    <div
      className={clsx(
        "flex flex-col gap-2 text-sm",
        !editorOnly && "rounded-lg",
        !editorOnly &&
          changed &&
          "bg-warning/10 ring-warning/40 px-2 py-1.5 ring-2",
        !editorOnly &&
          !changed &&
          overridden &&
          "bg-info/10 ring-info/40 px-2 py-1.5 ring-2",
        !editorOnly && !changed && !overridden && "px-0.5 py-0.5",
      )}
    >
      {!editorOnly ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">Группы</span>
            {changed ? (
              <span className="badge badge-warning badge-sm">изменено</span>
            ) : overridden ? (
              <span className="badge badge-info badge-sm">переопр.</span>
            ) : (
              <span className="text-base-content/50 text-xs">
                без изменений
              </span>
            )}
          </div>

          {tokens.length ? (
            <div className="text-base-content/70 min-w-0 leading-snug wrap-break-word">
              {displayLabel}
            </div>
          ) : (
            <div className="text-base-content/50">—</div>
          )}

          {changed && originalLabel ? (
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
        </>
      ) : null}

      <input
        ref={searchInputRef}
        type="text"
        className="input input-bordered input-xs h-8 min-h-8 w-full px-2 text-sm"
        value={searchQuery}
        placeholder="Поиск группы, программы, секции или @селектора…"
        disabled={disabled}
        onChange={(event) => setSearchQuery(event.target.value)}
        onKeyDown={handleListNavigationKeyDown}
      />

      <div
        ref={listRef}
        tabIndex={-1}
        className={clsx(
          "border-base-300 min-h-0 overflow-y-auto overscroll-contain rounded-md border p-1 outline-none",
          editorOnly ? "max-h-[min(24rem,60vh)]" : "max-h-52",
        )}
        onKeyDown={handleListNavigationKeyDown}
      >
        {filteredTree.length ? (
          filteredTree.map((section) => (
            <div key={section.key} className="flex flex-col gap-0.5">
              <div className="text-base-content px-2 pt-2 pb-1 text-sm font-bold">
                {section.title}:
              </div>
              {section.programs.map((program) => (
                <div key={program.key} className="flex flex-col gap-0.5">
                  {renderCheckbox(
                    {
                      kind: "program",
                      key: program.key,
                      program,
                    },
                    {
                      title: program.title,
                      subtitle: program.token,
                      checked: isProgramEffectivelySelected(program, selected),
                      className: "pl-2",
                    },
                  )}
                  {program.tracks.map((track) => (
                    <div key={track.key} className="flex flex-col gap-0.5">
                      {track.token ? (
                        renderCheckbox(
                          {
                            kind: "track",
                            key: track.key,
                            program,
                            track,
                          },
                          {
                            title: track.title,
                            subtitle: track.token,
                            checked: isTrackEffectivelySelected(
                              program,
                              track,
                              selected,
                            ),
                            className: "pl-6",
                          },
                        )
                      ) : (
                        <div className="text-base-content/60 pl-6 text-xs font-medium">
                          {track.title}
                        </div>
                      )}
                      {track.groups.map((group) =>
                        renderCheckbox(
                          {
                            kind: "group",
                            key: `${track.key}-${group.token}`,
                            program,
                            track,
                            group,
                          },
                          {
                            title: group.title,
                            subtitle: group.code,
                            checked: isGroupEffectivelySelected(
                              program,
                              track,
                              group,
                              selected,
                            ),
                            className: "pl-10",
                          },
                        ),
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))
        ) : (
          <div className="text-base-content/50 px-2 py-2 text-sm">
            Ничего не найдено
          </div>
        )}
      </div>
    </div>
  );
}

const AudienceCheckboxRow = forwardRef(function AudienceCheckboxRow(
  {
    title,
    subtitle,
    checked,
    highlighted,
    disabled,
    className,
    onToggle,
    onHighlight,
  }: {
    title: string;
    subtitle?: string;
    checked: boolean;
    highlighted?: boolean;
    disabled?: boolean;
    className?: string;
    onToggle: () => void;
    onHighlight: () => void;
  },
  ref: Ref<HTMLDivElement>,
) {
  return (
    <div
      ref={ref}
      tabIndex={-1}
      className={clsx(
        "flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5",
        highlighted
          ? "bg-primary/12 ring-primary hover:bg-primary/20 ring-2 ring-inset"
          : "hover:bg-base-200",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
      onClick={() => {
        onHighlight();
        onToggle();
      }}
    >
      <input
        type="checkbox"
        className="checkbox checkbox-xs mt-0.5 shrink-0"
        checked={checked}
        disabled={disabled}
        onClick={(event) => {
          onHighlight();
          event.stopPropagation();
        }}
        onChange={onToggle}
      />
      <span className="min-w-0 flex-1 leading-snug">
        <span className="wrap-break-word">{title}</span>
        {subtitle && subtitle !== title ? (
          <span className="text-base-content/50 ml-1.5 text-xs wrap-break-word">
            {subtitle}
          </span>
        ) : null}
      </span>
    </div>
  );
});
