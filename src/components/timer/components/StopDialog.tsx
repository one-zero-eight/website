import { Modal } from "@/components/common/Modal.tsx";
import { Trans, useLingui } from "@lingui/react/macro";

interface StopDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const StopDialog = ({ isOpen, onClose, onConfirm }: StopDialogProps) => {
  const { t } = useLingui();
  return (
    <Modal
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t`Stop Timer`}
    >
      <p className="text-base-content/50">
        <Trans>
          Are you sure you want to stop the timer? This action cannot be undone.
        </Trans>
      </p>
      <div className="mt-6 flex flex-wrap justify-end gap-3 sm:mt-8 sm:gap-4">
        <button type="button" onClick={onClose} className="btn">
          <Trans>Cancel</Trans>
        </button>
        <button type="button" onClick={onConfirm} className="btn btn-error">
          <Trans>Stop Timer</Trans>
        </button>
      </div>
    </Modal>
  );
};
