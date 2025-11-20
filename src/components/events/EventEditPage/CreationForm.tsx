import { $workshops, workshopsTypes } from "@/api/workshops";
import { ChangeEvent, useState } from "react";
import { useToast } from "@/components/toast/index.ts";
import { SchemaBadge } from "@/api/workshops/types.ts";
import { DateTime, MAX_CAPACITY } from "./DateTime.tsx";
import { useQueryClient } from "@tanstack/react-query";
import { GenericBadgeFormScheme } from "./TagsSelector.tsx";
import AdditionalInfo from "./AdditionalInfo.tsx";
import { Link, useNavigate } from "@tanstack/react-router";
import { baseEventFormState } from "../event-utils.ts";
import NameDescription from "./NameDescription.tsx";

export type EventLink = {
  id: number;
  title: string;
  url: string;
};

export type EventFormState = Omit<
  workshopsTypes.SchemaWorkshop,
  "id" | "created_at" | "badges"
> &
  GenericBadgeFormScheme & {
    date: string;
    check_in_date: string;
    check_in_on_open: boolean;
    links: EventLink[];
  };

export interface PostFormProps {
  initialEvent?: workshopsTypes.SchemaWorkshop;
  initialDate?: string;
  onClose?: () => void;
}

export interface EventFormErrors {
  name?: string | null;
  host?: string | null;
  date?: string | null;
  stime?: string | null;
  etime?: string | null;
  links?: string | null;
}

/**
 * Form for creatig a new event or edit existing
 * @param initialDate - undefined or ISO date if we want to add an event to a specific date
 * @param initialEvent - if we want to edit workshop we should pass an evnent object
 */
