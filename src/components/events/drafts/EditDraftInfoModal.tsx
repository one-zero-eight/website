import { formatApiErrorDescriptor } from "@/api/helpers/create-query-client";
import { Trans, useLingui } from "@lingui/react/macro";
import { msg } from "@lingui/core/macro";
import { $events } from "@/api/events";
import { SchemaDraftOut } from "@/api/events/types";
import { Modal } from "@/components/common/Modal.tsx";
import { useToast } from "@/components/toast";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  EnrollmentFields,
  enrollmentApiToForm,
  enrollmentFormToApi,
  EnrollmentFormValue,
} from "../shared/EnrollmentFields";
import { eventFieldClass } from "../shared/formStyles";
import { LocationField } from "../shared/LocationField";
import {
  durationHoursFromLocalRange,
  fromDatetimeLocalValue,
  getEventEndsAt,
  getScheduleLocalWarning,
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
  const { t } = useLingui();
  const { showError } = useToast();
  const queryClient = useQueryClient();

  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [location, setLocation] = useState("");
  const [enrollment, setEnrollment] = useState<EnrollmentFormValue>(
    enrollmentApiToForm(null),
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setStartsAt(toDatetimeLocalValue(draft.data.starts_at));
    setEndsAt(
      toDatetimeLocalValue(
        getEventEndsAt(draft.data.starts_at, draft.data.duration_hours),
      ),
    );
    setLocation(draft.data.location?.display_name ?? "");
    setEnrollment(enrollmentApiToForm(draft.data.enrollment));
  }, [open, draft]);

  const scheduleWarning = getScheduleLocalWarning(startsAt, endsAt);

  const { mutate, isPending } = $events.useMutation("patch", "/drafts/{id}", {
    onSuccess: (next) => {
      queryClient.setQueryData(
        $events.queryOptions("get", "/drafts/{id}", {
          params: { path: { id: draft.id } },
        }).queryKey,
        next,
      );
      queryClient.invalidateQueries({
        queryKey: $events.queryOptions("get", "/drafts/{id}", {
          params: { path: { id: draft.id } },
        }).queryKey,
      });
      onOpenChange(false);
    },
    onError: (error) => {
      showError(msg`Error`, formatApiErrorDescriptor(error));
    },
  });

  function handleSubmit() {
    if (scheduleWarning) {
      return;
    }

    const apiEnrollment = enrollmentFormToApi(enrollment);
    if (!apiEnrollment) {
      showError(
        msg`Invalid enrollment`,
        enrollment.type === "external"
          ? msg`Enrollment URL is required for external enrollment.`
          : msg`Capacity must be empty or at least 1.`,
      );
      return;
    }

    mutate({
      params: { path: { id: draft.id } },
      body: {
        starts_at: startsAt ? fromDatetimeLocalValue(startsAt) : null,
        location: location.trim() || "TBA",
        duration_hours: durationHoursFromLocalRange(startsAt, endsAt),
        enrollment: apiEnrollment,
      },
    });
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={t`Edit info`}>
      <form
        className="@container/modal flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span>
              <Trans>Starts at</Trans>
            </span>
            <input
              type="datetime-local"
              className={eventFieldClass()}
              value={startsAt}
              disabled={isPending}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span>
              <Trans>Ends at</Trans>
            </span>
            <input
              type="datetime-local"
              className={eventFieldClass()}
              value={endsAt}
              disabled={isPending}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </label>

          {scheduleWarning && (
            <p className="text-warning text-sm">{scheduleWarning}</p>
          )}
        </div>

        <LocationField
          value={location}
          onChange={setLocation}
          disabled={isPending}
        />
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
            <Trans>Cancel</Trans>
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isPending || !!scheduleWarning}
          >
            {isPending && (
              <span className="loading loading-spinner loading-sm" />
            )}
            <Trans>Save</Trans>
          </button>
        </div>
      </form>
    </Modal>
  );
}
