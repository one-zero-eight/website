/* eslint-disable */
// @ts-nocheck
import { EventInput } from "@fullcalendar/core";
import {
  addDays,
  DateRange,
  EventSourceDef,
} from "@fullcalendar/core/internal";
import ICAL from "ical.js";
import { IcalExpander } from "./ical-expander/IcalExpander";

interface ICalFeedMeta {
  url: string;
  format: "ics"; // for EventSourceApi
  internalState?: InternalState; // HACK. TODO: use classes in future
  color: string; // Default color for events from this feed
  sourceLink?: string;
  updatedAt?: string;
  eventGroup?: any;
}

interface InternalState {
  iCalExpanderPromise: Promise<IcalExpander>;
  response: Response | null;
}

export const eventSourceDef: EventSourceDef<ICalFeedMeta> = {
  parseMeta(refined) {
    if (refined.url && refined.format === "ics") {
      return {
        url: refined.url,
        format: "ics",
        color: refined.color,
        sourceLink: refined.extraParams?.sourceLink,
        updatedAt: refined.extraParams?.updatedAt,
        eventGroup: refined.extraParams?.eventGroup,
      };
    }
    return null;
  },

  fetch(arg, successCallback, errorCallback) {
    let meta: ICalFeedMeta = arg.eventSource.meta;
    let { internalState } = meta;

    /*
    NOTE: isRefetch is a HACK. we would do the recurring-expanding in a separate plugin hook,
    but we couldn't leverage built-in allDay-guessing, among other things.
    */
    if (!internalState || arg.isRefetch) {
      internalState = meta.internalState = {
        response: null,
        iCalExpanderPromise: fetch(meta.url, {
          method: "GET",
          headers:
            localStorage.getItem("accessToken") &&
            localStorage.getItem("accessToken").length > 5
              ? {
                  Authorization:
                    "Bearer " +
                    localStorage.getItem("accessToken")?.slice(1, -1),
                }
              : undefined,
        }).then((response) => {
          return response.text().then((icsText) => {
            internalState.response = response;
            return new IcalExpander({
              ics: icsText,
              skipInvalidDates: true,
            });
          });
        }),
      };
    }

    internalState.iCalExpanderPromise.then((iCalExpander) => {
      successCallback({
        rawEvents: expandICalEvents(iCalExpander, arg.range, meta),
        response: internalState.response,
      });
    }, errorCallback);
  },
};

function expandICalEvents(
  iCalExpander: IcalExpander,
  range: DateRange,
  meta: ICalFeedMeta,
): EventInput[] {
  // expand the range. because our `range` is timeZone-agnostic UTC
  // or maybe because ical.js always produces dates in local time? i forget
  let rangeStart = addDays(range.start, -1);
  let rangeEnd = addDays(range.end, 1);

  let iCalRes = iCalExpander.between(rangeStart, rangeEnd); // end inclusive. will give extra results
  let expanded: EventInput[] = [];

  // TODO: instead of using startDate/endDate.toString to communicate allDay,
  // we can query startDate/endDate.isDate. More efficient to avoid formatting/reparsing.

  // single events
  for (let iCalEvent of iCalRes.events) {
    expanded.push({
      ...buildNonDateProps(iCalEvent, meta, iCalExpander),
      start: iCalEvent.startDate.toString(),
      end:
        specifiesEnd(iCalEvent) && iCalEvent.endDate
          ? iCalEvent.endDate.toString()
          : null,
    });
  }

  // recurring event instances
  for (let iCalOccurence of iCalRes.occurrences) {
    let iCalEvent = iCalOccurence.item;
    expanded.push({
      ...buildNonDateProps(iCalEvent, meta, iCalExpander),
      start: iCalOccurence.startDate.toString(),
      end:
        specifiesEnd(iCalEvent) && iCalOccurence.endDate
          ? iCalOccurence.endDate.toString()
          : null,
    });
  }

  return expanded;
}

function buildNonDateProps(
  iCalEvent: ICAL.Event,
  meta: ICalFeedMeta,
  iCalExpander: IcalExpander,
): EventInput {
  return {
    id: iCalEvent.uid,
    title: iCalEvent.summary,
    url: extractEventUrl(iCalEvent),
    color: iCalEvent.color || meta.color,
    extendedProps: {
      location: iCalEvent.location,
      organizer: iCalEvent.organizer,
      description: iCalEvent.description,
      calendarURLs: [meta.url],
      sourceLink:
        iCalExpander.component.getFirstProperty("x-wr-link")?.getFirstValue() ||
        meta.sourceLink,
      updatedAt: meta.eventGroup?.updated_at || meta.updatedAt,
      eventGroup: meta.eventGroup,
    },
  };
}

function extractEventUrl(iCalEvent: ICAL.Event): string {
  let urlProp = iCalEvent.component.getFirstProperty("url");
  return urlProp ? urlProp.getFirstValue() : "";
}

function specifiesEnd(iCalEvent: ICAL.Event) {
  return (
    Boolean(iCalEvent.component.getFirstProperty("dtend")) ||
    Boolean(iCalEvent.component.getFirstProperty("duration"))
  );
}