export function CreationForm({
  initialEvent,
  initialDate,
  onClose,
}: PostFormProps) {
  const redirect = useNavigate();
  const queryClient = useQueryClient();
  const storageKey = initialEvent ? null : "workshop-form-draft";

  const [eventForm, setEventForm] = useState<EventFormState>(() => {
    if (initialEvent) {
      const dtstartDate = new Date(initialEvent.dtstart);
      const dtendDate = new Date(initialEvent.dtend);

      return {
        ...baseEventFormState,
        ...initialEvent,
        date: dtstartDate.toISOString().split("T")[0],
        dtstart: dtstartDate.toTimeString().slice(0, 5),
        dtend: dtendDate.toTimeString().slice(0, 5),
        place: initialEvent.place || "",
        capacity: initialEvent.capacity || MAX_CAPACITY,
        remain_places: initialEvent.remain_places,
        check_in_date: initialEvent.check_in_opens.split("T")[0],
        check_in_opens: initialEvent.check_in_opens.split("T")[1].slice(0, 5),
        check_in_on_open: false,
      };
    }

    if (initialDate) {
      return {
        ...baseEventFormState,
        date: initialDate,
        dtstart: "18:00",
        dtend: "20:00",
      };
    }

    const savedData = storageKey ? localStorage.getItem(storageKey) : null;
    if (savedData) {
      return { ...baseEventFormState, ...JSON.parse(savedData) };
    }

    return baseEventFormState;
  });

  const { showSuccess, showError, showConfirm } = useToast();

  const [errors, setErrors] = useState<EventFormErrors>({
    name: null,
    host: null,
    date: null,
    stime: null,
    etime: null,
    links: null,
  });

  const clearSavedData = () => {
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
  };

  // ================== API ==================

  const buildApiData = () => {
    const [hour, minutes] = eventForm.dtend.split(":").map(Number);
    const date = new Date(eventForm.date);

    if (hour === 0 && minutes === 0) date.setDate(date.getDate() + 1);

    const pad = (n: number) => n.toString().padStart(2, "0");
    const endDate = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

    const dtstart = `${eventForm.date}T${eventForm.dtstart}:00+03:00`;
    const dtend = `${endDate}T${eventForm.dtend}:00+03:00`;

    // Handle check in openning time
    let check_in_opens = `${eventForm.check_in_date}T${eventForm.check_in_opens}:00+03:00`;
    if (eventForm.check_in_on_open) {
      if (initialEvent) check_in_opens = initialEvent.dtstart;
      else check_in_opens = new Date().toISOString();
    }

    return {
      english_name: eventForm.english_name,
      russian_name: eventForm.russian_name,
      english_description: eventForm.english_description,
      russian_description: eventForm.russian_description,
      language: eventForm.language,
      host: eventForm.host,
      dtstart,
      dtend,
      check_in_opens,
      place: eventForm.place?.trim() || "TBA",
      capacity: eventForm.capacity || MAX_CAPACITY,
      badges: eventForm.badges as SchemaBadge[],
      is_draft: eventForm.is_draft,
    };
  };

  const { mutate: createEvent } = $workshops.useMutation(
    "post",
    "/workshops/",
    {
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: $workshops.queryOptions("get", "/workshops/").queryKey,
        });
      },
    },
  );

  const handleCreateEvent = () => {
    const apiData = buildApiData();
    createEvent(
      {
        body: {
          ...apiData,
        },
      },
      {
        onSuccess: () => {
          showSuccess(
            "Event Created",
            `Event "${apiData.english_name || apiData.russian_name}" has been successfully created.`,
          );
          clearSavedData();
          setEventForm(baseEventFormState);
          setErrors({});
          if (onClose) {
            onClose();
          }
        },
        onError: () => {
          showError(
            "Creation Failed",
            "Failed to create event. Please check all fields and try again.",
          );
        },
      },
    );
  };

  const { mutate: updateEvent } = $workshops.useMutation(
    "put",
    "/workshops/{workshop_id}",
    {
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: $workshops.queryOptions("get", "/workshops/").queryKey,
        });
      },
    },
  );

  const handleUpdateEvent = () => {
    if (!initialEvent) return;

    const apiData = buildApiData();
    updateEvent(
      {
        params: { path: { workshop_id: initialEvent.id } },
        body: apiData,
      },
      {
        onSuccess: () => {
          showSuccess(
            "Event Updated",
            `Event "${apiData.english_name || apiData.russian_name}" has been successfully updated.`,
          );
          onClose?.();
        },
        onError: () => {
          showError(
            "Update Failed",
            "Failed to update event. Please check all fields and try again.",
          );
        },
      },
    );
  };

  const { mutate: removeEvent } = $workshops.useMutation(
    "delete",
    "/workshops/{workshop_id}",
    {
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: $workshops.queryOptions("get", "/workshops/").queryKey,
        });
        onClose?.();
        throw redirect({ to: "/events" });
      },
    },
  );

  const handleRemoveEvent = async () => {
    if (!initialEvent) return;

    const confirmed = await showConfirm({
      title: "Delete Workshop",
      message: `Are you sure you want to delete the workshop "${initialEvent.english_name || initialEvent.russian_name}"?\n\nThis action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "error",
    });

    if (!confirmed) {
      return;
    }

    removeEvent(
      { params: { path: { workshop_id: initialEvent.id } } },
      {
        onSuccess: () => {
          showSuccess(
            "Event Deleted",
            `Event "${initialEvent.english_name || initialEvent.russian_name}" has been successfully deleted.`,
          );
        },
        onError: () => {
          showError(
            "Delete Failed",
            "Failed to delete event. Please try again.",
          );
        },
      },
    );
  };

  // ================== Validations ==================

  const validateNameDescription = () => {
    const newErrors = {} as EventFormErrors;

    if (!eventForm.english_name.trim() && eventForm.language != "russian") {
      newErrors.name = "Title is required";
      showError("Validation Error", "English title is required");
    }

    if (!eventForm.russian_name.trim() && eventForm.language != "english") {
      newErrors.name = "Title is required";
      showError("Validation Error", "Russian title is required");
    }

    if (!eventForm.host.trim()) {
      newErrors.host = "Host is required";
      showError("Validation Error", "Host is required");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateLinks = () => {
    const newErrors = {} as EventFormErrors;

    eventForm.links.forEach((link) => {
      if (!link.title.trim()) {
        newErrors.links = "Title for link shouldn't be empty";
        showError("Validation Error", "Title for link shouldn't be empty");
        return;
      }

      if (!link.url.trim()) {
        newErrors.links = "URL for link shouldn't be empty";
        showError("Validation Error", "URL for link shouldn't be empty");
        return;
      }

      // const urlValidationRegex =
      //   /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/;
      // if (!urlValidationRegex.test(link.url)) {
      //   newErrors.links = "URL should be valid";
      //   showError("Validation Error", "URL should be valid");
      //   return;
      // }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateDateTimePlaceToggles = () => {
    const newErrors = {} as EventFormErrors;

    if (!eventForm.date) {
      newErrors.date = "Date is required";
      showError("Validation Error", "Date is required");
    }

    if (!eventForm.dtstart) {
      newErrors.stime = "Start time is required";
      showError("Validation Error", "Start time is required");
    }

    if (!eventForm.dtend) {
      newErrors.etime = "End time required";
      showError("Validation Error", "End time required");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ================== Helpers ==================
  const handleCheckIn = (e: ChangeEvent<HTMLInputElement>) => {
    const [date, time] = e.target.value.split("T");
    setEventForm({ ...eventForm, check_in_date: date, check_in_opens: time });
  };

  const handleNextButton = () => {
    if (
      validateNameDescription() &&
      validateLinks() &&
      validateDateTimePlaceToggles()
    ) {
      if (initialEvent) handleUpdateEvent();
      else handleCreateEvent();
    }
  };

  const isUnlimited = eventForm.capacity === MAX_CAPACITY;

  const handleUnlimitedChange = (e: ChangeEvent<HTMLInputElement>) => {
    const isUnlimited = e.target.checked;
    setEventForm({
      ...eventForm,
      capacity: isUnlimited ? MAX_CAPACITY : 0,
      remain_places: isUnlimited ? MAX_CAPACITY : -1,
    });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-4">
      <div className="card card-border xl:min-w-3xl">
        <div className="card-body flex flex-row items-center justify-between">
          <h2 className="font-semibold md:text-xl xl:text-2xl">Edit event</h2>
          <div className="flex gap-2">
            {initialEvent ? (
              <Link
                to="/events/$id"
                params={{ id: initialEvent.id }}
                type="button"
                className="btn btn-ghost"
              >
                <span className="icon-[mdi--arrow-left] size-5" />
                Back to event
              </Link>
            ) : (
              <Link to="/events" type="button" className="btn btn-ghost">
                <span className="icon-[mdi--arrow-left] size-5" />
                Back to list
              </Link>
            )}
            <button
              onClick={handleRemoveEvent}
              className="btn btn-square btn-ghost btn-error"
            >
              <span className="icon-[solar--trash-bin-2-bold] text-lg" />
            </button>
          </div>
        </div>
      </div>
      <div className="card card-border">
        <div className="card-body">
          <h2 className="card-title mb-2">
            <span className="icon-[ix--pen]"></span>Name & Description
          </h2>
          <NameDescription
            errors={errors}
            eventForm={eventForm}
            setEventForm={setEventForm}
          />
        </div>
      </div>
      <div className="card card-border">
        <div className="card-body">
          <h2 className="card-title">
            <span className="icon-[mdi--calendar-outline]"></span>Date & Time
          </h2>
          <DateTime
            eventForm={eventForm}
            setEventForm={setEventForm}
            errors={errors}
          />
        </div>
      </div>
      <div className="card card-border">
        <div className="card-body">
          <h2 className="card-title mb-2">
            <span className="icon-[mdi--people] size-5"></span> Place &
            Check-ins
          </h2>
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
          {!eventForm.check_in_on_open && (
            <div>
              <label className="mr-2">Check-in time:</label>
              <input
                type="datetime-local"
                className="input"
                value={
                  initialEvent
                    ? eventForm.check_in_date + "T" + eventForm.check_in_opens
                    : ""
                }
                onChange={handleCheckIn}
                disabled={eventForm.check_in_on_open}
              />
            </div>
          )}
          <div className="divider my-1" />
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
          {!isUnlimited && (
            <div>
              <label className="mr-2">Event places:</label>
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
            </div>
          )}
        </div>
      </div>
      <div className="card card-border">
        <AdditionalInfo
          errors={errors}
          eventForm={eventForm}
          setEventForm={setEventForm}
          className="card-body"
        />
      </div>

      {/* Buttons */}
      <div className="card card-border">
        <div className="card-body flex flex-row items-center justify-between gap-2">
          <label className="label mr-2 gap-3 text-black dark:text-white">
            <input
              type="checkbox"
              className="checkbox rounded-md"
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
          <div className="flex items-center gap-2">
            {initialEvent ? (
              <Link
                to="/events/$id"
                params={{ id: initialEvent.id }}
                type="button"
                className="btn btn-ghost"
              >
                Cancel
              </Link>
            ) : (
              <Link to="/events" type="button" className="btn btn-ghost">
                Cancel
              </Link>
            )}
            <button className="btn btn-primary" onClick={handleNextButton}>
              {initialEvent ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
