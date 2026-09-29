import { $when2meet, type when2meetTypes } from "@/api/when2meet";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { Modal } from "@/components/common/Modal.tsx";
import { BookingModal } from "@/components/room-booking/timeline/BookingModal.tsx";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

function formatRoomDetails(room: when2meetTypes.SchemaAvailableRoom) {
  const details = [
    room.location,
    room.capacity ? `${room.capacity} seats` : null,
  ].filter(Boolean);

  return details.join(" · ");
}

export function MeetingRoomModal({
  meetingRef,
  open,
  onOpenChange,
  bookedRoom,
  meetingName,
  bookingTitle,
  isBookingDetailsPending,
  bookingDetailsError,
  onRetryBookingDetails,
  selectedTime,
  selectedTimeLabel,
  onMeetingUpdated,
}: {
  meetingRef: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookedRoom?: when2meetTypes.SchemaBookedRoom | null;
  meetingName: string;
  bookingTitle?: string;
  isBookingDetailsPending: boolean;
  bookingDetailsError?: unknown;
  onRetryBookingDetails: () => void;
  selectedTime?: when2meetTypes.SchemaMeetingTime | null;
  selectedTimeLabel?: string | null;
  onMeetingUpdated: (meeting: when2meetTypes.SchemaEventView) => void;
}) {
  const queryClient = useQueryClient();
  const { showSuccess, showError, showConfirm } = useToast();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const availableRoomsQueryOptions = useMemo(
    () =>
      $when2meet.queryOptions(
        "get",
        "/meetings/{meeting_ref}/available-rooms",
        {
          params: { path: { meeting_ref: meetingRef } },
        },
      ),
    [meetingRef],
  );

  const {
    data: availableRooms = [],
    isPending,
    isError,
    error,
    refetch,
  } = $when2meet.useQuery(
    "get",
    "/meetings/{meeting_ref}/available-rooms",
    {
      params: { path: { meeting_ref: meetingRef } },
    },
    { enabled: open },
  );

  const sortedRooms = useMemo(
    () =>
      [...availableRooms].sort((leftRoom, rightRoom) =>
        leftRoom.name.localeCompare(rightRoom.name, undefined, {
          numeric: true,
        }),
      ),
    [availableRooms],
  );

  useEffect(() => {
    if (!open && !confirmationOpen) {
      setSelectedRoomId(null);
      queryClient.removeQueries({
        queryKey: availableRoomsQueryOptions.queryKey,
        exact: true,
      });
      return;
    }

    if (
      selectedRoomId &&
      sortedRooms.some((room) => room.id === selectedRoomId)
    ) {
      return;
    }

    setSelectedRoomId(sortedRooms[0]?.id ?? null);
  }, [
    availableRoomsQueryOptions,
    confirmationOpen,
    open,
    queryClient,
    selectedRoomId,
    sortedRooms,
  ]);

  const selectedRoom = sortedRooms.find((room) => room.id === selectedRoomId);
  const confirmationSlot = useMemo(() => {
    if (!selectedRoom || !selectedTime) {
      return undefined;
    }

    return {
      room: {
        id: selectedRoom.id,
        title: selectedRoom.name,
        capacity: selectedRoom.capacity,
      },
      start: new Date(selectedTime.start),
      end: new Date(selectedTime.end),
    };
  }, [selectedRoom, selectedTime]);

  function handleRoomMutationSuccess(
    updatedMeeting: when2meetTypes.SchemaEventView,
    title: string,
    message: string,
  ) {
    onMeetingUpdated(updatedMeeting);
    showSuccess(title, message);
    setConfirmationOpen(false);
    setSelectedRoomId(null);
    onOpenChange(false);
  }

  const {
    mutate: bookRoom,
    isPending: isBookingRoom,
    error: bookRoomError,
    reset: resetBookRoom,
  } = $when2meet.useMutation("post", "/meetings/{meeting_ref}/book-room", {
    onSuccess: (updatedMeeting) =>
      handleRoomMutationSuccess(
        updatedMeeting,
        "Room booked",
        "Room was booked for the meeting.",
      ),
  });

  const {
    mutate: changeRoom,
    isPending: isChangingRoom,
    error: changeRoomError,
    reset: resetChangeRoom,
  } = $when2meet.useMutation("patch", "/meetings/{meeting_ref}/book-room", {
    onSuccess: (updatedMeeting) =>
      handleRoomMutationSuccess(
        updatedMeeting,
        "Room changed",
        "Meeting room was changed.",
      ),
  });

  const { mutate: cancelRoom, isPending: isCancelingRoom } =
    $when2meet.useMutation("delete", "/meetings/{meeting_ref}/book-room", {
      onSuccess: (updatedMeeting) =>
        handleRoomMutationSuccess(
          updatedMeeting,
          "Room canceled",
          "Meeting room booking was canceled.",
        ),
      onError: (mutationError) => {
        showError("Error", formatApiErrorMessage(mutationError));
      },
    });

  const isMutatingRoom = isBookingRoom || isChangingRoom || isCancelingRoom;
  const isCurrentBookingDetailsUnavailable =
    !!bookedRoom &&
    (isBookingDetailsPending || !!bookingDetailsError || !bookingTitle);

  function handleNext() {
    if (!selectedRoom || !selectedTime || isCurrentBookingDetailsUnavailable) {
      return;
    }

    resetBookRoom();
    resetChangeRoom();
    setConfirmationOpen(true);
    onOpenChange(false);
  }

  function handleConfirmRoom(title: string) {
    if (!selectedRoom) {
      return;
    }

    const payload = {
      params: { path: { meeting_ref: meetingRef } },
      body: { room_id: selectedRoom.id, title },
    };

    if (bookedRoom) {
      changeRoom(payload);
      return;
    }

    bookRoom(payload);
  }

  async function handleCancelRoom() {
    if (!bookedRoom) {
      return;
    }

    const confirmed = await showConfirm({
      title: "Cancel room booking",
      message: "Cancel the room booking for this meeting?",
      confirmText: "Cancel booking",
      cancelText: "Keep room",
      type: "warning",
    });

    if (!confirmed) {
      return;
    }

    cancelRoom({
      params: { path: { meeting_ref: meetingRef } },
    });
  }

  function handleConfirmationOpenChange(nextOpen: boolean) {
    if (isMutatingRoom) {
      return;
    }

    setConfirmationOpen(nextOpen);

    if (!nextOpen) {
      setSelectedRoomId(null);
    }
  }

  return (
    <>
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        title={bookedRoom ? "Change room" : "Book room"}
      >
        {selectedTimeLabel && (
          <p className="text-base-content/70 text-sm">{selectedTimeLabel}</p>
        )}

        {bookedRoom && isBookingDetailsPending ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="loading loading-spinner loading-sm text-primary" />
            Loading current booking details...
          </div>
        ) : bookedRoom && (bookingDetailsError || !bookingTitle) ? (
          <div className="alert alert-error">
            <span>
              {bookingDetailsError
                ? formatApiErrorMessage(bookingDetailsError)
                : "Unable to load current booking details."}
            </span>
            <button
              type="button"
              className="btn btn-sm"
              onClick={onRetryBookingDetails}
            >
              Retry
            </button>
          </div>
        ) : null}

        {isPending ? (
          <div className="flex min-h-48 items-center justify-center">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        ) : isError ? (
          <div className="alert alert-error">
            <span>{formatApiErrorMessage(error)}</span>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => refetch()}
            >
              Retry
            </button>
          </div>
        ) : sortedRooms.length === 0 ? (
          <div className="text-base-content/60 py-6 text-center text-sm">
            No rooms are available for this meeting time.
          </div>
        ) : (
          <div className="grid max-h-[min(55vh,420px)] gap-2 overflow-y-auto py-2 pr-1">
            {sortedRooms.map((room) => {
              const selected = selectedRoomId === room.id;

              return (
                <button
                  key={room.id}
                  type="button"
                  className={cn(
                    "border-base-300 rounded-box flex min-w-0 flex-col border p-3 text-left transition",
                    selected && "border-primary bg-primary/5",
                  )}
                  onClick={() => setSelectedRoomId(room.id)}
                >
                  <span className="font-semibold">{room.name}</span>
                  <span className="text-base-content/60 text-sm">
                    {formatRoomDetails(room)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-2 flex flex-wrap justify-end gap-2">
          {bookedRoom && (
            <button
              type="button"
              className="btn btn-error mr-auto"
              disabled={isMutatingRoom}
              onClick={handleCancelRoom}
            >
              {isCancelingRoom ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                "Cancel room"
              )}
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost"
            disabled={isMutatingRoom}
            onClick={() => onOpenChange(false)}
          >
            Close
          </button>
          <button
            type="button"
            className="btn btn-primary gap-2"
            disabled={
              !selectedRoom ||
              !selectedTime ||
              isPending ||
              isError ||
              isCurrentBookingDetailsUnavailable ||
              isMutatingRoom
            }
            onClick={handleNext}
          >
            Next
          </button>
        </div>
      </Modal>

      <BookingModal
        newSlot={confirmationSlot}
        open={confirmationOpen}
        onOpenChange={handleConfirmationOpenChange}
        initialTitle={bookedRoom ? bookingTitle : meetingName}
        fixedSchedule
        isNewBookingSubmitting={isBookingRoom || isChangingRoom}
        newBookingSubmitError={bookedRoom ? changeRoomError : bookRoomError}
        onNewBookingSubmit={handleConfirmRoom}
      />
    </>
  );
}
