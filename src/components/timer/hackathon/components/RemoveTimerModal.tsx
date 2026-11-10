import { Modal } from "@/components/common/Modal.tsx";
import { HackathonTimer } from "../utils";

export function RemoveTimerModal({
  timer,
  isDeleting,
  onClose,
  onConfirm,
}: {
  timer: HackathonTimer | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: (timer: HackathonTimer) => void;
}) {
  return (
    <Modal
      open={timer !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Delete timer"
    >
      <p className="text-base-content/50">
        Delete "{timer?.title}" for everyone? This action cannot be undone.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-error"
          disabled={isDeleting}
          onClick={() => timer && onConfirm(timer)}
        >
          {isDeleting && (
            <span className="loading loading-spinner loading-sm" />
          )}
          Delete
        </button>
      </div>
    </Modal>
  );
}
