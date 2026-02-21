interface TimeUpMessageProps {
  isOpen: boolean;
  onDismiss: () => void;
}

export const TimeUpMessage = ({ isOpen, onDismiss }: TimeUpMessageProps) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <div
        className="animate-in fade-in zoom-in rounded-box bg-base-200 relative mx-4 w-full max-w-2xl p-6 text-center shadow-2xl duration-300 sm:p-8 md:p-12"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 text-5xl sm:mb-6 sm:text-6xl md:text-7xl lg:text-8xl">
          ⏰
        </div>
        <h2 className="text-primary mb-3 text-3xl font-bold sm:text-4xl md:mb-4 md:text-5xl lg:text-6xl">
          Time's Up!
        </h2>
        <button
          type="button"
          onClick={onDismiss}
          className="btn btn-primary btn-lg"
        >
          OK
        </button>
      </div>
    </div>
  );
};
