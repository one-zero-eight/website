import React, { useState } from "react";

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

  const handleSelect = (value: string) => {
    onChange(value);
    setIsOpen(false);
  };

  return (
    <div className="relative lg:hidden">
      {/* Select Input */}
      <div
        className="flex w-full cursor-pointer items-center justify-between rounded-md border border-brand-violet p-2 md:w-64"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{options.find((opt) => opt.value === selectedValue)?.value}</span>
        <svg
          className={`h-5 w-5 text-brand-violet transition-transform ${isOpen ? "rotate-180" : ""}`}
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

      {/* Dropdown Options */}
      <div
        className={`absolute z-10 mt-1 w-full transform rounded-md border border-brand-violet bg-primary shadow-lg transition-all duration-300 ease-in-out md:w-64 ${
          isOpen ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
        }`}
        style={{ pointerEvents: isOpen ? "auto" : "none" }}
      >
        {options.map((option) => (
          <div
            key={option.value}
            className="cursor-pointer px-4 py-2 hover:bg-secondary"
            onClick={() => handleSelect(option.value)}
          >
            {option.value}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomSelect;
