import {
  PrintingOptionsNumberUpAnyOf0,
  PrintingOptionsSidesAnyOf0,
} from "@/api/printers/types.ts";

function calcNumberOfPagesInRanges(ranges: string, until: number) {
  let count = 0;
  for (const elem of ranges.split(","))
    if (elem.includes("-")) {
      if (parseInt(elem.split("-")[0]) > until) break;
      if (parseInt(elem.split("-")[0]) === until) {
        count++;
        break;
      }
      if (parseInt(elem.split("-")[1]) > until)
        count += until - parseInt(elem.split("-")[0]) + 1;
      else
        count +=
          parseInt(elem.split("-")[1]) - parseInt(elem.split("-")[0]) + 1;
    } else {
      if (parseInt(elem) > until) break;
      count++;
    }
  return count;
}

export function calcPrintJobActualPapersCount(
  ranges: string | null,
  copiesCount: number,
  numberUp: PrintingOptionsNumberUpAnyOf0,
  sides: PrintingOptionsSidesAnyOf0,
  pagesCount: number,
) {
  const sideFactor =
    sides === PrintingOptionsSidesAnyOf0.two_sided_long_edge ? 1 / 2 : 1;
  const numberUpFactor = 1 / parseInt(numberUp);
  if (!ranges)
    return Math.ceil(pagesCount * numberUpFactor * sideFactor * copiesCount);
  let pages = Math.ceil(pagesCount * numberUpFactor);
  pages = calcNumberOfPagesInRanges(ranges, pages);
  return Math.ceil(pages * sideFactor * copiesCount);
}

export function expandPageRanges(
  ranges: string | null,
  totalPages: number,
): number[] {
  if (!ranges) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pageSet = new Set<number>();
  for (const part of ranges.split(",")) {
    if (part.includes("-")) {
      const [rawStart, rawEnd] = part.split("-");
      const start = parseInt(rawStart);
      const end = parseInt(rawEnd);
      for (let page = start; page <= end && page <= totalPages; page++) {
        if (page >= 1) pageSet.add(page);
      }
    } else {
      const page = parseInt(part);
      if (page >= 1 && page <= totalPages) pageSet.add(page);
    }
  }

  return [...pageSet].sort((a, b) => a - b);
}

const PAGE_RANGES_PATTERN =
  /^((([0-9]+-[0-9]+)|([0-9]+)),)*(([0-9]+)|([0-9]+-[0-9]+))$/;

/** null = all pages, undefined = invalid in-progress input */
export function tryParsePageRanges(input: string): string | null | undefined {
  const value = input.replace(/\s/g, "");
  if (!value) return null;
  if (!PAGE_RANGES_PATTERN.test(value)) return undefined;
  return value;
}

export function resolvePreviewPageRanges(
  input: string,
  validatedRanges: string | null,
  totalPages: number,
): number[] {
  const parsed = tryParsePageRanges(input);
  const ranges =
    parsed === undefined ? validatedRanges : parsed === null ? null : parsed;
  return expandPageRanges(ranges, totalPages);
}
