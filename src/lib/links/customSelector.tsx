import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
} from "@floating-ui/react";
import React, { useEffect, useState } from "react";

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

  const { refs, x, y, strategy, update } = useFloating({
    placement: "bottom-start",
    middleware: [offset(4), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    if (isOpen) {
      update();
    }
  }, [isOpen, update]);

  const handleSelect = (value: string) => {
    onChange(value);
    setIsOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      setIsOpen((prev) => !prev);
    } else if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative sm:block lg:hidden xxl:block">
      <div
        className="flex w-full cursor-pointer items-center justify-between rounded-md border border-brand-violet p-2 md:w-64"
        ref={refs.setReference}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        tabIndex={0} // Make it focusable for keyboard users
        role="button"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span>{options.find((opt) => opt.value === selectedValue)?.value}</span>
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
        4. The Dropdown 
        - Attach `ref={refs.setFloating}` to let Floating UI position it
        - Use `style` props returned by Floating UI to place it correctly
      */}
      {isOpen && (
        <div
          ref={refs.setFloating}
          style={{
            position: strategy,
            top: y ?? 0,
            left: x ?? 0,
          }}
          className="z-10 mt-1 w-full rounded-md border border-brand-violet bg-primary shadow-lg md:w-64"
          role="listbox"
        >
          {options.map((option) => (
            <div
              key={option.value}
              className="cursor-pointer px-4 py-2 hover:bg-secondary"
              onClick={() => handleSelect(option.value)}
              tabIndex={0}
              role="option"
              aria-selected={selectedValue === option.value}
            >
              {option.value}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
