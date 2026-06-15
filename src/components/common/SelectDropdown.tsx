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
import { useState } from "react";

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
}) {
  const [open, setOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
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
            <ul
              ref={refs.setFloating}
              style={floatingStyles}
              className={cn(
                "border-base-300 bg-base-100 rounded-box z-50 max-h-56 overflow-y-auto border p-1 shadow-sm",
                menuClassName,
              )}
              {...getFloatingProps()}
            >
              {options.map((option) => {
                const disabled = isOptionDisabled?.(option.value) ?? false;
                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      className={cn(
                        "hover:bg-base-200 w-full rounded-md px-2 py-1.5 text-left text-sm",
                        value === option.value && "bg-base-200 font-semibold",
                        disabled && "cursor-not-allowed opacity-50",
                      )}
                      disabled={disabled}
                      onClick={() => {
                        if (disabled) return;
                        onChange(option.value);
                        setOpen(false);
                      }}
                    >
                      {option.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </FloatingFocusManager>
        </FloatingPortal>
      ) : null}
    </div>
  );
}
