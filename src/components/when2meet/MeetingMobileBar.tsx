export function MeetingMobileBar({
  onShare,
  onBookRoom,
  onDelete,
  onSaveSetup,
  isDeleting,
  isSavingSetup,
  canBookRoom,
}: {
  onShare?: () => void;
  onBookRoom?: () => void;
  onDelete?: () => void;
  onSaveSetup?: () => void;
  isDeleting?: boolean;
  isSavingSetup?: boolean;
  canBookRoom?: boolean;
}) {
  if (onSaveSetup) {
    return (
      <div className="border-base-300 bg-base-200 fixed bottom-12 flex h-fit w-full flex-col gap-2 rounded-t-xl border-b p-4 md:hidden">
        <button
          type="button"
          className="btn btn-primary w-full gap-2"
          disabled={isSavingSetup}
          onClick={onSaveSetup}
        >
          {isSavingSetup ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            "Save timeslots"
          )}
        </button>
      </div>
    );
  }

  if (!onShare && !onBookRoom && !onDelete) {
    return null;
  }

  return (
    <div className="border-base-300 bg-base-200 fixed bottom-12 flex h-fit w-full flex-row gap-2 rounded-t-xl border-b p-4 md:hidden">
      {onShare && (
        <button
          type="button"
          className="btn btn-outline min-w-0 flex-1 gap-2"
          onClick={onShare}
        >
          <span className="icon-[material-symbols--share-outline] text-lg" />
          Share link
        </button>
      )}
      {onBookRoom && (
        <button
          type="button"
          className="btn btn-primary min-w-0 flex-1 gap-2"
          disabled={!canBookRoom}
          onClick={onBookRoom}
        >
          <span className="icon-[mdi--door-open] text-lg" />
          Book room
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          className="btn btn-outline btn-error btn-square shrink-0"
          disabled={isDeleting}
          onClick={onDelete}
        >
          {isDeleting ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <span className="icon-[material-symbols--delete-outline] text-xl" />
          )}
        </button>
      )}
    </div>
  );
}
