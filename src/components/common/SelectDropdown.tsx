import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  shift,
  size,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import { cn } from "@/lib/ui/cn";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function timeCompactsFromText(text: string): string[] {
  const times = text.match(/\d{1,2}:\d{2}/g) || [];
  const out: string[] = [];
  for (const time of times) {
    const [hoursRaw, minutesRaw] = time.split(":");
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) continue;
    if (hours > 23 || minutes > 59) continue;
    const compact = `${hours}${String(minutes).padStart(2, "0")}`;
    const padded = `${String(hours).padStart(2, "0")}${String(minutes).padStart(2, "0")}`;
    out.push(compact, padded);
  }
  return out;
}

function filterSelectOptions<T extends string>(
  options: SelectDropdownOption<T>[],
  query: string,
) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return options;
  const queryDigits = normalized.replace(/\D/g, "");

  return options.filter((option) => {
    const label = option.label.toLowerCase();
    const value = option.value.toLowerCase();
    const hint = option.hint?.toLowerCase() ?? "";
    if (
      label.includes(normalized) ||
      value.includes(normalized) ||
      hint.includes(normalized)
    )
      return true;

    // "1230" matches "12:30–14:00", "900" matches "09:00–10:30"
    if (queryDigits.length >= 3) {
      const compacts = timeCompactsFromText(
        `${option.label} ${option.value} ${option.hint ?? ""}`,
      );
      if (
        compacts.some(
          (compact) =>
            compact === queryDigits ||
            compact.startsWith(queryDigits) ||
            queryDigits.startsWith(compact),
        )
      ) {
        return true;
      }
    }

    return false;
  });
}

export type SelectDropdownOption<T extends string = string> = {
  value: T;
  label: string;
  /** Secondary gray text shown after the label. */
  hint?: string;
};

export type SelectDropdownChangeContext = {
  searchQuery: string;
};

function OptionLabel({
  label,
  hint,
  muted,
}: {
  label: string;
  hint?: string;
  muted?: boolean;
}) {
  return (
    <span className={cn("truncate", muted && "text-base-content/50")}>
      <span>{label}</span>
      {hint ? <span className="text-base-content/50"> {hint}</span> : null}
    </span>
  );
}

