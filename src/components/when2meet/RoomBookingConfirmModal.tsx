import type { roomBookingTypes } from "@/api/room-booking";
import { Modal } from "@/components/common/Modal.tsx";
import type { MeetingDate } from "./types.ts";
import { formatReservationRange } from "./utils/room-booking-utils.ts";
import { formatSlotKeyLabel } from "./utils/slots.ts";

export function RoomBookingConfirmModal({
  open,
  onOpenChange,
  meetingName,
  formattedDates,
  slotKey,
  room,
  intersectionCount,
  isPending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingName: string;
  formattedDates: MeetingDate[];
  slotKey: string;
  room: roomBookingTypes.SchemaRoom | null;
  intersectionCount: number;
  isPending: boolean;
  onConfirm: () => void;
}) {
  if (!room) {
    return null;
  }

  const slotLabel = formatSlotKeyLabel(slotKey, formattedDates);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Confirm booking"
      containerClassName="max-w-sm"
    >
      <div className="grid gap-4">
        <div className="grid gap-1 text-sm">
          <div>
            <span className="text-base-content/60">Meeting</span>
            <div className="font-medium">{meetingName}</div>
          </div>
          <div>
            <span className="text-base-content/60">Time</span>
            <div className="font-medium">{slotLabel}</div>
            <div className="text-base-content/70">
              {formatReservationRange(slotKey)} · {intersectionCount}{" "}
              participant{intersectionCount === 1 ? "" : "s"} available
            </div>
          </div>
          <div>
            <span className="text-base-content/60">Room</span>
            <div className="font-semibold">{room.title}</div>
            {room.capacity && (
              <div className="text-base-content/70">
                Up to {room.capacity} people
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
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
            onClick={onConfirm}
          >
            {isPending ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              "Confirm booking"
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
