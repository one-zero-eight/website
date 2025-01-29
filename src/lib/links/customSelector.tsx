import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useListNavigation,
  useRole,
} from "@floating-ui/react";
import React, { useRef, useState } from "react";

interface Option {
  value: string;
}

interface CustomSelectProps {
  options: Option[];
  selectedValue: string;
  onChange: (value: string) => void;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  selectedValue,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  // Track which option is currently highlighted via keyboard
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // `useFloating` to handle positioning, open state, and references
  const { refs, context, x, y, strategy } = useFloating({
    placement: "bottom-start",
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [offset(4), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  // Keep refs for each option so `useListNavigation` can manage them
  const listRef = useRef<Array<HTMLElement | null>>([]);

  // --- Floating UI Hooks ---
  // 1) `useClick` handles toggle open/close on reference click
  const click = useClick(context);
  // 2) `useDismiss` closes dropdown on outside click or Escape key
  const dismiss = useDismiss(context);
  // 3) `useListNavigation` for arrow key navigation among options
  const listNavigation = useListNavigation(context, {
    listRef,
    activeIndex,
    onNavigate: setActiveIndex,
    loop: true, // If you want the arrow keys to loop around
  });
  // 4) `useRole` sets the correct ARIA role for the floating element
  const role = useRole(context, { role: "listbox" });

  // Combine the interaction hooks. This returns getters for the reference and floating elements.
  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions(
    [click, dismiss, listNavigation, role],
  );

  // When a user selects an option
  const handleSelect = (value: string, index: number) => {
    onChange(value);
    setIsOpen(false);
    setActiveIndex(index);
  };

  return (
    <div className="relative sm:block lg:hidden xxl:block">
      {/* 
        Reference (the button / trigger element).
        We spread getReferenceProps to merge all interactions from the floating hooks.
      */}
      <div
        className="flex w-full cursor-pointer items-center justify-between rounded-md border border-brand-violet p-2 md:w-64"
        ref={refs.setReference}
        {...getReferenceProps({
          // If you still want additional keyboard handling, you can put it here
          tabIndex: 0,
          role: "button",
          "aria-haspopup": true,
          "aria-expanded": isOpen,
        })}
      >
        <span>
          {options.find((opt) => opt.value === selectedValue)?.value ||
            "Select..."}
        </span>
        <svg
          className={`h-5 w-5 text-brand-violet transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>

      {/* 
        The Dropdown.
        We can wrap it with FloatingFocusManager to control focus when open.
        Use a FloatingPortal if you want to render in a portal (often helpful for modals/overlays).
      */}
      {isOpen && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={refs.setFloating}
              style={{
                position: strategy,
                top: y ?? 0,
                left: x ?? 0,
              }}
              className="z-10 mt-1 w-full rounded-md border border-brand-violet bg-primary shadow-lg md:w-64"
              {...getFloatingProps()}
            >
              {options.map((option, index) => {
                // Setup the ref for each option so list navigation can track them
                return (
                  <div
                    key={option.value}
                    className={`cursor-pointer rounded-md px-4 py-2 hover:bg-secondary ${activeIndex === index ? "bg-secondary" : ""}`}
                    {...getItemProps({
                      ref(node) {
                        listRef.current[index] = node;
                      },
                      role: "option",
                      "aria-selected": selectedValue === option.value,
                      // When the user clicks, select this option
                      onClick: () => handleSelect(option.value, index),
                    })}
                  >
                    {option.value}
                  </div>
                );
              })}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </div>
  );
};

export default CustomSelect;
