import { $workshops, workshopsTypes } from "@/api/workshops";
import { useState } from "react";
import NameDescription from "./NameDescription.tsx";
import { useToast } from "@/components/toast/index.ts";
import { SchemaBadge, WorkshopLanguage } from "@/api/workshops/types.ts";
import { DateTimePlaceToggles, MAX_CAPACITY } from "./DateTimePlaceToggles.tsx";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { GenericBadgeFormScheme } from "./TagsSelector.tsx";

// Max stage = (amount of pages - 1)
const MAX_STAGE_FORM_INDEX = 1;

export type EventFormState = Omit<
  workshopsTypes.SchemaWorkshop,
  "id" | "created_at" | "badges"
> &
  GenericBadgeFormScheme & {
    date: string;
    check_in_date: string;
    check_in_on_open: boolean;
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
}

// Base (Empty) state for event creation form
const baseEventFormState: EventFormState = {
  english_name: "",
  english_description: "",
  russian_name: "",
  russian_description: "",
  badges: [],
  language: WorkshopLanguage.both,
  host: "",
  capacity: 1000,
  remain_places: 1000,
  is_registrable: false,
  place: "",
  date: "",
  dtstart: "",
  dtend: "",
  check_in_opens: "",
  check_in_date: "",
  check_in_on_open: true,
  is_draft: false,
  is_active: true,
};

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
  const queryClient = useQueryClient();
  const storageKey = initialEvent ? null : "workshop-form-draft";

  const [eventForm, setEentForm] = useState<EventFormState>(() => {
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

  const [formStage, setFormStage] = useState<number>(0);

  const { showSuccess, showError, showConfirm } = useToast();

  const [errors, setErrors] = useState<EventFormErrors>({
    name: null,
    host: null,
    date: null,
    stime: null,
    etime: null,
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
    console.log(dtend);

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
      is_active: eventForm.is_active,
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
          setEentForm(baseEventFormState);
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

  // ================== Form Stages ==================

  const nextStage = () => {
    if (formStage < MAX_STAGE_FORM_INDEX) {
      setFormStage(() => formStage + 1);
    }
  };

  const previousStage = () => {
    if (formStage > 0) {
      setFormStage(() => formStage - 1);
    }
  };

  const handleRenderFormStage = () => {
    switch (formStage) {
      case 0:
        return (
          <NameDescription
            eventForm={eventForm}
            setEventForm={setEentForm}
            errors={errors}
          />
        );
      case 1:
        return (
          <DateTimePlaceToggles
            eventForm={eventForm}
            setEventForm={setEentForm}
            errors={errors}
          />
        );
      default:
        return null;
    }
  };

  const handleNextButton = () => {
    if (formStage != MAX_STAGE_FORM_INDEX) {
      if (validateNameDescription()) nextStage();
    } else {
      if (!validateDateTimePlaceToggles()) return;

      if (initialEvent) handleUpdateEvent();
      else handleCreateEvent();
    }
  };

  const handlePreviousButton = () => {
    if (formStage == 0 && onClose) {
      onClose();
      return;
    }

    previousStage();
  };

  return (
    <div>
      <div className="flex flex-col gap-2">
        {handleRenderFormStage()}

        {/* Buttons */}
        <div
          className={clsx(
            "grid gap-2",
            initialEvent ? "grid-cols-3" : "grid-cols-2",
          )}
        >
          <button
            type="button"
            className="btn btn-outline"
            onClick={handlePreviousButton}
          >
            {formStage == 0 ? "Cancel" : "Go back"}
          </button>
          <button
            className={clsx(
              "btn btn-error btn-outline",
              initialEvent ? "inline-flex" : "hidden",
            )}
            onClick={handleRemoveEvent}
          >
            Delete
          </button>
          <button className="btn btn-primary" onClick={handleNextButton}>
            {formStage == 0 ? "Next" : initialEvent ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
