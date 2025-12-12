import { $workshops } from "@/api/workshops";
import { ChangeEvent, useEffect, useState } from "react";
import { useToast } from "@/components/toast/index.ts";
import { SchemaBadge, SchemaLink } from "@/api/workshops/types.ts";
import { DateTime } from "./DateTime.tsx";
import { useQueryClient } from "@tanstack/react-query";
import AdditionalInfo from "./AdditionalInfo.tsx";
import { Link, useNavigate } from "@tanstack/react-router";
import { baseEventFormState } from "../utils";
import {
  CreationFormProps,
  EventFormErrors,
  EventFormState,
  EventLink,
} from "../types";
import { MAX_CAPACITY, HOST_NONE, HOST_PICK_CLUB } from "../constants.ts";
import NameDescription from "./NameDescription.tsx";
import ImageUpload from "./ImageUpload.tsx";
import { CheckInType } from "@/api/workshops/types.ts";
import clsx from "clsx";

/**
 * Form for creatig a new event or edit existing
 * @param initialDate - undefined or ISO date if we want to add an event to a specific date
 * @param initialEvent - if we want to edit workshop we should pass an evnent object
 */
export function CreationForm({
  initialEvent,
  initialDate,
  clubUser,
  isAdmin = false,
  onClose,
}: CreationFormProps) {
  const redirect = useNavigate();
  const queryClient = useQueryClient();
  const storageKey = initialEvent ? null : "workshop-form-draft";

  const [eventForm, setEventForm] = useState<EventFormState>(() => {
    if (initialEvent) {
      const dtstartDate = new Date(initialEvent.dtstart || "");
      const dtendDate = new Date(initialEvent.dtend || "");

      const links: EventLink[] = [];
      initialEvent.links.forEach((link, index) =>
        links.push({ title: link?.title || "", url: link?.url, id: index }),
      );

      const shouldBeUnlimited =
        initialEvent.check_in_type === CheckInType.no_check_in ||
        initialEvent.check_in_type === CheckInType.by_link;
      const shouldBeAlwaysOpen =
        initialEvent.check_in_type === CheckInType.no_check_in;

      return {
        ...baseEventFormState,
        ...initialEvent,
        date: dtstartDate.toISOString().split("T")[0],
        dtstart: dtstartDate.toTimeString().slice(0, 5),
        dtend: dtendDate.toTimeString().slice(0, 5),
        place: initialEvent.place || "",
        capacity: shouldBeUnlimited
          ? MAX_CAPACITY
          : initialEvent.capacity || MAX_CAPACITY,
        remain_places: initialEvent.remain_places,
        check_in_date: initialEvent.check_in_opens
          ? initialEvent.check_in_opens.split("T")[0]
          : "",
        check_in_opens: initialEvent.check_in_opens
          ? initialEvent.check_in_opens.split("T")[1].slice(0, 5)
          : "",
        check_in_on_open: shouldBeAlwaysOpen ? true : false,
        links: links,
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

  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const { showSuccess, showError, showConfirm } = useToast();

  const [errors, setErrors] = useState<EventFormErrors>({
    name: null,
    host: null,
    date: null,
    stime: null,
    etime: null,
    links: null,
    checkInLinkError: null,
  });

  const clearSavedData = () => {
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
  };

  useEffect(() => {
    setEventForm((prevForm: EventFormState) => {
      const shouldBeUnlimited =
        prevForm.check_in_type === CheckInType.no_check_in ||
        prevForm.check_in_type === CheckInType.by_link;
      const shouldBeAlwaysOpen =
        prevForm.check_in_type === CheckInType.no_check_in;

      let needsUpdate = false;
      const updates: Partial<EventFormState> = {};

      if (shouldBeUnlimited && prevForm.capacity !== MAX_CAPACITY) {
        updates.capacity = MAX_CAPACITY;
        needsUpdate = true;
      }

      if (shouldBeAlwaysOpen && !prevForm.check_in_on_open) {
        updates.check_in_on_open = true;
        needsUpdate = true;
      }

      if (needsUpdate) {
        return { ...prevForm, ...updates };
      }
      return prevForm;
    });
  }, [eventForm.check_in_type]);

  // ================== API ==================

  const buildApiData = () => {
    if (!eventForm.dtend || !eventForm.dtstart) {
      validateDateTimePlaceToggles();
      return;
    }

    if (eventForm.check_in_type === CheckInType.by_link) {
      setEventForm({
        ...eventForm,
        check_in_on_open: true,
      });
    }

    const date = new Date(eventForm.date);

    // If dtend is less than or equal to dtstart, consider dtend as next day
    if (eventForm.dtend <= eventForm.dtstart) {
      date.setDate(date.getDate() + 1);
    }

    const pad = (n: number): string => n.toString().padStart(2, "0");
    const endDate = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

    const dtstart = `${eventForm.date}T${eventForm.dtstart}:00+03:00`;
    const dtend = `${endDate}T${eventForm.dtend}:00+03:00`;

    // Handle check in openning time
    let check_in_opens = `${eventForm.check_in_date}T${eventForm.check_in_opens}:00+03:00`;
    if (eventForm.check_in_on_open) {
      check_in_opens = new Date().toISOString();
    }

    const links: SchemaLink[] = [];
    eventForm.links.forEach((link: EventLink) =>
      links.push({ title: link.title, url: link.url }),
    );

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
      capacity:
        eventForm.check_in_type === CheckInType.on_innohassle
          ? eventForm.capacity || MAX_CAPACITY
          : MAX_CAPACITY,
      badges: eventForm.badges as SchemaBadge[],
      is_draft: eventForm.is_draft,
      links: links,
      check_in_type: eventForm.check_in_type,
      check_in_link:
        eventForm.check_in_type === CheckInType.by_link
          ? eventForm.check_in_link
          : null,
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
    if (!apiData) {
      showError("Validation Error", "Please fill in all required fields.");
      return;
    }

    createEvent(
      {
        body: {
          ...apiData,
        },
      },
      {
        onSuccess: () => {
          const eventName = apiData.english_name || apiData.russian_name;
          showSuccess(
            "Event Created",
            `Event "${eventName}" has been successfully created.`,
          );
          clearSavedData();
          setEventForm(baseEventFormState);
          setErrors({});
          onClose?.();
          throw redirect({
            to: "/events/$id",
            params: { id: initialEvent?.id || "" },
            reloadDocument: true,
          });
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
    if (!apiData) {
      showError("Validation Error", "Please fill in all required fields.");
      return;
    }

    updateEvent(
      {
        params: { path: { workshop_id: initialEvent.id } },
        body: apiData,
      },
      {
        onSuccess: () => {
          const eventName = apiData.english_name || apiData.russian_name;
          showSuccess(
            "Event Updated",
            `Event "${eventName}" has been successfully updated.`,
          );
          onClose?.();
          throw redirect({
            to: "/events/$id",
            params: { id: initialEvent.id },
            reloadDocument: true,
          });
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

    const eventName = initialEvent.english_name || initialEvent.russian_name;
    const confirmed = await showConfirm({
      title: "Delete Event",
      message: `Are you sure you want to delete the event "${eventName}"?\n\nThis action cannot be undone.`,
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
          const eventName =
            initialEvent.english_name || initialEvent.russian_name;
          showSuccess(
            "Event Deleted",
            `Event "${eventName}" has been successfully deleted.`,
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

  const { mutate: uploadLogo, isPending: isUploadingLogo } =
    $workshops.useMutation("post", "/workshops/{workshop_id}/image", {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: $workshops.queryOptions("get", "/workshops/{workshop_id}", {
            params: { path: { workshop_id: initialEvent?.id || "" } },
          }).queryKey,
        });
        queryClient.invalidateQueries({
          queryKey: $workshops.queryOptions("get", "/workshops/").queryKey,
        });
        setEventForm({ ...eventForm, file: null });
        setLogoPreview(null);
        showSuccess("Logo Uploaded", "Logo uploaded successfully!");
      },
      onError: (error) => {
        console.error("Failed to upload logo:", error);
        showError("Upload Failed", "Failed to upload logo. Please try again.");
      },
    });

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEventForm({ ...eventForm, file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadLogo = () => {
    if (!eventForm.file || !initialEvent) return;

    const formData = new FormData();
    formData.append("image_file", eventForm.file);

    uploadLogo({
      params: { path: { workshop_id: initialEvent.id } },
      // @ts-expect-error - FormData type mismatch with API
      body: formData,
    });
  };

  // ================== Validations ==================

  const validateNameDescription = () => {
    const newErrors: EventFormErrors = {};

    if (!eventForm.english_name.trim() && eventForm.language !== "russian") {
      newErrors.name = "Title is required";
      showError("Validation Error", "English title is required");
    }

    if (!eventForm.russian_name.trim() && eventForm.language !== "english") {
      newErrors.name = "Title is required";
      showError("Validation Error", "Russian title is required");
    }

    if (
      eventForm.host === HOST_PICK_CLUB ||
      eventForm.host === HOST_NONE ||
      !(eventForm.host || "").trim()
    ) {
      newErrors.host = "Host is required";
      showError("Validation Error", "Host is required");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateLinks = () => {
    const newErrors: EventFormErrors = {};

    eventForm.links.forEach((link: EventLink) => {
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
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateDateTimePlaceToggles = () => {
    const newErrors: EventFormErrors = {};

    if (
      eventForm.check_in_type === CheckInType.by_link &&
      !eventForm.check_in_link?.trim()
    ) {
      newErrors.checkInLinkError = "Check-in link is required";
      showError("Validation Error", "Check-in link is required");
    }

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

    if (!initialEvent && eventForm.date) {
      const eventDateTime = new Date(
        `${eventForm.date}T${eventForm.dtstart ?? "00:00"}`,
      );
      const now = new Date();
      if (eventDateTime < now) {
        newErrors.date = "Date/time cannot be in the past";
        showError("Validation Error", "Date/time cannot be in the past");
      }
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
            isAdmin={isAdmin}
            clubs={clubUser ? clubUser.leader_in_clubs : []}
            eventForm={eventForm}
            setEventForm={setEventForm}
          />
        </div>
      </div>

      <div className="card card-border">
        <div className="card-body">
          <h2 className="card-title mb-2">
            <span className="icon-[mdi--image]" />
            Image
          </h2>
          <ImageUpload
            errors={errors}
            form={eventForm}
            setForm={setEventForm}
            handleUploadLogo={handleUploadLogo}
            handleLogoFileChange={handleLogoFileChange}
            isUploadingLogo={isUploadingLogo}
            logoPreview={logoPreview}
            setLogoPreview={setLogoPreview}
          />
        </div>
      </div>

      <div className="card card-border">
        <div className="card-body">
          <h2 className="card-title mb-1">
            <span className="icon-[mdi--people] size-5"></span>
            Check-ins & Place
          </h2>
          <fieldset className="fieldset mb-2">
            <legend className="fieldset-legend">
              Check-in type: <span className="text-red-500">*</span>
            </legend>
            <select
              value={eventForm.check_in_type || ""}
              onChange={(e) => {
                const newCheckInType = e.target.value as CheckInType;
                const shouldBeUnlimited =
                  newCheckInType === CheckInType.no_check_in ||
                  newCheckInType === CheckInType.by_link;

                setEventForm({
                  ...eventForm,
                  check_in_type: newCheckInType,
                  // Auto-set unlimited places for No check-in and By link
                  ...(shouldBeUnlimited && {
                    capacity: MAX_CAPACITY,
                  }),
                  // Auto-set always open for No check-in
                  ...(newCheckInType === CheckInType.no_check_in && {
                    check_in_on_open: true,
                  }),
                });
              }}
              className="select w-full"
            >
              <option value={CheckInType.no_check_in}>No check-in</option>
              <option value={CheckInType.on_innohassle}>On innohassle</option>
              <option value={CheckInType.by_link}>By link</option>
            </select>
            <label className="label">
              <ul className="ml-3 list-disc">
                <li>No check-in: User just adds to calendar</li>
                <li>On innohassle: User check-ins using innohassle system</li>
                <li>By link: Redirects user to specified link</li>
              </ul>
            </label>
          </fieldset>
          <fieldset
            className={`fieldset mb-3 ${eventForm.check_in_type !== CheckInType.by_link ? "hidden" : ""}`}
          >
            <legend className="fieldset-legend">
              Check-in Link: <span className="text-red-500">*</span>
            </legend>
            <input
              className={clsx(
                "input w-full",
                errors.checkInLinkError && "input-error",
              )}
              value={eventForm.check_in_link || ""}
              onChange={(e) =>
                setEventForm({ ...eventForm, check_in_link: e.target.value })
              }
              type="text"
              maxLength={255}
              placeholder="Redirect link"
            />
          </fieldset>
          {errors.checkInLinkError && (
            <p className="mt-1 text-sm text-red-500 dark:text-red-400">
              {errors.checkInLinkError}
            </p>
          )}
          {eventForm.check_in_type !== CheckInType.by_link &&
            eventForm.check_in_type !== CheckInType.no_check_in && (
              <>
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
                  Always open
                </label>
                {!eventForm.check_in_on_open && (
                  <div>
                    <label className="mr-2">Open check-in at:</label>
                    <input
                      type="datetime-local"
                      className="input"
                      value={
                        initialEvent &&
                        eventForm.check_in_date &&
                        eventForm.check_in_opens
                          ? `${eventForm.check_in_date}T${eventForm.check_in_opens}`
                          : ""
                      }
                      onChange={handleCheckIn}
                      disabled={eventForm.check_in_on_open}
                    />
                  </div>
                )}
              </>
            )}
          {eventForm.check_in_type === CheckInType.on_innohassle && (
            <>
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
                    value={isUnlimited ? "Unlimited" : eventForm.capacity || ""}
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
            </>
          )}
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
        <AdditionalInfo
          errors={errors}
          eventForm={eventForm}
          setEventForm={setEventForm}
          className="card-body"
        />
      </div>

      {/* Buttons */}
      <div className="card card-border">
        <div className="card-body">
          <div className="flex flex-row items-center justify-between gap-2">
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
              <span className="text-wrap">Save as draft</span>
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
                Save
              </button>
            </div>
          </div>
          <span className="text-neutral-500">
            (Draft will be hidden to others)
          </span>
        </div>
      </div>
    </div>
  );
}
export type { EventFormErrors };
