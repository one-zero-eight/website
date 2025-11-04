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
import clsx from "clsx";
import React, { useRef, useState } from "react";

interface Option {
  value: string;
}

interface CustomSelectProps {
  options: Option[];
  selectedValue: string;
  onChange: (value: string) => void;
  className?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  selectedValue,
  onChange,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const { refs, context, x, y, strategy } = useFloating({
    placement: "bottom-start",
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [offset(4), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  const listRef = useRef<Array<HTMLElement | null>>([]);

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const listNavigation = useListNavigation(context, {
    listRef,
    activeIndex,
    onNavigate: setActiveIndex,
    loop: true,
  });
  const role = useRole(context, { role: "listbox" });

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions(
    [click, dismiss, listNavigation, role],
  );

  const handleSelect = (value: string, index: number) => {
    onChange(value);
    setIsOpen(false);
    setActiveIndex(index);
  };

  return (
    <div className={clsx(className, "relative")}>
      <div
        className="border-primary flex w-full cursor-pointer items-center justify-between rounded-md border p-2"
        ref={refs.setReference}
        {...getReferenceProps({
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
          className={`text-primary h-5 w-5 transition-transform ${
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

      {isOpen && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={refs.setFloating}
              style={{
                position: strategy,
                top: y ?? 0,
                left: x ?? 0,
                width: (refs.reference.current as HTMLElement)?.offsetWidth,
              }}
              className="border-primary bg-inh-primary z-10 mt-1 rounded-md border shadow-lg"
              {...getFloatingProps()}
            >
              {options.map((option, index) => {
                return (
                  <div
                    key={option.value}
                    ref={(node) => {
                      listRef.current[index] = node;
                    }}
                    role="option"
                    tabIndex={index === activeIndex ? 0 : -1}
                    aria-selected={index === activeIndex}
                    className={clsx(
                      "hover:bg-inh-secondary cursor-pointer rounded-md px-4 py-2",
                      activeIndex === index && "bg-inh-secondary",
                    )}
                    {...getItemProps({
                      onClick: () => handleSelect(option.value, index),
                      onKeyDown(event) {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleSelect(option.value, index);
                        }
                      },
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
