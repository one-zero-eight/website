import { Modal } from "@/components/common/Modal.tsx";

interface TimeUpMessageProps {
  isOpen: boolean;
  onDismiss: () => void;
}

export const TimeUpMessage = ({ isOpen, onDismiss }: TimeUpMessageProps) => {
  return (
    <Modal
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
      hideHeader
      containerClassName="max-w-2xl p-6 text-center sm:p-8 md:p-12"
    >
      <div className="mb-4 text-5xl sm:mb-6 sm:text-6xl md:text-7xl lg:text-8xl">
        ⏰
      </div>
      <h2 className="text-primary mb-3 text-3xl font-bold sm:text-4xl md:mb-4 md:text-5xl lg:text-6xl">
        Time's Up!
      </h2>
      <button type="button" onClick={onDismiss} className="btn btn-primary btn-lg">
        OK
      </button>
    </Modal>
  );
};
