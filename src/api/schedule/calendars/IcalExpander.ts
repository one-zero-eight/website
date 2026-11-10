// Based on https://github.com/mifi/ical-expander/tree/v3.2.0

import ICAL from "ical.js";

type ExpansionResults = {
  events: ICAL.Event[];
  occurrences: ReturnType<ICAL.Event["getOccurrenceDetails"]>[];
};

export class IcalExpander {
  maxIterations: number;
  skipInvalidDates: boolean;
  jCalData: any;
  component: ICAL.Component;
  events: ICAL.Event[];

  constructor(opts: {
    maxIterations?: number;
    skipInvalidDates?: boolean;
    ics: string;
  }) {
    this.maxIterations = opts.maxIterations != null ? opts.maxIterations : 1000;
    this.skipInvalidDates =
      opts.skipInvalidDates != null ? opts.skipInvalidDates : false;

    this.jCalData = ICAL.parse(opts.ics);
    this.component = new ICAL.Component(this.jCalData);
    this.events = this.component
      .getAllSubcomponents("vevent")
      .map((vevent) => new ICAL.Event(vevent));

    if (this.skipInvalidDates) {
      this.events = this.events.filter((evt) => {
        try {
          evt.startDate.toJSDate();
          evt.endDate.toJSDate();
          return true;
        } catch {
          // skipping events with invalid time
          return false;
        }
      });
    }
  }

  between(after: Date | undefined, before: Date | undefined): ExpansionResults {
    function isEventWithinRange(startTime: number, endTime: number) {
      return (
        (!after || endTime >= after.getTime()) &&
        (!before || startTime <= before.getTime())
      );
    }

    function getTimes(
      eventOrOccurrence:
        | ICAL.Event
        | ReturnType<ICAL.Event["getOccurrenceDetails"]>,
    ) {
      const startTime = eventOrOccurrence.startDate.toJSDate().getTime();
      let endTime = eventOrOccurrence.endDate.toJSDate().getTime();

      // If it is an all day event, the end date is set to 00:00 of the next day
      // So we need to make it be 23:59:59 to compare correctly with the given range
      if (eventOrOccurrence.endDate.isDate && endTime > startTime) {
        endTime -= 1;
      }

      return { startTime, endTime };
    }

    const exceptions: ICAL.Event[] = [];

    this.events.forEach((event) => {
      if (event.isRecurrenceException()) exceptions.push(event);
    });

    const result = {
      events: [] as ICAL.Event[],
      occurrences: [] as ReturnType<ICAL.Event["getOccurrenceDetails"]>[],
    };

    this.events
      .filter((e) => !e.isRecurrenceException())
      .forEach((event) => {
        const exdates: number[] = [];

        event.component.getAllProperties("exdate").forEach((exdateProp) => {
          const exdate = exdateProp.getFirstValue() as ICAL.Time;
          exdates.push(exdate.toJSDate().getTime());
        });

        // Recurring event is handled differently
        if (event.isRecurring()) {
          const iterator = event.iterator();

          let next;
          let i = 0;

          do {
            i += 1;
            next = iterator.next();
            if (next) {
              const occurrence = event.getOccurrenceDetails(next);

              const { startTime, endTime } = getTimes(occurrence);

              const isOccurrenceExcluded = exdates.indexOf(startTime) !== -1;

              // TODO check that within same day?
              const exception = exceptions.find(
                (ex) =>
                  ex.uid === event.uid &&
                  ex.recurrenceId.toJSDate().getTime() ===
                    occurrence.startDate.toJSDate().getTime(),
              );

              // We have passed the max date, stop
              if (before && startTime > before.getTime()) break;

              // Check that we are within our range
              if (isEventWithinRange(startTime, endTime)) {
                if (exception) {
                  result.events.push(exception);
                } else if (!isOccurrenceExcluded) {
                  result.occurrences.push(occurrence);
                }
              }
            }
          } while (next && (!this.maxIterations || i < this.maxIterations));

          return;
        }

        // Non-recurring event:
        const { startTime, endTime } = getTimes(event);

        if (isEventWithinRange(startTime, endTime)) result.events.push(event);
      });

    return result;
  }

  before(before: Date): ExpansionResults {
    return this.between(undefined, before);
  }

  after(after: Date): ExpansionResults {
    return this.between(after, undefined);
  }

  all(): ExpansionResults {
    return this.between(undefined, undefined);
  }
}
