import { useMe } from "@/api/accounts/user.ts";
import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { $when2meet } from "@/api/when2meet";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  buildFullDaySlotsFromDates,
  buildSlotsFromDatesAndRange,
} from "./utils/api-slots.ts";
import { markPendingSetup } from "./utils/setup-slots.ts";
import { Calendar } from "./CreationModal/Calendar.tsx";
import { TimeRange } from "./CreationModal/TimeRange.tsx";
import { parseHour, TimeRangeSelection } from "./utils/dates.ts";

type TimeSetupMode = "daily_range" | "manual_slots";

function isTimeRangeValid(timeRange: TimeRangeSelection) {
  return parseHour(timeRange.end) > parseHour(timeRange.start);
}

function TimeSetupOption({
  selected,
  title,
  name,
  onSelect,
  children,
}: {
  selected: boolean;
  title: string;
  name: string;
  onSelect: () => void;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "card card-border",
        selected && "border-primary bg-primary/5",
      )}
    >
      <div className="card-body gap-0 p-4">
        <label className="label cursor-pointer justify-start gap-3 p-0">
          <input
            type="radio"
            name={name}
            className="radio radio-primary"
            checked={selected}
            onChange={onSelect}
          />
          <span className="text-base-content label-text">{title}</span>
        </label>
        {selected && children && <div className="mt-3 pl-9">{children}</div>}
      </div>
    </div>
  );
}

