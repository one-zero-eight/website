import type { IcalExpander } from "@/api/schedule/calendars/IcalExpander.ts";

/**
 * ical.js is heavy, so the expander and the library itself are loaded only
 * when a calendar is actually parsed.
 */
export async function loadIcalExpander(ics: string): Promise<IcalExpander> {
  const { IcalExpander } =
    await import("@/api/schedule/calendars/IcalExpander.ts");
  return new IcalExpander({ ics, skipInvalidDates: true });
}
