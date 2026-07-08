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

function filterSelectOptions<T extends string>(
  options: { value: T; label: string }[],
  query: string,
) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return options;
  return options.filter(
    (option) =>
      option.label.toLowerCase().includes(normalized) ||
      option.value.toLowerCase().includes(normalized),
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
}: {
  value: T | "";
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  placement?: "bottom-start" | "bottom-end";
  matchTriggerWidth?: boolean;
  isOptionDisabled?: (value: T) => boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
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

  const filteredOptions = useMemo(
    () => (searchable ? filterSelectOptions(options, searchQuery) : options),
    [options, searchQuery, searchable],
  );

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
      onChange(optionValue);
      handleOpenChange(false);
    },
    [isOptionDisabled, onChange],
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

  const currentLabel =
    options.find((option) => option.value === value)?.label ?? placeholder;

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
        <span className={cn("truncate", !value && "text-base-content/50")}>
          {currentLabel}
        </span>
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
                {filteredOptions.map((option, index) => {
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
                        {option.label}
                      </button>
                    </li>
                  );
                })}
                {filteredOptions.length === 0 ? (
                  <li className="text-base-content/50 px-2 py-1.5 text-sm">
                    Ничего не найдено
                  </li>
                ) : null}
              </ul>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      ) : null}
    </div>
  );
}
