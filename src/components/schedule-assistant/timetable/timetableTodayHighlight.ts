import { cn } from "@/lib/ui/cn";

import {
  dayKey,
  todayIsoDate,
  type WeekRange,
} from "./timetableViewerModel.ts";

const TODAY_HEAD_SHADOW =
  "shadow-[inset_2px_0_0_#f5a623,inset_-2px_0_0_#f5a623,inset_0_2px_0_#f5a623]";
const TODAY_BODY_SHADOW =
  "shadow-[inset_2px_0_0_#f5a623,inset_-2px_0_0_#f5a623]";
const TODAY_BODY_LAST_SHADOW =
  "shadow-[inset_2px_0_0_#f5a623,inset_-2px_0_0_#f5a623,inset_0_-2px_0_#f5a623]";
const TODAY_LEFT_SHADOW = "shadow-[inset_2px_0_0_#f5a623]";
const TODAY_LEFT_LAST_SHADOW =
  "shadow-[inset_2px_0_0_#f5a623,inset_0_-2px_0_#f5a623]";
const TODAY_RIGHT_SHADOW = "shadow-[inset_-2px_0_0_#f5a623]";
const TODAY_RIGHT_LAST_SHADOW =
  "shadow-[inset_-2px_0_0_#f5a623,inset_0_-2px_0_#f5a623]";

export function isTodayWeekdayInDisplayedWeek(
  weekday: string,
  week: WeekRange | null | undefined,
  today: string = todayIsoDate(),
) {
  if (!week) return false;
  if (today < week.start || today > week.end) return false;
  return dayKey(today) === weekday;
}

export function todayCalendarColumnHeadClass(isToday: boolean) {
  if (!isToday) return null;
  return cn(TODAY_HEAD_SHADOW, "font-semibold text-[#1d3f70]");
}

export function todayCalendarColumnBodyClass(
  isToday: boolean,
  isLastRow: boolean,
) {
  if (!isToday) return null;
  return isLastRow ? TODAY_BODY_LAST_SHADOW : TODAY_BODY_SHADOW;
}

export function todayGroupsDayRowClass(isToday: boolean) {
  if (!isToday) return null;
  return TODAY_HEAD_SHADOW;
}

export function todayGroupsSlotTimeClass(
  isToday: boolean,
  isLastSlot: boolean,
) {
  if (!isToday) return null;
  return isLastSlot ? TODAY_LEFT_LAST_SHADOW : TODAY_LEFT_SHADOW;
}

export function todayGroupsSlotCellClass(
  isToday: boolean,
  isLastCell: boolean,
  isLastSlot: boolean,
) {
  if (!isToday) return null;
  if (isLastCell) {
    return isLastSlot ? TODAY_RIGHT_LAST_SHADOW : TODAY_RIGHT_SHADOW;
  }
  return isLastSlot ? "shadow-[inset_0_-2px_0_#f5a623]" : null;
}
