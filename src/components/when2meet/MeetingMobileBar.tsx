import { Link } from "@tanstack/react-router";

export function MeetingMobileBar({
  onShare,
  meetingId,
  meetingName,
  onDelete,
  onSaveSetup,
  isDeleting,
}: {
  onShare: () => void;
  meetingId: string;
  meetingName: string;
  onDelete?: () => void;
  onSaveSetup?: () => void;
  isDeleting?: boolean;
}) {
  if (onSaveSetup) {
    return (
      <div className="border-base-300 bg-base-200 fixed bottom-12 flex w-full flex-col gap-2 rounded-t-xl border-b p-3 md:hidden">
        <button
          type="button"
          className="btn btn-primary w-full"
          onClick={onSaveSetup}
        >
          Save timeslots
        </button>
      </div>
    );
  }

  return (
    <div className="border-base-300 bg-base-200 fixed bottom-12 flex w-full flex-row gap-2 rounded-t-xl border-b p-3 md:hidden">
      <button
        type="button"
        className="btn btn-outline min-w-0 flex-1"
        onClick={onShare}
      >
        Share link
      </button>
      <Link
        to="/when2meet/$meetingId/book-room"
        params={{ meetingId }}
        search={{ name: meetingName }}
        className="btn btn-primary min-w-0 flex-1"
      >
        Book room
      </Link>
      {onDelete && (
        <button
          type="button"
          className="btn btn-outline btn-error btn-square shrink-0"
          disabled={isDeleting}
          onClick={onDelete}
        >
          {isDeleting ? (
            <span className="loading loading-spinner" />
          ) : (
            <span className="icon-[material-symbols--delete-outline] text-xl" />
          )}
        </button>
      )}
    </div>
  );
}
