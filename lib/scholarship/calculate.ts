import { Mark, MARK_COLORS, MARK_VALUES } from "@/lib/scholarship/consts";

export const FORMULA_B_MIN = 3000;
export const FORMULA_B_MAX_B22 = 20000;
export const FORMULA_B_MAX_B23 = 10000;

/**
 * Get hex color between two mark colors.
 */
export function calculateColorGPA(gpa: number): string {
  if (isNaN(gpa)) return "#fff";
  // Find marks above and below the given GPA
  const markBottom: Mark = gpa >= 4 ? "B" : gpa >= 3 ? "C" : "D";
  const markTop: Mark = gpa <= 3 ? "C" : gpa <= 4 ? "B" : "A";

  const fraction = gpa - MARK_VALUES[markBottom]; // From 0.00 to 1.00

  // Get RGB representation of colors
  const colorBottom = MARK_COLORS[markBottom]
    .replace("#", "")
    .match(/.{2}/g)!
    .map((value) => parseInt(value, 16));
  const colorTop = MARK_COLORS[markTop]
    .replace("#", "")
    .match(/.{2}/g)!
    .map((value) => parseInt(value, 16));

  // Mix colors
  const color = colorBottom.map((b, i) => b + (colorTop[i] - b) * fraction);

  // Make hex
  return (
    "#" + color.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")
  );
}

/**
 * Calculate GPA from marks.
 */
export function calculateGPA(marks: Mark[]): number {
  // Sum all marks
  const total = marks.reduce((total, v) => total + MARK_VALUES[v], 0);
  // Calculate average and round down to hundreds
  return Math.floor((total * 100) / marks.length) / 100;
}

/**
 * Calculate scholarship from GPA.
 */
export function calculateScholarship(
  GPA: number,
  Bmin: number,
  Bmax: number,
): number {
  // Formula for scholarship
  const S = Bmin + (Bmax - Bmin) * Math.pow((GPA - 2) / 3, 2.5);
  // Round down to the nearest multiple of 100
  return Math.floor(S / 100) * 100;
}

/**
 * Calculate GPA from scholarship.
 */
export function calculateGPAFromScholarship(
  scholarship: number,
  Bmin: number,
  Bmax: number,
): number {
  // Reverse the formula for scholarship
  const gpa = Math.pow((scholarship - Bmin) / (Bmax - Bmin), 1 / 2.5) * 3 + 2;
  // Round up to hundreds
  return Math.ceil(gpa * 100) / 100;
}

/**
 * Calculate marks from GPA.
 */
export function calculateMarksFromGPA(gpa: number): Mark[] {
  // Find marks above and below the given GPA
  const markBottom: Mark = gpa >= 4 ? "B" : gpa >= 3 ? "C" : "D";
  const markTop: Mark = gpa <= 3 ? "C" : gpa <= 4 ? "B" : "A";

  const percent = Math.round((gpa - MARK_VALUES[markBottom]) * 100); // From 0 to 100

  // Calculate for static number of marks
  const marks_count = 10;
  const top = Math.ceil(percent / (100 / marks_count));
  const bottom = marks_count - top;

  // Fill marks array
  const marks: Mark[] = [];
  for (let i = 0; i < top; i++) {
    marks.push(markTop);
  }
  for (let i = 0; i < bottom; i++) {
    marks.push(markBottom);
  }
  return marks;
}
