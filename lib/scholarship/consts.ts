// Courses
export type Courses = "B24" | "B23" | "B22";

export const FORMULA_B_MIN = 3000;
export const FORMULA_B_MAX_MAPPING: Record<Courses, number> = {
  B24: 10000,
  B23: 10000,
  B22: 20000,
};

// Typed marks
export type Mark = "A" | "B" | "C" | "D" | "P" | "F";

// Colors for every mark
export const MARK_COLORS: Record<Mark, string> = {
  A: "#069C56",
  B: "#FF980E",
  C: "#FF681E",
  D: "#D3212C",
  P: "#069C56",
  F: "#D3212C",
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
