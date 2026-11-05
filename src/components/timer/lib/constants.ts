import { msg } from "@lingui/core/macro";

export const MAX_SECONDS = 99 * 3600 + 59 * 60 + 59;

// Preset time configurations
export const PRESET_TIME_OPTIONS = [
  { hours: 0, minutes: 30, label: msg`30 mins` },
  { hours: 0, minutes: 45, label: msg`45 mins` },
  { hours: 1, minutes: 0, label: msg`1 hour` },
  { hours: 1, minutes: 30, label: msg`1.5 hours` },
  { hours: 2, minutes: 0, label: msg`2 hours` },
];

// Add time button configurations
export const ADD_TIME_OPTIONS = [5, 10, 15, 20, 30];
