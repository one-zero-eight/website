import { forwardRef } from "react";

interface TimerInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  disabled: boolean;
  type: "H" | "M" | "S";
}

export const TimerInput = forwardRef<HTMLInputElement, TimerInputProps>(
  ({ value, onChange, onKeyDown, onFocus, onBlur, disabled, type }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    };

    return (
      <input
        ref={ref}
        type="text"
        size={15}
        value={value}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        disabled={disabled}
        className="w-auto min-w-0 bg-transparent p-0 text-center text-5xl outline-none sm:text-6xl md:text-7xl lg:text-[160px]"
        aria-label={`${type === "H" ? "Hours" : type === "M" ? "Minutes" : "Seconds"}`}
      />
    );
  },
);

TimerInput.displayName = "TimerInput";
