// Button style constants
export const CONTROL_BUTTON_CLASS =
  "border-primary bg-inh-primary hover:bg-inh-primary-hover text-base-content flex items-center justify-center gap-2 rounded-box border-2 px-6 py-3 text-base font-semibold transition-all duration-300 hover:shadow-lg sm:px-8 sm:py-4 sm:text-lg md:text-xl";

export const ADD_TIME_BUTTON_CLASS =
  "bg-inh-primary hover:bg-inh-primary-hover text-base-content cursor-pointer rounded-field  px-3 py-1.5 text-sm font-semibold transition-all duration-300 sm:px-4 sm:py-2 sm:text-base md:px-5";

export const PRESET_BUTTON_CLASS =
  "bg-inh-primary hover:bg-inh-primary-hover text-base-content cursor-pointer rounded-field  px-4 py-2 text-sm font-semibold transition-all duration-300 hover:shadow-lg sm:px-6 sm:py-2.5 sm:text-base md:rounded-xl md:px-8 md:py-3 md:text-lg";

// Preset time configurations
export const PRESET_TIME_OPTIONS = [
  { hours: 0, minutes: 30, label: "30 mins" },
  { hours: 0, minutes: 45, label: "45 mins" },
  { hours: 1, minutes: 0, label: "1 hour" },
  { hours: 1, minutes: 30, label: "1.5 hours" },
  { hours: 2, minutes: 0, label: "2 hours" },
];

// Add time button configurations
export const ADD_TIME_OPTIONS = [5, 10, 15, 20, 30];
