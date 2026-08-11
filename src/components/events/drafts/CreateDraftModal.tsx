import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { $workshops } from "@/api/workshops";
import { Modal } from "@/components/common/Modal.tsx";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DurationField, durationFormToApi } from "../shared/DurationField";
import {
  defaultEnrollmentForm,
  EnrollmentFields,
  enrollmentFormToApi,
  EnrollmentFormValue,
} from "../shared/EnrollmentFields";
import { eventFieldClass } from "../shared/formStyles";
import {
  fromDatetimeLocalValue,
  isDatetimeLocalInPast,
} from "../utils/datetime";

export function CreateDraftModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { showError } = useToast();
  const { data: allowedLocales = [] } = $workshops.useQuery("get", "/locales");

  const [startsAt, setStartsAt] = useState("");
  const [location, setLocation] = useState("");
  const [selectedLocales, setSelectedLocales] = useState<string[]>([]);
  const [durationHours, setDurationHours] = useState("");
  const [enrollment, setEnrollment] = useState<EnrollmentFormValue>(
    defaultEnrollmentForm(),
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setStartsAt("");
    setLocation("");
    setSelectedLocales(allowedLocales.slice(0, 1));
    setDurationHours("");
    setEnrollment(defaultEnrollmentForm());
  }, [open, allowedLocales]);

  const { mutate, isPending } = $workshops.useMutation("post", "/drafts/", {
    onSuccess: (draft) => {
      onOpenChange(false);
      navigate({ to: "/events/drafts/$id", params: { id: draft.id } });
    },
    onError: (error) => {
      showError("Error", formatApiErrorMessage(error));
    },
  });

  function handleSubmit() {
    if (startsAt && isDatetimeLocalInPast(startsAt)) {
      showError("Invalid date", "Start time cannot be in the past.");
      return;
    }

    if (durationHours.trim()) {
      const duration = durationFormToApi(durationHours);
      if (duration === null) {
        showError("Invalid duration", "Duration must be a positive number.");
        return;
      }
    }

    const apiEnrollment = enrollmentFormToApi(enrollment);
    if (!apiEnrollment) {
      showError(
        "Invalid enrollment",
        enrollment.type === "external"
          ? "Enrollment URL is required for external enrollment."
          : "Capacity must be empty or at least 1.",
      );
      return;
    }

    mutate({
      body: {
        starts_at: startsAt ? fromDatetimeLocalValue(startsAt) : null,
        location: location.trim() || "TBA",
        locales: selectedLocales,
        duration_hours: durationFormToApi(durationHours),
        enrollment: apiEnrollment,
      },
    });
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Create draft">
      <form
        className="@container/modal flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <div className="grid grid-cols-1 gap-4 @min-[400px]/modal:grid-cols-[minmax(0,1fr)_8rem]">
          <label className="flex flex-col gap-1 text-sm">
            <span>Starts at</span>
            <input
              type="datetime-local"
              className={eventFieldClass()}
              value={startsAt}
              disabled={isPending}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </label>

          <DurationField
            value={durationHours}
            onChange={setDurationHours}
            disabled={isPending}
          />
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span>Location</span>
          <input
            type="text"
            className={eventFieldClass()}
            placeholder="TBA"
            value={location}
            disabled={isPending}
            onChange={(e) => setLocation(e.target.value)}
          />
        </label>

        <EnrollmentFields
          value={enrollment}
          onChange={setEnrollment}
          disabled={isPending}
        />

        <div className="flex flex-col gap-2">
          <span className="text-sm">Locales</span>
          <div className="flex flex-wrap gap-2">
            {allowedLocales.map((locale) => {
              const selected = selectedLocales.includes(locale);
              return (
                <button
                  key={locale}
                  type="button"
                  disabled={isPending}
                  className={cn(
                    "btn btn-sm uppercase",
                    selected ? "btn-primary" : "btn-ghost border",
                  )}
                  onClick={() =>
                    setSelectedLocales((prev) =>
                      selected
                        ? prev.filter((item) => item !== locale)
                        : [...prev, locale],
                    )
                  }
                >
                  {locale}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isPending}
          >
            {isPending && (
              <span className="loading loading-spinner loading-sm" />
            )}
            Create
          </button>
        </div>
      </form>
    </Modal>
  );
}
