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
    <div className="flex gap-2">
      <button
        type="button"
        className="btn btn-ghost flex-1 shadow-md"
        onClick={onCancel}
      >
        Cancel
      </button>
      <button
        type="button"
        className="btn btn-primary flex-1 shadow-md"
        onClick={onConfirm}
      >
        Book
      </button>
    </div>
  );
}