export function SelectDropdown<T extends string>({
  value,
  onChange,
  options,
  placeholder = "Выберите…",
  className,
  triggerClassName,
  menuClassName,
  placement = "bottom-start",
  matchTriggerWidth = true,
  isOptionDisabled,
  searchable = false,
  searchPlaceholder = "Поиск…",
  trailingOption,
}: {
  value: T | "";
  onChange: (value: T, context?: SelectDropdownChangeContext) => void;
  options: SelectDropdownOption<T>[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  placement?: "bottom-start" | "bottom-end";
  matchTriggerWidth?: boolean;
  isOptionDisabled?: (value: T) => boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Always appended; label can depend on the current search query. */
  trailingOption?: (query: string) => SelectDropdownOption<T> | null;
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<Array<HTMLButtonElement | null>>([]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setSearchQuery("");
      setHighlightedIndex(null);
    }
  };

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: handleOpenChange,
    placement,
    middleware: [
      offset(4),
      flip(),
      shift({ padding: 8 }),
      ...(matchTriggerWidth
        ? [
            size({
              apply({ rects, elements }) {
                Object.assign(elements.floating.style, {
                  width: `${rects.reference.width}px`,
                });
              },
            }),
          ]
        : []),
    ],
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "menu" });
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  const resolvedTrailing = useMemo(
    () => trailingOption?.(searchQuery) ?? null,
    [searchQuery, trailingOption],
  );

  const matchedOptions = useMemo(() => {
    const filtered = searchable
      ? filterSelectOptions(options, searchQuery)
      : options;
    if (!resolvedTrailing) return filtered;
    return filtered.filter((option) => option.value !== resolvedTrailing.value);
  }, [options, resolvedTrailing, searchQuery, searchable]);

  /** Matched presets + trailing (always last when present). */
  const filteredOptions = useMemo(() => {
    if (!resolvedTrailing) return matchedOptions;
    return [...matchedOptions, resolvedTrailing];
  }, [matchedOptions, resolvedTrailing]);

  const allOptionsForLabel = useMemo(() => {
    const trailing = trailingOption?.("") ?? resolvedTrailing;
    if (!trailing) return options;
    if (options.some((option) => option.value === trailing.value)) {
      return options;
    }
    return [...options, { value: trailing.value, label: trailing.label }];
  }, [options, resolvedTrailing, trailingOption]);

  const findEnabledIndex = useCallback(
    (start: number, direction: 1 | -1) => {
      if (!filteredOptions.length) return null;
      let index = start;
      for (let step = 0; step < filteredOptions.length; step += 1) {
        if (index < 0) index = filteredOptions.length - 1;
        if (index >= filteredOptions.length) index = 0;
        if (!isOptionDisabled?.(filteredOptions[index]!.value)) return index;
        index += direction;
      }
      return null;
    },
    [filteredOptions, isOptionDisabled],
  );

  const firstEnabledIndex = useMemo(
    () => findEnabledIndex(0, 1),
    [findEnabledIndex],
  );

  const activeHighlightedIndex =
    searchable && open ? (highlightedIndex ?? firstEnabledIndex) : null;

  const selectOption = useCallback(
    (optionValue: T) => {
      if (isOptionDisabled?.(optionValue)) return;
      onChange(optionValue, { searchQuery });
      handleOpenChange(false);
    },
    [isOptionDisabled, onChange, searchQuery],
  );

  useEffect(() => {
    if (!open || !searchable) return;
    setHighlightedIndex(null);
  }, [open, searchQuery, searchable, filteredOptions]);

  useEffect(() => {
    if (activeHighlightedIndex === null) return;
    listRef.current[activeHighlightedIndex]?.scrollIntoView({
      block: "nearest",
    });
  }, [activeHighlightedIndex]);

  useEffect(() => {
    if (!open || !searchable) return;
    const frame = requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open, searchable]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      handleOpenChange(false);
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [open]);

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((prev) => {
        const current = prev ?? firstEnabledIndex;
        if (current === null) return null;
        return findEnabledIndex(current + 1, 1) ?? current;
      });
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((prev) => {
        const current = prev ?? firstEnabledIndex;
        if (current === null) return null;
        return findEnabledIndex(current - 1, -1) ?? current;
      });
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      if (event.shiftKey) {
        setHighlightedIndex((prev) => {
          const current = prev ?? firstEnabledIndex;
          if (current === null) return null;
          return findEnabledIndex(current - 1, -1) ?? current;
        });
      } else {
        setHighlightedIndex((prev) => {
          const current = prev ?? firstEnabledIndex;
          if (current === null) return null;
          return findEnabledIndex(current + 1, 1) ?? current;
        });
      }
      return;
    }
    if (event.key !== "Enter") return;
    event.preventDefault();
    event.stopPropagation();
    const index = activeHighlightedIndex;
    if (index === null) return;
    const option = filteredOptions[index];
    if (!option) return;
    selectOption(option.value);
  }

  const currentOption = allOptionsForLabel.find(
    (option) => option.value === value,
  );

  return (
    <div className={cn("relative shrink-0", className)}>
      <button
        type="button"
        ref={refs.setReference}
        className={cn(
          "select select-bordered select-xs flex h-8 min-h-8 w-full cursor-pointer items-center justify-between px-3 text-left text-sm font-normal",
          triggerClassName,
        )}
        {...getReferenceProps()}
      >
        <OptionLabel
          label={currentOption?.label ?? placeholder}
          hint={currentOption?.hint}
          muted={!value}
        />
        <span className="icon-[material-symbols--expand-more] shrink-0 text-base" />
      </button>

      {open ? (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              className={cn(
                "border-base-300 bg-base-100 rounded-box z-50 flex max-h-56 flex-col overflow-hidden border shadow-sm",
                menuClassName,
              )}
              {...getFloatingProps()}
            >
              {searchable ? (
                <div className="border-base-300 shrink-0 border-b p-1">
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="input input-bordered input-xs h-8 min-h-8 w-full px-2 text-sm"
                    value={searchQuery}
                    placeholder={searchPlaceholder}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onKeyDown={handleSearchKeyDown}
                  />
                </div>
              ) : null}
              <ul className="min-h-0 flex-1 overflow-y-auto p-1">
                {matchedOptions.map((option, index) => {
                  const disabled = isOptionDisabled?.(option.value) ?? false;
                  const highlighted =
                    searchable && activeHighlightedIndex === index;
                  return (
                    <li key={option.value}>
                      <button
                        type="button"
                        ref={(node) => {
                          listRef.current[index] = node;
                        }}
                        className={cn(
                          "hover:bg-base-200 w-full rounded-md px-2 py-1.5 text-left text-sm",
                          highlighted &&
                            "bg-primary/12 ring-primary ring-2 ring-inset",
                          value === option.value && "font-semibold",
                          disabled && "cursor-not-allowed opacity-50",
                        )}
                        disabled={disabled}
                        onClick={() => {
                          if (disabled) return;
                          selectOption(option.value);
                        }}
                      >
                        <OptionLabel label={option.label} hint={option.hint} />
                      </button>
                    </li>
                  );
                })}
                {matchedOptions.length === 0 && !resolvedTrailing ? (
                  <li className="text-base-content/50 px-2 py-1.5 text-sm">
                    Ничего не найдено
                  </li>
                ) : null}
              </ul>
              {resolvedTrailing ? (
                <div className="border-base-300 shrink-0 border-t p-1">
                  <button
                    type="button"
                    ref={(node) => {
                      listRef.current[matchedOptions.length] = node;
                    }}
                    className={cn(
                      "hover:bg-base-200 w-full rounded-md px-2 py-1.5 text-left text-sm",
                      searchable &&
                        activeHighlightedIndex === matchedOptions.length &&
                        "bg-primary/12 ring-primary ring-2 ring-inset",
                      value === resolvedTrailing.value && "font-semibold",
                      isOptionDisabled?.(resolvedTrailing.value) &&
                        "cursor-not-allowed opacity-50",
                    )}
                    disabled={
                      isOptionDisabled?.(resolvedTrailing.value) ?? false
                    }
                    onClick={() => {
                      if (isOptionDisabled?.(resolvedTrailing.value)) return;
                      selectOption(resolvedTrailing.value);
                    }}
                  >
                    <OptionLabel
                      label={resolvedTrailing.label}
                      hint={resolvedTrailing.hint}
                    />
                  </button>
                </div>
              ) : null}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      ) : null}
    </div>
  );
}
