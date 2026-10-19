import { Modal } from "@/components/common/Modal.tsx";
import { HackathonTimer } from "../utils";

export function RemoveTimerModal({
  timer,
  onClose,
  onConfirm,
}: {
  timer: HackathonTimer | null;
  onClose: () => void;
  onConfirm: (timer: HackathonTimer) => void;
}) {
  const actionLabel = timer?.isOwner ? "Delete" : "Unsubscribe";

  return (
    <Modal
      open={timer !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={`${actionLabel} timer`}
    >
      <p className="text-base-content/50">
        {timer?.isOwner
          ? `Delete "${timer.title}" for everyone? This action cannot be undone.`
          : `Unsubscribe from "${timer?.title}"? You can join again with the join code.`}
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-error"
          onClick={() => timer && onConfirm(timer)}
        >
          {actionLabel}
        </button>
      </div>
    </Modal>
  );
}
