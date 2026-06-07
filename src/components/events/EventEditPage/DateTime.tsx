import { EventFormState, EventFormErrors } from "../types";
import { cn } from "@/lib/ui/cn";

export interface DateTimeProps {
  eventForm: EventFormState;
  setEventForm: (v: EventFormState) => void;
  errors: EventFormErrors;
  className?: string;
}

/**
 * Date Time Place & Toggles component for creating event modal
 * @param eventForm
 * @param setEventForm
 * @param errors
 */
export function DateTime({
  eventForm,
  setEventForm,
  errors,
  className,
}: DateTimeProps) {
  return (
    <div
      className={cn("my-2 flex w-full flex-col flex-nowrap gap-4", className)}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex w-full flex-col gap-1">
            <label className="text-base-content text-xs font-medium tracking-wider">
              Start date: <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={eventForm.date}
              onChange={(e) =>
                setEventForm({
                  ...eventForm,
                  date: e.target.value,
                  end_date: eventForm.end_date || e.target.value,
                })
              }
              className="input w-full"
            />
          </div>

          <div className="flex w-full flex-col gap-1">
            <label className="text-base-content text-xs font-medium tracking-wider">
              Start time: <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={eventForm.dtstart || ""}
              onChange={(e) =>
                setEventForm({ ...eventForm, dtstart: e.target.value })
              }
              className="input w-full"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex w-full flex-col gap-1">
            <label className="text-base-content text-xs font-medium tracking-wider">
              End date: <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={eventForm.end_date}
              onChange={(e) =>
                setEventForm({ ...eventForm, end_date: e.target.value })
              }
              className="input w-full"
            />
          </div>

          <div className="flex w-full flex-col gap-1">
            <label className="text-base-content text-xs font-medium tracking-wider">
              End time: <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={eventForm.dtend || ""}
              onChange={(e) =>
                setEventForm({ ...eventForm, dtend: e.target.value })
              }
              className="input w-full"
            />
          </div>
        </div>
      </div>

      {errors.date && (
        <p className="text-sm text-red-500 dark:text-red-400">{errors.date}</p>
      )}

      {errors.endDate && (
        <p className="text-sm text-red-500 dark:text-red-400">
          {errors.endDate}
        </p>
      )}

      {errors.stime && (
        <p className="text-sm text-red-500 dark:text-red-400">{errors.stime}</p>
      )}

      {errors.etime && (
        <p className="text-sm text-red-500 dark:text-red-400">{errors.etime}</p>
      )}

      <div className="flex w-full flex-col gap-1">
        <label className="text-base-content text-xs font-medium tracking-wider">
          Place:
        </label>
        <input
          type="text"
          className="input w-full"
          placeholder="Room"
          value={eventForm.place ?? ""}
          onChange={(e) =>
            setEventForm({ ...eventForm, place: e.target.value })
          }
        />
      </div>
    </div>
  );
}
