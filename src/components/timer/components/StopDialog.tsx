// components/StopDialog.tsx
interface StopDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const StopDialog = ({ isOpen, onClose, onConfirm }: StopDialogProps) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="rounded-box bg-base-200 w-[90%] max-w-[32rem] p-5 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.3),0_10px_10px_-5px_rgba(0,0,0,0.2)] transition-all duration-300 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 sm:mb-6">
          <h3 className="mb-2 text-xl font-semibold sm:mb-3 sm:text-2xl">
            Stop Timer
          </h3>
          <p className="text-base-content/50 text-sm sm:text-base">
            Are you sure you want to stop the timer? This action cannot be
            undone.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-3 sm:mt-8 sm:gap-4">
          <button type="button" onClick={onClose} className="btn">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="btn btn-error">
            Stop Timer
          </button>
        </div>
      </div>
    </div>
  );
};
