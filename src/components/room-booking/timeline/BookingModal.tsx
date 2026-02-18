import { useMe } from "@/api/accounts/user.ts";
import { $roomBooking, roomBookingTypes } from "@/api/room-booking";
import { BookingStatus, SchemaAttendee } from "@/api/room-booking/types.ts";
import {
  clockTime,
  durationFormatted,
  msBetween,
  T,
} from "@/lib/utils/dates.ts";
import {
  FloatingFocusManager,
  FloatingOverlay,
  FloatingPortal,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
  useTransitionStyles,
} from "@floating-ui/react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Booking, schemaToBooking, type Slot } from "./types.ts";

export function sanitizeBookingTitle(title: string | undefined): string {
  if (!title) return "";
  const sanitized = title
    .replace("Students Booking Service", "")
    .replace("FW:", "")
    .trim();
  if (sanitized) {
    return sanitized;
  } else {
    return title.trim(); // Do not remove "Students Booking Service" if it's the only content
  }
}

function Attendee({
  attendee,
  bookingId,
}: {
  attendee: SchemaAttendee;
  bookingId: string;
}) {
  const { data: attendeeDetails } = $roomBooking.useQuery(
    "get",
    "/bookings/{outlook_booking_id}/get-attendee-details",
    {
      params: {
        path: { outlook_booking_id: bookingId },
        query: { user_email: attendee.email },
      },
    },
  );

  return attendeeDetails ? (
    <>
      <div className="text-base-content/75 flex flex-row items-center gap-2 text-base">
        <div className="flex h-fit w-6">
          <span className="icon-[material-symbols--person-outline-rounded] text-xl" />
        </div>
        <div className="flex w-full flex-col wrap-anywhere whitespace-pre-wrap">
          <span className="text-base">{attendeeDetails.name}</span>
        </div>
      </div>

      <div className="text-base-content/75 flex flex-row items-center gap-2 text-base">
        <div className="flex h-fit w-6">
          <span className="text-xl" />
        </div>
        <div className="flex w-full flex-col wrap-anywhere whitespace-pre-wrap">
          <a
            className="text-base hover:underline"
            href={`mailto:${attendeeDetails.email}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {attendeeDetails.email}
          </a>
        </div>
      </div>

      <div className="text-base-content/75 flex flex-row items-center gap-2 text-base">
        <div className="flex h-fit w-6">
          <span className="text-xl" />
        </div>
        <div className="flex w-full flex-col wrap-anywhere whitespace-pre-wrap">
          <a
            className="text-base hover:underline"
            href={
              attendeeDetails.telegram_username
                ? `https://t.me/${attendeeDetails.telegram_username}`
                : undefined
            }
            target="_blank"
            rel="noopener noreferrer"
          >
            {attendeeDetails.telegram_username
              ? `@${attendeeDetails.telegram_username}`
              : "No Telegram alias"}
          </a>
        </div>
      </div>
    </>
  ) : (
    <div className="text-base-content/75 flex flex-row items-center gap-2 text-base">
      <div className="flex h-fit w-6">
        <span className="icon-[material-symbols--person-outline-rounded] text-xl" />
      </div>
      <div className="flex w-full flex-col wrap-anywhere whitespace-pre-wrap">
        <a
          className="text-base hover:underline"
          href={`mailto:${attendee.email}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {attendee.email}
        </a>
      </div>
    </div>
  );
}

export function BookingModal({
  newSlot,
  detailsBooking,
  open,
  onOpenChange,
  onBookingCreated,
}: {
  newSlot?: Slot;
  detailsBooking?: Booking;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookingCreated?: (data: Booking) => void;
}) {
  const { context, refs } = useFloating({ open, onOpenChange });
  // Transition effect
  const { isMounted, styles: transitionStyles } = useTransitionStyles(context);
  // Event listeners to change the open state
  const dismiss = useDismiss(context, { outsidePressEvent: "mousedown" });
  // Role props for screen readers
  const role = useRole(context);
  const { getFloatingProps } = useInteractions([dismiss, role]);

  const queryClient = useQueryClient();
  const { me } = useMe();

  const { data: rooms } = $roomBooking.useQuery("get", "/rooms/", {
    params: { query: { include_red: true } },
  });
  const {
    mutate: mutateCreateBooking,
    isPending: isBookingCreationPending,
    error: creationError,
    reset: resetCreateBooking,
  } = $roomBooking.useMutation("post", "/bookings/");

  const {
    mutate: mutateUpdateBooking,
    isPending: isBookingUpdatePending,
    error: updateError,
    reset: resetUpdateBooking,
  } = $roomBooking.useMutation("patch", "/bookings/{outlook_booking_id}");

  const {
    mutate: mutateDeleteBooking,
    isPending: isBookingDeletionPending,
    error: deletionError,
    reset: resetDeleteBooking,
  } = $roomBooking.useMutation("delete", "/bookings/{outlook_booking_id}");

  const titleInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");

  const alreadyStarted = useMemo(() => {
    return (
      detailsBooking &&
      detailsBooking.startsAt &&
      detailsBooking.startsAt < new Date()
    );
  }, [detailsBooking]);

  const canFinish = useMemo(() => {
    return (
      alreadyStarted &&
      detailsBooking &&
      detailsBooking.endsAt.getTime() > new Date().getTime() + 6 * T.Min
    );
  }, [detailsBooking]);

  useEffect(() => {
    if (newSlot) {
      setTitle("");
      resetCreateBooking();
    } else if (detailsBooking) {
      setTitle(sanitizeBookingTitle(detailsBooking.title));
    }
  }, [newSlot, detailsBooking, resetCreateBooking]);

  const [isEditing, setIsEditing] = useState<boolean>(false);

  const [start, setStart] = useState<Date | undefined>(
    newSlot?.start || detailsBooking?.startsAt,
  );
  const [end, setEnd] = useState<Date | undefined>(
    newSlot?.end || detailsBooking?.endsAt,
  );

  useEffect(() => {
    if (detailsBooking && isEditing) return;
    setStart(newSlot?.start || detailsBooking?.startsAt);
    setEnd(newSlot?.end || detailsBooking?.endsAt);
  }, [newSlot, detailsBooking, isEditing]);

  const deleteBooking = useCallback(() => {
    if (!detailsBooking) return;

    mutateDeleteBooking(
      {
        params: {
          path: { outlook_booking_id: detailsBooking.outlook_booking_id ?? "" },
        },
      },
      {
        onSuccess: () => {
          resetDeleteBooking();
          onOpenChange(false);
          queryClient.invalidateQueries({
            queryKey: $roomBooking.queryOptions("get", "/bookings/my").queryKey,
          });
          queryClient.invalidateQueries({
            queryKey: ["roomBooking", "get", "/bookings/"],
          });
          queryClient.invalidateQueries({
            queryKey: ["roomBooking", "get", "/room/{id}/bookings"],
          });
        },
      },
    );
  }, [detailsBooking, mutateDeleteBooking]);

  const submitBooking = useCallback(() => {
    if (!newSlot) return;
    if (!title.trim()) {
      titleInputRef.current?.focus();
      return;
    }

    mutateCreateBooking(
      {
        body: {
          room_id: newSlot.room.id,
          title: title.trim(),
          start: start?.toISOString() ?? newSlot.start.toISOString(),
          end: end?.toISOString() ?? newSlot.end.toISOString(),
          participant_emails: [],
        },
      },
      {
        onSuccess: (data: roomBookingTypes.SchemaBooking) => {
          queryClient.invalidateQueries({
            queryKey: $roomBooking.queryOptions("get", "/bookings/my").queryKey,
          });
          queryClient.invalidateQueries({
            queryKey: ["roomBooking", "get", "/bookings/"],
          });
          queryClient.invalidateQueries({
            queryKey: ["roomBooking", "get", "/room/{id}/bookings"],
          });

          setTitle("");
          resetCreateBooking();
          onBookingCreated?.(schemaToBooking(data));
        },
      },
    );
  }, [
    newSlot,
    title,
    mutateCreateBooking,
    resetCreateBooking,
    queryClient,
    onBookingCreated,
    start,
    end,
  ]);

  const updateBooking = useCallback(() => {
    if (!detailsBooking) return;

    mutateUpdateBooking(
      {
        params: {
          path: { outlook_booking_id: detailsBooking.outlook_booking_id ?? "" },
        },
        body: {
          title: title.trim(),
          start: start?.toISOString() ?? detailsBooking.startsAt.toISOString(),
          end: end?.toISOString() ?? detailsBooking.endsAt.toISOString(),
        },
      },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({
            queryKey: $roomBooking.queryOptions("get", "/bookings/my").queryKey,
          });
          queryClient.invalidateQueries({
            queryKey: ["roomBooking", "get", "/bookings/"],
          });
          queryClient.invalidateQueries({
            queryKey: ["roomBooking", "get", "/room/{id}/bookings"],
          });

          resetUpdateBooking();
          setIsEditing(false);
          onBookingCreated?.(
            schemaToBooking(data as roomBookingTypes.SchemaBooking),
          );
        },
      },
    );
  }, [detailsBooking, title, mutateUpdateBooking, start, end]);

  const finishBooking = useCallback(() => {
    if (!detailsBooking) return;
    mutateUpdateBooking(
      {
        params: {
          path: { outlook_booking_id: detailsBooking.outlook_booking_id ?? "" },
        },
        body: {
          title: detailsBooking.title.trim(),
          start: detailsBooking.startsAt.toISOString(),
          end: new Date(new Date().getTime() + T.Min * 5).toISOString(),
        },
      },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({
            queryKey: $roomBooking.queryOptions("get", "/bookings/my").queryKey,
          });
          queryClient.invalidateQueries({
            queryKey: ["roomBooking", "get", "/bookings/"],
          });
          queryClient.invalidateQueries({
            queryKey: ["roomBooking", "get", "/room/{id}/bookings"],
          });

          resetUpdateBooking();
          setIsEditing(false);
          onBookingCreated?.(
            schemaToBooking(data as roomBookingTypes.SchemaBooking),
          );
        },
      },
    );
  }, [detailsBooking, mutateUpdateBooking]);

  const getRoomById = (roomId: string | undefined) => {
    return roomId ? rooms?.find((room) => room.id === roomId) : undefined;
  };

  const room = newSlot?.room ?? getRoomById(detailsBooking?.room_id);

  const { data: canBookData, isPending: canBookPending } =
    $roomBooking.useQuery(
      "get",
      "/room/{id}/can-book",
      {
        params: {
          path: { id: room?.id ?? "" },
          query: {
            start: start?.toISOString() ?? newSlot?.start.toISOString() ?? "",
            end: end?.toISOString() ?? newSlot?.end.toISOString() ?? "",
          },
        },
      },
      {
        enabled: !!room && !!start && !!end,
      },
    );

  if (!isMounted) {
    return null;
  }

  const outlookBookingId = detailsBooking?.outlook_booking_id;
  const attendees = detailsBooking?.attendees;
  const isAttending = attendees?.some(
    (attendee) => attendee.email === me?.innopolis_info?.email,
  );
  const outlookBookingRooms = attendees
    ?.map((attendee) => {
      return {
        room: getRoomById(attendee.assosiated_room_id ?? undefined),
        attendee: attendee,
      };
    })
    .filter((room) => room.room !== undefined);
  const outlookBookingAttendees = attendees?.filter(
    (attendee) => attendee.assosiated_room_id === null,
  );

  const roomStatus = (status: BookingStatus) => {
    const baseClass = "rounded-full px-2 py-1 text-center text-sm font-bold";
    switch (status) {
      case BookingStatus.Accept:
        return (
          <span className={`${baseClass} bg-green-500/20 text-green-500`}>
            Accepted
          </span>
        );
      case BookingStatus.Tentative:
        return (
          <span className={`${baseClass} bg-yellow-500/20 text-yellow-500`}>
            Tentative
          </span>
        );
      case BookingStatus.Decline:
        return (
          <span className={`${baseClass} bg-red-500/20 text-red-500`}>
            Declined
          </span>
        );
      case BookingStatus.Unknown:
        return (
          <span className={`${baseClass} bg-gray-500/20 text-gray-500`}>
            Unknown
          </span>
        );
    }
  };

  const BookingRooms = outlookBookingRooms ? (
    outlookBookingRooms.map((room) => (
      <div className="text-base-content/75 flex flex-row items-center gap-2 text-base">
        <div className="flex h-fit w-6">
          <span className="icon-[material-symbols--location-on-outline] text-xl" />
        </div>
        <div
          className="flex flex-row items-center gap-2"
          key={room.attendee.email}
        >
          <Link
            to="/room-booking/rooms/$room"
            params={{ room: room.room?.id ?? "" }}
            className="flex items-center py-1 wrap-anywhere whitespace-pre-wrap hover:underline"
          >
            {room.room?.title}
          </Link>
          {outlookBookingId &&
            roomStatus(room.attendee.status ?? BookingStatus.Unknown)}
        </div>
      </div>
    ))
  ) : room ? (
    <div className="text-base-content/75 flex flex-row items-start gap-2 text-base">
      <div className="mt-1.5 flex h-fit w-6">
        <span className="icon-[material-symbols--location-on-outline] text-xl" />
      </div>
      <Link
        to="/room-booking/rooms/$room"
        params={{ room: room?.id }}
        className="flex w-full items-center py-1 wrap-anywhere whitespace-pre-wrap hover:underline"
      >
        {room?.title}
      </Link>
    </div>
  ) : undefined;

  const timezoneOffset = new Date().getTimezoneOffset();
  const toLocalTimeString = (date: Date) => {
    const localDate = new Date(date.getTime() - timezoneOffset * T.Min);
    const localDateString = localDate.toISOString().replace("Z", "");
    return localDateString;
  };
  const fromLocalTimeString = (localDateString: string) => {
    const date = new Date(
      new Date(localDateString + "Z").getTime() + timezoneOffset * T.Min,
    );
    return date;
  };

  const BookingDateTime = (
    <div className="my-1">
      <label htmlFor="start" className="text-base-content/75 text-base">
        Start
      </label>
      <input
        id="start"
        type="datetime-local"
        name="party-date"
        value={start ? toLocalTimeString(start) : ""}
        onChange={(e) => setStart(fromLocalTimeString(e.target.value))}
        className="bg-base-300 focus:ring-primary mb-2 w-full grow rounded-xl px-4 py-2 text-base outline-hidden focus:ring-2"
      />
      <label htmlFor="end" className="text-base-content/75 text-base">
        End
      </label>
      <input
        id="end"
        type="datetime-local"
        name="party-date"
        value={end ? toLocalTimeString(end) : ""}
        onChange={(e) => setEnd(fromLocalTimeString(e.target.value))}
        className="bg-base-300 focus:ring-primary mb-2 w-full grow rounded-xl px-4 py-2 text-base outline-hidden focus:ring-2"
      />
    </div>
  );

  const BookingDate = (
    <div className="text-base-content/75 flex flex-row items-center gap-2 text-base">
      <div className="flex h-fit w-6">
        <span className="icon-[material-symbols--today-outline] text-xl" />
      </div>
      <p className="flex w-full items-center py-1 wrap-anywhere whitespace-pre-wrap">
        {`${start?.toLocaleString("en-US", { day: "2-digit", month: "long" })}, ${start?.toLocaleString("en-US", { weekday: "long" })}`}
      </p>
    </div>
  );

  const BookingTime = (
    <div className="text-base-content/75 flex flex-row items-center gap-2 text-base">
      <div className="flex h-fit w-6">
        <span className="icon-[material-symbols--schedule-outline] text-xl" />
      </div>
      {start && end && (
        <p className="flex w-full items-center py-1 wrap-anywhere whitespace-pre-wrap">
          {`${clockTime(start)} – ${clockTime(end)} (${durationFormatted(msBetween(start, end))})`}
        </p>
      )}
    </div>
  );

  const Attendees = attendees
    ? outlookBookingAttendees?.map((attendee) => (
        <Attendee
          attendee={attendee}
          bookingId={outlookBookingId ?? detailsBooking?.id ?? "meow"}
        />
      ))
    : undefined;

  const NewBookingWarning = canBookPending ? (
    <div className="alert alert-info px-4 py-2 text-base">
      <span>Checking rules...</span>
    </div>
  ) : !canBookData ? null : canBookData.can_book ? (
    <div className="alert alert-success px-4 py-2 text-base">
      <span>You can book this time slot.</span>
    </div>
  ) : (
    <div className="alert alert-warning px-4 py-2 text-base">
      <span>{canBookData.reason_why_cannot}</span>
    </div>
  );

  const errorText =
    newSlot && creationError
      ? `Booking failed: ${creationError.detail?.toString() || creationError.toString() || "unknown error"}`
      : null;
  const NewBookingError = errorText && (
    <div className="alert alert-error text-base">
      <span>{errorText}</span>
    </div>
  );

  const UpdateBookingError = updateError && (
    <div className="alert alert-error text-base">
      <span>
        {updateError.detail?.toString() ||
          updateError.toString() ||
          "unknown error"}
        .
      </span>
    </div>
  );

  const DeleteBookingError = deletionError && (
    <div className="alert alert-error text-base">
      <span>
        {deletionError.detail?.toString() ||
          deletionError.toString() ||
          "unknown error"}
        .
      </span>
    </div>
  );

  const NewBookingButtons = isBookingCreationPending ? (
    <>
      <p className="text-base-content/75 text-lg">Creating new booking...</p>
      <div className="flex items-center justify-center">
        <div className="bg-base-100 h-4 w-full overflow-hidden rounded-xl">
          <div className="animate-booking-fake-progress bg-primary h-full"></div>
        </div>
      </div>
    </>
  ) : (
    <div className="flex flex-row gap-2">
      <button
        type="button"
        className="bg-base-200 hover:bg-base-300 dark:bg-base-300 dark:hover:bg-base-200 rounded-box flex w-full items-center justify-center gap-4 px-4 py-2 text-lg font-medium"
        onClick={() => onOpenChange(false)}
      >
        Cancel
      </button>
      <button
        type="submit"
        className="rounded-box flex w-full items-center justify-center gap-2 border-2 border-purple-400 bg-purple-200 px-4 py-2 text-lg font-medium text-purple-900 hover:bg-purple-300 disabled:pointer-events-none disabled:opacity-80 dark:border-purple-600 dark:bg-purple-900 dark:text-purple-300 dark:hover:bg-purple-950"
        disabled={isBookingCreationPending}
      >
        Confirm
      </button>
    </div>
  );

  const MyBookingButtons = isBookingUpdatePending ? (
    <>
      <p className="text-base-content/75 text-lg">Updating booking...</p>
      <div className="flex items-center justify-center">
        <div className="bg-base-100 h-4 w-full overflow-hidden rounded-xl">
          <div className="animate-booking-fake-progress bg-primary h-full"></div>
        </div>
      </div>
    </>
  ) : isEditing ? (
    <div className="flex flex-row gap-2">
      <button
        type="button"
        className="bg-base-200 hover:bg-base-300 dark:bg-base-300 dark:hover: bg-base-200 rounded-box flex w-full items-center justify-center gap-4 px-4 py-2 text-lg font-medium"
        onClick={() => setIsEditing(false)}
      >
        Cancel
      </button>
      <button
        type="submit"
        className="rounded-box flex w-full items-center justify-center gap-2 border-2 border-purple-400 bg-purple-200 px-4 py-2 text-lg font-medium text-purple-900 hover:bg-purple-300 disabled:pointer-events-none disabled:opacity-80 dark:border-purple-600 dark:bg-purple-900 dark:text-purple-300 dark:hover:bg-purple-950"
        disabled={isBookingUpdatePending}
      >
        Confirm
      </button>
    </div>
  ) : isBookingDeletionPending ? (
    <>
      <p className="text-base-content/75 text-lg">Deleting booking...</p>
      <div className="flex items-center justify-center">
        <div className="bg-base-100 h-4 w-full overflow-hidden rounded-xl">
          <div className="animate-booking-fake-progress-fast bg-primary h-full"></div>
        </div>
      </div>
    </>
  ) : isBookingUpdatePending ? (
    <>
      <p className="text-base-content/75 text-lg">Halting booking...</p>
      <div className="flex items-center justify-center">
        <div className="bg-base-100 h-4 w-full overflow-hidden rounded-xl">
          <div className="animate-booking-fake-progress-fast bg-primary h-full"></div>
        </div>
      </div>
    </>
  ) : !alreadyStarted ? (
    <>
      <button
        type="button"
        className="rounded-box mb-2 flex w-full items-center justify-center gap-2 border-2 border-purple-400 bg-purple-200 px-4 py-2 text-lg font-medium text-purple-900 hover:bg-purple-300 disabled:pointer-events-none disabled:opacity-80 dark:border-purple-600 dark:bg-purple-900 dark:text-purple-300 dark:hover:bg-purple-950"
        onClick={() => setIsEditing(true)}
      >
        Edit
      </button>
      <button
        type="button"
        className="rounded-box flex w-full items-center justify-center gap-2 border-2 border-red-400 bg-red-200 px-4 py-2 text-lg font-medium text-red-900 hover:bg-red-300 disabled:pointer-events-none disabled:opacity-80 dark:border-red-600 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-950"
        onClick={() => deleteBooking()}
      >
        Delete
      </button>
    </>
  ) : canFinish ? (
    <>
      <button
        type="button"
        className="rounded-box flex w-full items-center justify-center gap-2 border-2 border-yellow-400 bg-yellow-200 px-4 py-2 text-lg font-medium text-yellow-900 hover:bg-yellow-300 disabled:pointer-events-none disabled:opacity-80 dark:border-yellow-600 dark:bg-yellow-900 dark:text-yellow-300 dark:hover:bg-yellow-950"
        onClick={() => finishBooking()}
      >
        Finish now
      </button>
    </>
  ) : (
    <></>
  );

  return (
    <FloatingPortal>
      <FloatingOverlay
        className="@container/modal z-10 grid place-items-center bg-black/75"
        lockScroll
      >
        <FloatingFocusManager
          context={context}
          initialFocus={titleInputRef}
          modal
        >
          <div
            ref={refs.setFloating}
            style={transitionStyles}
            {...getFloatingProps()}
            className="flex h-fit w-full max-w-lg flex-col p-4 outline-hidden"
          >
            <div className="bg-base-200 rounded-box overflow-hidden">
              <div className="flex flex-col p-4">
                {/* Heading and description */}
                <div className="mb-2 flex w-full flex-row items-center">
                  <div className="grow items-center text-2xl font-semibold">
                    {newSlot ? "New booking" : "Booking details"}
                  </div>
                  <button
                    type="button"
                    className="text-base-content/50 hover:bg-base-300/50 hover:text-base-content/75 rounded-box -mt-2 -mr-2 flex h-12 w-12 items-center justify-center @lg/export:-mt-6 @lg/export:-mr-6"
                    onClick={() => onOpenChange(false)}
                  >
                    <span className="icon-[material-symbols--close] text-2xl" />
                  </button>
                </div>

                {newSlot ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      submitBooking();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        submitBooking();
                      }
                    }}
                  >
                    <div className="flex flex-col gap-2">
                      <input
                        ref={titleInputRef}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter title..."
                        className="bg-base-300 focus:ring-primary w-full grow rounded-xl px-4 py-2 text-base outline-hidden focus:ring-2"
                      />

                      {BookingRooms}
                      {BookingDate}
                      {BookingTime}
                      {BookingDateTime}
                      {attendees && Attendees}

                      {NewBookingWarning}
                      {NewBookingError}

                      {NewBookingButtons}
                    </div>
                  </form>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      updateBooking();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        updateBooking();
                      }
                    }}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="text-base-content/75 flex flex-row gap-2">
                        {isEditing ? (
                          <input
                            ref={titleInputRef}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter title..."
                            className="bg-base-300 focus:ring-primary w-full grow rounded-xl px-4 py-2 text-base outline-hidden focus:ring-2"
                          />
                        ) : (
                          <>
                            <p className="text-base-content/75 flex flex-row gap-2 text-lg text-wrap">
                              {sanitizeBookingTitle(detailsBooking?.title)}
                            </p>
                          </>
                        )}
                      </div>

                      {BookingRooms}
                      {BookingDate}
                      {BookingTime}
                      {attendees && Attendees}
                      {isEditing && BookingDateTime}
                      {isEditing && NewBookingWarning}
                      {UpdateBookingError}
                      {DeleteBookingError}

                      <div className="mt-2">
                        {outlookBookingId && isAttending && MyBookingButtons}
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </FloatingFocusManager>
      </FloatingOverlay>
    </FloatingPortal>
  );
}
