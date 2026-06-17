import { Modal } from "@/components/common/Modal.tsx";
import { formatDateRangeLabel, formatMeetingDates } from "./utils/slots.ts";

export function EditEventModal({
  open,
  onOpenChange,
  meetingName,
  meetingDates,
  description,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingName: string;
  meetingDates: string[];
  description?: string | null;
}) {
  const formattedDates = formatMeetingDates(meetingDates);

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Event details">
      <div className="grid gap-3">
        <div>
          <div className="text-base-content/60 text-sm">Name</div>
          <div className="font-medium">{meetingName}</div>
        </div>
        {description && (
          <div>
            <div className="text-base-content/60 text-sm">Description</div>
            <div className="text-sm">{description}</div>
          </div>
        )}
        <div>
          <div className="text-base-content/60 text-sm">Dates</div>
          <div className="text-sm">{formatDateRangeLabel(formattedDates)}</div>
        </div>
        <p className="text-base-content/60 text-sm">
          Event settings cannot be changed after creation yet.
        </p>
      </div>
    </Modal>
  );
}
