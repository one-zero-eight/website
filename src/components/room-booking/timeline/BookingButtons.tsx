export function BookingButtons({
  visible,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!visible) return null;

  return (
    <div className="bg-base-200/95 border-base-300 fixed right-0 bottom-0 left-0 z-20 border-t px-0 pt-3 shadow-lg backdrop-blur-sm supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <p className="text-base-content mb-3 text-center text-sm">
        Drag tile edges to set start/end time.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2 px-6 pb-3">
        <button type="button" className="btn btn-soft grow" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary grow"
          onClick={onConfirm}
        >
          Book
        </button>
      </div>
    </div>
  );
}
