import { Modal } from "@/components/common/Modal.tsx";

interface StopDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const StopDialog = ({ isOpen, onClose, onConfirm }: StopDialogProps) => {
  return (
    <Modal
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Stop Timer"
    >
      <p className="text-base-content/50">
        Are you sure you want to stop the timer? This action cannot be undone.
      </p>
      <div className="mt-6 flex flex-wrap justify-end gap-3 sm:mt-8 sm:gap-4">
        <button type="button" onClick={onClose} className="btn">
          Cancel
        </button>
        <button type="button" onClick={onConfirm} className="btn btn-error">
          Stop Timer
        </button>
      </div>
    </Modal>
  );
};
