import { $when2meet, type when2meetTypes } from "@/api/when2meet";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { useToast } from "@/components/toast";

export function ArchiveMeetingButton({
  meetingRef,
  meetingName,
  disabled,
  onMeetingUpdated,
}: {
  meetingRef: string;
  meetingName: string;
  disabled: boolean;
  onMeetingUpdated: (meeting: when2meetTypes.SchemaEventView) => void;
}) {
  const { showConfirm, showSuccess, showError } = useToast();
  const { mutate, isPending } = $when2meet.useMutation(
    "post",
    "/meetings/{meeting_ref}/archive",
    {
      onSuccess: (meeting) => {
        onMeetingUpdated(meeting);
        showSuccess(
          "Meeting archived",
          `"${meetingName}" was moved to the archive.`,
        );
      },
      onError: (error) => showError("Error", formatApiErrorMessage(error)),
    },
  );

  async function handleArchive() {
    const confirmed = await showConfirm({
      title: "Archive meeting",
      message: `Archive "${meetingName}"? Participants will still be able to view it, but changes will no longer be allowed.`,
      confirmText: "Archive",
      cancelText: "Cancel",
      type: "warning",
    });
    if (!confirmed) {
      return;
    }
    mutate({ params: { path: { meeting_ref: meetingRef } } });
  }

  return (
    <button
      type="button"
      className="btn grow gap-2"
      disabled={disabled || isPending}
      onClick={handleArchive}
    >
      {isPending ? (
        <span className="loading loading-spinner loading-sm" />
      ) : (
        <span className="icon-[mdi--archive-outline] text-lg" />
      )}
      Archive event
    </button>
  );
}