export function CreationPage({ meetingId }: { meetingId?: string }) {
  const isEditMode = !!meetingId;
  const { me } = useMe();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const [meetingName, setMeetingName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [timeRange, setTimeRange] = useState<TimeRangeSelection>({
    start: "08:00",
    end: "19:00",
  });
  const [timeSetupMode, setTimeSetupMode] =
    useState<TimeSetupMode>("daily_range");
  const [nameError, setNameError] = useState<string>();
  const [datesError, setDatesError] = useState<string>();
  const [timeError, setTimeError] = useState<string>();
  const [isFormInitialized, setIsFormInitialized] = useState(!isEditMode);

  const eventQueryKey = meetingId
    ? $when2meet.queryOptions("get", "/events/{event_ref}", {
        params: { path: { event_ref: meetingId } },
      }).queryKey
    : null;

  const {
    data: event,
    isPending: isEventPending,
    isError: isEventError,
    error: eventError,
  } = $when2meet.useQuery(
    "get",
    "/events/{event_ref}",
    { params: { path: { event_ref: meetingId! } } },
    { enabled: isEditMode },
  );

  const isOwner = !!me?.id && event?.owner_id === me.id;
  const meetingSlug = event?.slug ?? meetingId ?? "";

  useEffect(() => {
    if (!isEditMode || !event || isFormInitialized) {
      return;
    }

    setMeetingName(event.name);
    setDescription(event.description ?? "");
    setIsFormInitialized(true);
  }, [isEditMode, event, isFormInitialized]);

  useEffect(() => {
    if (!isEditMode || isEventPending || !event || isOwner) {
      return;
    }

    showError("Error", "Only the meeting owner can edit this event.");
    navigate({
      to: "/when2meet/$meetingId",
      params: { meetingId: event.slug },
    });
  }, [isEditMode, isEventPending, event, isOwner, navigate, showError]);

  const { mutate: createEvent, isPending: isCreating } = $when2meet.useMutation(
    "post",
    "/events/",
    {
      onError: (error) => {
        showError("Error", formatApiErrorMessage(error));
      },
    },
  );

  const { mutate: updateEvent, isPending: isUpdating } = $when2meet.useMutation(
    "patch",
    "/events/{event_ref}",
    {
      onError: (error) => {
        showError("Error", formatApiErrorMessage(error));
      },
    },
  );

  const isSubmitting = isCreating || isUpdating;

  const handleDatesChange = useCallback((calendar: Set<string>) => {
    setSelectedDates(new Set(calendar));

    if (calendar.size > 0) {
      setDatesError(undefined);
    }
  }, []);

  function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();

    const trimmedName = meetingName.trim();
    const nextNameError =
      trimmedName.length < 3
        ? "Meeting name should contain at least 3 symbols."
        : undefined;

    setNameError(nextNameError);

    if (isEditMode) {
      if (nextNameError || !meetingId) {
        return;
      }

      updateEvent(
        {
          params: { path: { event_ref: meetingId } },
          body: {
            name: trimmedName,
            description: description.trim() || null,
          },
        },
        {
          onSuccess: (updatedEvent) => {
            if (eventQueryKey) {
              queryClient.invalidateQueries({ queryKey: eventQueryKey });
            }
            queryClient.invalidateQueries({
              queryKey: $when2meet.queryOptions("get", "/events/").queryKey,
            });
            showSuccess("Meeting updated", `"${trimmedName}" was saved.`);
            navigate({
              to: "/when2meet/$meetingId",
              params: { meetingId: updatedEvent.slug },
            });
          },
        },
      );
      return;
    }

    const nextDatesError =
      selectedDates.size === 0 ? "Choose at least one date." : undefined;
    const nextTimeError =
      timeSetupMode === "daily_range" && !isTimeRangeValid(timeRange)
        ? "End time must be later than start time."
        : undefined;

    setDatesError(nextDatesError);
    setTimeError(nextTimeError);

    if (nextNameError || nextDatesError || nextTimeError) {
      return;
    }

    const isManualSlots = timeSetupMode === "manual_slots";

    const slots = isManualSlots
      ? buildFullDaySlotsFromDates(selectedDates)
      : buildSlotsFromDatesAndRange(
          selectedDates,
          timeRange.start,
          timeRange.end,
        );

    createEvent(
      {
        body: {
          name: trimmedName,
          description: description.trim() || undefined,
          slots,
          timezone: "Europe/Moscow",
          specific_time: isManualSlots,
          time_range:
            timeSetupMode === "daily_range"
              ? { start: timeRange.start, end: timeRange.end }
              : undefined,
        },
      },
      {
        onSuccess: (createdEvent) => {
          if (!createdEvent.id) {
            showError("Error", "Meeting was created without an id.");
            return;
          }

          if (isManualSlots) {
            markPendingSetup(createdEvent.slug);
          }

          showSuccess(
            "Meeting created",
            isManualSlots
              ? "Choose allowed timeslots on the meeting page."
              : `"${trimmedName}" is ready for participants.`,
          );
          navigate({
            to: "/when2meet/$meetingId",
            params: { meetingId: createdEvent.slug },
            search: {
              setupSlots: isManualSlots ? true : undefined,
            },
          });
        },
      },
    );
  }

  if (isEditMode && isEventPending) {
    return (
      <RequireAuth>
        <div className="mx-auto mb-20 w-full max-w-[900px] px-4 py-8 md:mb-4">
          <div className="skeleton mb-4 h-6 w-32" />
          <div className="skeleton mb-6 h-8 w-48" />
          <div className="skeleton h-64 w-full" />
        </div>
      </RequireAuth>
    );
  }

  if (isEditMode && isEventError) {
    return (
      <RequireAuth>
        <div className="mx-auto mb-20 w-full max-w-[900px] px-4 py-8 md:mb-4">
          <div className="alert alert-error">
            <span>{formatApiErrorMessage(eventError)}</span>
          </div>
        </div>
      </RequireAuth>
    );
  }

  if (isEditMode && event && !isOwner) {
    return null;
  }

  const cancelLink = isEditMode ? (
    <Link
      to="/when2meet/$meetingId"
      params={{ meetingId: meetingSlug }}
      className="btn btn-ghost"
    >
      Cancel
    </Link>
  ) : (
    <Link to="/when2meet" className="btn btn-ghost">
      Cancel
    </Link>
  );

  const metadataFields = (
    <>
      <label className="block min-w-0">
        <span className="text-sm">
          Meeting name<span className="text-error ml-1">*</span>
        </span>
        <input
          type="text"
          className={cn(
            "input input-bordered mt-1 w-full focus:outline-none",
            nameError && "input-error border-error",
          )}
          placeholder="Name your meeting"
          value={meetingName}
          onChange={(inputEvent) => {
            setMeetingName(inputEvent.target.value);
            setNameError(undefined);
          }}
        />
        {nameError && (
          <p className="text-error mt-1 text-sm font-medium">{nameError}</p>
        )}
      </label>
      <label className="mt-3 block min-w-0">
        <span className="text-sm">Description</span>
        <textarea
          className="textarea textarea-bordered mt-1 w-full resize-none focus:outline-none"
          placeholder="Optional meeting details"
          rows={4}
          value={description}
          onChange={(inputEvent) => setDescription(inputEvent.target.value)}
        />
      </label>
    </>
  );

  const timeSetupFields = (
    <label className="fieldset mt-3">
      <span className="text-sm">When can people meet?</span>
      <div className="grid gap-2">
        <TimeSetupOption
          name="time-setup-mode"
          selected={timeSetupMode === "daily_range"}
          title="Same hours every day"
          onSelect={() => {
            setTimeSetupMode("daily_range");
            setTimeError(undefined);
          }}
        >
          <TimeRange
            defaultTimeValue={timeRange}
            setValueCallback={(value) => {
              setTimeRange(value);
              setTimeError(undefined);
            }}
          />
          {timeError && (
            <p className="text-error mt-2 text-sm font-medium">{timeError}</p>
          )}
        </TimeSetupOption>

        <TimeSetupOption
          name="time-setup-mode"
          selected={timeSetupMode === "manual_slots"}
          title="Pick timeslots on the next step"
          onSelect={() => {
            setTimeSetupMode("manual_slots");
            setTimeError(undefined);
          }}
        />
      </div>
    </label>
  );

  const createSubmitButton = (
    <button
      type="submit"
      className="btn btn-primary min-w-0 flex-1 lg:flex-none"
      disabled={isSubmitting}
    >
      {isSubmitting ? (
        <span className="loading loading-spinner loading-sm" />
      ) : (
        "Create"
      )}
    </button>
  );

  return (
    <RequireAuth>
      <div className="mx-auto mb-20 w-full max-w-[900px] px-4 py-4 md:mb-4">
        {isEditMode ? (
          <Link
            to="/when2meet/$meetingId"
            params={{ meetingId: meetingSlug }}
            className="text-base-content/70 hover:text-base-content mb-4 inline-flex w-fit items-center gap-1 text-sm font-medium"
          >
            <span className="icon-[material-symbols--arrow-back] text-lg" />
            Back to meeting
          </Link>
        ) : (
          <Link
            to="/when2meet"
            className="text-base-content/70 hover:text-base-content mb-4 inline-flex w-fit items-center gap-1 text-sm font-medium"
          >
            <span className="icon-[material-symbols--arrow-back] text-lg" />
            All meetings
          </Link>
        )}

        <h1 className="mb-6 px-2 text-2xl font-semibold md:p-0">
          {isEditMode ? "Edit meeting" : "New meeting"}
        </h1>

        <form onSubmit={handleSubmit} className="bg-base-100 p-2 md:p-0">
          {isEditMode ? (
            <div className="flex flex-col gap-4">
              {metadataFields}
              <footer className="flex justify-end gap-2 pt-2">
                {cancelLink}
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    "Save"
                  )}
                </button>
              </footer>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4 lg:flex-row">
                <div className="order-1 flex flex-col lg:order-2 lg:flex-1 lg:border-l lg:pl-6">
                  {metadataFields}
                  {timeSetupFields}
                  {datesError && (
                    <p className="text-error mt-1 hidden text-sm font-medium lg:block">
                      {datesError}
                    </p>
                  )}
                </div>

                <div className="order-2 lg:order-1 lg:flex-1 lg:pr-6">
                  <Calendar
                    onDatesChange={handleDatesChange}
                    className="w-full"
                  />
                  {datesError && (
                    <p className="text-error mt-2 text-sm font-medium lg:hidden">
                      {datesError}
                    </p>
                  )}
                </div>
              </div>

              <footer className="border-base-300 bg-base-200 fixed bottom-12 left-0 flex w-full gap-2 rounded-t-xl border-b p-4 lg:static lg:justify-end lg:border-0 lg:bg-transparent lg:p-0 lg:pt-4">
                <Link
                  to="/when2meet"
                  className="btn btn-outline min-w-0 flex-1 lg:flex-none"
                >
                  Cancel
                </Link>
                {createSubmitButton}
              </footer>
            </>
          )}
        </form>
      </div>
    </RequireAuth>
  );
}
