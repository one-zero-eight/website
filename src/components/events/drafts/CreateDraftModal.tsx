import { formatApiErrorDescriptor } from "@/api/helpers/create-query-client";
import { Trans, useLingui } from "@lingui/react/macro";
import { msg } from "@lingui/core/macro";
import { $events } from "@/api/events";
import { Modal } from "@/components/common/Modal.tsx";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { getLocaleLabel } from "@/locales/lib";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  defaultEnrollmentForm,
  EnrollmentFields,
  enrollmentFormToApi,
  EnrollmentFormValue,
} from "../shared/EnrollmentFields";
import { eventFieldClass } from "../shared/formStyles";
import { LocationField } from "../shared/LocationField";
import {
  durationHoursFromLocalRange,
  fromDatetimeLocalValue,
  getScheduleLocalWarning,
} from "../utils/datetime";

export function CreateDraftModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useLingui();
  const navigate = useNavigate();
  const { showError } = useToast();
  const { data: allowedLocales = [] } = $events.useQuery("get", "/locales");

  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [location, setLocation] = useState("");
  const [selectedLocales, setSelectedLocales] = useState<string[]>([]);
  const [enrollment, setEnrollment] = useState<EnrollmentFormValue>(
    defaultEnrollmentForm(),
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setStartsAt("");
    setEndsAt("");
    setLocation("");
    setSelectedLocales(allowedLocales.slice(0, 1));
    setEnrollment(defaultEnrollmentForm());
  }, [open, allowedLocales]);

  const scheduleWarning = getScheduleLocalWarning(startsAt, endsAt);

  const { mutate, isPending } = $events.useMutation("post", "/drafts/", {
    onSuccess: (draft) => {
      onOpenChange(false);
      navigate({ to: "/events/drafts/$id", params: { id: draft.id } });
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
      body: {
        starts_at: startsAt ? fromDatetimeLocalValue(startsAt) : null,
        location: location.trim() || "TBA",
        locales: selectedLocales,
        duration_hours: durationHoursFromLocalRange(startsAt, endsAt),
        enrollment: apiEnrollment,
      },
    });
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={t`Create draft`}>
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

        <div className="flex flex-col gap-2">
          <span className="text-sm">
            <Trans>Locales</Trans>
          </span>
          <div className="flex flex-wrap gap-2">
            {allowedLocales.map((locale) => {
              const selected = selectedLocales.includes(locale);
              return (
                <button
                  key={locale}
                  type="button"
                  disabled={isPending}
                  className={cn(
                    "btn btn-sm",
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
                  {getLocaleLabel(locale)}
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
            <Trans>Create</Trans>
          </button>
        </div>
      </form>
    </Modal>
  );
}
