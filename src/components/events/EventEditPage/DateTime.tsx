import { EventFormErrors, EventFormState } from "./CreationForm";
import clsx from "clsx";

// Max capacity of the event, even if it set to unlimited capcaity
export const MAX_CAPACITY = 1000;

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
      className={clsx("my-2 flex w-full flex-col flex-nowrap gap-4", className)}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="flex w-full flex-2 flex-col gap-1">
          <label className="text-xs font-medium tracking-wider text-gray-800 uppercase dark:text-white">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={eventForm.date}
            onChange={(e) =>
              setEventForm({ ...eventForm, date: e.target.value })
            }
            className="input"
          />
        </div>

        <div className="flex w-full flex-1 flex-col gap-1">
          <label className="text-xs font-medium tracking-wider text-gray-800 uppercase dark:text-white">
            Place
          </label>
          <input
            type="text"
            className="input"
            placeholder="Room"
            value={eventForm.place ?? ""}
            onChange={(e) =>
              setEventForm({ ...eventForm, place: e.target.value })
            }
          />
        </div>
      </div>

      {errors.date && (
        <p className="text-sm text-red-500 dark:text-red-400">{errors.date}</p>
      )}

      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs font-medium tracking-wider text-gray-800 uppercase dark:text-white">
            Start Time <span className="text-red-500">*</span>
          </label>
          <input
            type="time"
            value={eventForm.dtstart || ""}
            onChange={(e) =>
              setEventForm({ ...eventForm, dtstart: e.target.value })
            }
            className="input"
          />
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs font-medium tracking-wider text-gray-800 uppercase dark:text-white">
            End Time <span className="text-red-500">*</span>
          </label>
          <input
            type="time"
            value={eventForm.dtend || ""}
            onChange={(e) =>
              setEventForm({ ...eventForm, dtend: e.target.value })
            }
            className="input"
          />
        </div>
      </div>

      {errors.stime && (
        <p className="text-sm text-red-500 dark:text-red-400">{errors.stime}</p>
      )}

      {errors.etime && (
        <p className="text-sm text-red-500 dark:text-red-400">{errors.etime}</p>
      )}
    </div>
  );
}
