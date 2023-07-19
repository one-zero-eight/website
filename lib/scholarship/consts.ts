// Typed marks
export type Mark = "A" | "B" | "C" | "D" | "P" | "F";

// Colors for every mark
export const MARK_COLORS: Record<Mark, string> = {
  A: "#00ff00",
  B: "#00ffff",
  C: "#ffff00",
  D: "#ff0000",
  P: "#00ff00",
  F: "#ff0000",
};

// Values for every mark
export const MARK_VALUES: Record<Mark, number> = {
  A: 5,
  B: 4,
  C: 3,
  D: 2,
  P: 5,
  F: 2,
};

// Every possible typing of mark
export const MARK_MAPPING: Record<string, Mark> = {
  // Original
  A: "A",
  B: "B",
  C: "C",
  D: "D",
  P: "P",
  F: "F",
  // Digits
  "5": "A",
  "4": "B",
  "3": "C",
  "2": "D",
  // Digits with Shift
  "%": "A",
  $: "B",
  ";": "B",
  "#": "C",
  "№": "C",
  "@": "D",
  '"': "D",
  // Russian qwerty
  Ф: "A",
  И: "B",
  С: "C",
  В: "D",
  З: "P",
  // Russian analogs
  А: "A",
  Б: "B",
  Ц: "C",
  Д: "D",
};
