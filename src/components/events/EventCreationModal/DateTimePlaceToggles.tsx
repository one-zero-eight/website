import { ChangeEvent } from "react";
import { EventFormErrors, EventFormState } from "./CreationForm";

// Max capacity of the event, even if it set to unlimited capcaity
export const MAX_CAPACITY = 1000;

export interface DateTimePlaceTogglesProps {
  eventForm: EventFormState;
  setEventForm: (v: EventFormState) => void;
  errors: EventFormErrors;
}

/**
 * Date Time Place & Toggles component for creating event modal
 * @param eventForm
 * @param setEventForm
 * @param errors
 */
export function DateTimePlaceToggles({
  eventForm,
  setEventForm,
  errors,
}: DateTimePlaceTogglesProps) {
  const isUnlimited = eventForm.capacity === MAX_CAPACITY;

  const handleUnlimitedChange = (e: ChangeEvent<HTMLInputElement>) => {
    const isUnlimited = e.target.checked;
    setEventForm({
      ...eventForm,
      capacity: isUnlimited ? MAX_CAPACITY : 0,
      remain_places: isUnlimited ? MAX_CAPACITY : -1,
    });
  };

  const handleCheckIn = (e: ChangeEvent<HTMLInputElement>) => {
    const [date, time] = e.target.value.split("T");
    setEventForm({ ...eventForm, check_in_date: date, check_in_opens: time });
  };

  return (
    <div className="my-2 flex w-full flex-col flex-nowrap gap-4">
      <fieldset className="fieldset grid grid-cols-1 justify-between gap-2 rounded-lg border border-neutral-100 p-2 pt-0 md:grid-cols-2">
        <legend className="fieldset-legend">Capacity options</legend>
        <input
          type="text"
          value={isUnlimited ? "Unlimited" : eventForm.capacity}
          onChange={(e) => {
            const val = e.target.value;
            const num = Number(val);
            if (!Number.isNaN(num)) {
              setEventForm({ ...eventForm, capacity: num });
            }
          }}
          onBlur={(e) => {
            const num = Number(e.target.value);
            const fixed = Math.min(Math.max(num, 0), MAX_CAPACITY);
            setEventForm({ ...eventForm, capacity: fixed });
          }}
          disabled={isUnlimited}
          className="input"
        />
        <label
          className="label mr-2 text-black dark:text-white"
          htmlFor="isUnlimited"
        >
          <input
            type="checkbox"
            id="isUnlimited"
            className="toggle"
            checked={isUnlimited}
            onChange={handleUnlimitedChange}
          />
          Unlimited Places
        </label>
      </fieldset>

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
            value={eventForm.dtstart}
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
            value={eventForm.dtend}
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

      <fieldset className="fieldset grid grid-cols-1 gap-2 rounded-lg border border-neutral-100 p-2 pt-0 md:grid-cols-2">
        <legend className="fieldset-legend">Check In Opens</legend>
        <input
          type="datetime-local"
          className="input"
          value={eventForm.check_in_date + "T" + eventForm.check_in_opens}
          onChange={handleCheckIn}
          disabled={eventForm.check_in_on_open}
        />
        <label className="label mr-2 text-black dark:text-white">
          <input
            type="checkbox"
            className="toggle"
            checked={eventForm.check_in_on_open}
            onChange={() =>
              setEventForm({
                ...eventForm,
                check_in_on_open: !eventForm.check_in_on_open,
              })
            }
          />
          Open check-in on create
        </label>
      </fieldset>

      <fieldset className="fieldset flex flex-col flex-wrap gap-2">
        <legend className="fieldset-legend">Additional Options</legend>
        <label className="label mr-2 text-black dark:text-white">
          <input
            type="checkbox"
            className="toggle"
            checked={eventForm.is_draft}
            onChange={() =>
              setEventForm({
                ...eventForm,
                is_draft: !eventForm.is_draft,
              })
            }
          />
          Save as draft
        </label>
      </fieldset>
    </div>
  );
}
