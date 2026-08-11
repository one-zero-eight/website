import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { $workshops } from "@/api/workshops";
import { SchemaDraftOut } from "@/api/workshops/types";
import { Modal } from "@/components/common/Modal.tsx";
import { useToast } from "@/components/toast";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  DurationField,
  durationApiToForm,
  durationFormToApi,
} from "../shared/DurationField";
import {
  EnrollmentFields,
  enrollmentApiToForm,
  enrollmentFormToApi,
  EnrollmentFormValue,
} from "../shared/EnrollmentFields";
import { eventFieldClass } from "../shared/formStyles";
import {
  fromDatetimeLocalValue,
  isDatetimeLocalInPast,
  toDatetimeLocalValue,
} from "../utils/datetime";

export function EditDraftInfoModal({
  open,
  onOpenChange,
  draft,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: SchemaDraftOut;
}) {
  const { showError } = useToast();
  const queryClient = useQueryClient();

  const [startsAt, setStartsAt] = useState("");
  const [location, setLocation] = useState("");
  const [durationHours, setDurationHours] = useState("");
  const [enrollment, setEnrollment] = useState<EnrollmentFormValue>(
    enrollmentApiToForm(null),
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setStartsAt(toDatetimeLocalValue(draft.data.starts_at));
    setLocation(draft.data.location ?? "");
    setDurationHours(durationApiToForm(draft.data.duration_hours));
    setEnrollment(enrollmentApiToForm(draft.data.enrollment));
  }, [open, draft]);

  const { mutate, isPending } = $workshops.useMutation(
    "patch",
    "/drafts/{id}",
    {
      onSuccess: (next) => {
        queryClient.setQueryData(
          $workshops.queryOptions("get", "/drafts/{id}", {
            params: { path: { id: draft.id } },
          }).queryKey,
          next,
        );
        queryClient.invalidateQueries({
          queryKey: $workshops.queryOptions("get", "/drafts/{id}", {
            params: { path: { id: draft.id } },
          }).queryKey,
        });
        onOpenChange(false);
      },
      onError: (error) => {
        showError("Error", formatApiErrorMessage(error));
      },
    },
  );

  function handleSubmit() {
    if (startsAt && isDatetimeLocalInPast(startsAt)) {
      showError("Invalid date", "Start time cannot be in the past.");
      return;
    }

    if (durationHours.trim() && durationFormToApi(durationHours) === null) {
      showError("Invalid duration", "Duration must be a positive number.");
      return;
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
      params: { path: { id: draft.id } },
      body: {
        starts_at: startsAt ? fromDatetimeLocalValue(startsAt) : null,
        location: location.trim() || "TBA",
        duration_hours: durationFormToApi(durationHours),
        enrollment: apiEnrollment,
      },
    });
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Edit info">
      <div className="@container/modal flex flex-col gap-4">
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
            type="button"
            className="btn btn-primary"
            disabled={isPending}
            onClick={handleSubmit}
          >
            {isPending && (
              <span className="loading loading-spinner loading-sm" />
            )}
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
