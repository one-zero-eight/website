import { type when2meetTypes } from "@/api/when2meet";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { Modal } from "@/components/common/Modal.tsx";
import { clockTime, durationFormatted, msBetween } from "@/lib/utils/dates.ts";
import { Link } from "@tanstack/react-router";

function formatBookingDate(date: Date) {
  return `${date.toLocaleString("en-US", {
    day: "2-digit",
    month: "long",
  })}, ${date.toLocaleString("en-US", { weekday: "long" })}`;
}

export function MeetingBookingConfirmationModal({
  open,
  onOpenChange,
  meetingName,
  room,
  selectedTime,
  isPending,
  error,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingName: string;
  room?: when2meetTypes.SchemaAvailableRoom;
  selectedTime?: when2meetTypes.SchemaMeetingTime | null;
  isPending: boolean;
  error?: unknown;
  onConfirm: () => void;
}) {
  const start = selectedTime ? new Date(selectedTime.start) : null;
  const end = selectedTime ? new Date(selectedTime.end) : null;

  if (!room || !start || !end) {
    return null;
  }

  const showEndDate =
    start.getMonth() !== end.getMonth() || start.getDate() !== end.getDate();

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="New booking"
      containerClassName="p-4"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm();
        }}
      >
        <div className="flex flex-col gap-2">
          <input
            value={meetingName}
            readOnly
            className="bg-base-300 w-full grow rounded-xl px-4 py-2 text-base outline-hidden"
          />

          <div className="text-base-content/75 flex flex-row items-start gap-2 text-base">
            <div className="mt-1.5 flex h-fit w-6">
              <span className="icon-[material-symbols--location-on-outline] text-xl" />
            </div>
            <Link
              to="/room-booking/rooms/$room"
              params={{ room: room.id }}
              className="flex w-full items-center py-1 wrap-anywhere whitespace-pre-wrap hover:underline"
            >
              {room.name}
            </Link>
          </div>

          <div className="text-base-content/75 flex flex-row items-center gap-2 text-base">
            <div className="flex h-fit w-6">
              <span className="icon-[material-symbols--today-outline] text-xl" />
            </div>
            <p className="flex w-full items-center py-1 wrap-anywhere whitespace-pre-wrap">
              {formatBookingDate(start)}
              {showEndDate && ` – ${formatBookingDate(end)}`}
            </p>
          </div>

          <div className="text-base-content/75 flex flex-row items-center gap-2 text-base">
            <div className="flex h-fit w-6">
              <span className="icon-[material-symbols--schedule-outline] text-xl" />
            </div>
            <p className="flex w-full items-center py-1 wrap-anywhere whitespace-pre-wrap">
              {`${clockTime(start)} – ${clockTime(end)} (${durationFormatted(msBetween(start, end))})`}
            </p>
          </div>

          {error ? (
            <div className="alert alert-error text-base">
              <span>{formatApiErrorMessage(error)}</span>
            </div>
          ) : null}

          {isPending ? (
            <>
              <p className="text-base-content/75 text-lg">
                Creating new booking...
              </p>
              <div className="flex items-center justify-center">
                <div className="bg-base-100 h-4 w-full overflow-hidden rounded-xl">
                  <div className="animate-booking-fake-progress bg-primary h-full" />
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-row gap-2">
              <button
                type="button"
                className="btn grow"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary grow">
                Confirm
              </button>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
