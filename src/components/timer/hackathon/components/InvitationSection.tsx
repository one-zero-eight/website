import { useTimerInvitation } from "../lib/useTimerInvitation";
import { createInvitationLink } from "../utils";
import { CopyLinkButton } from "./CopyLinkButton";

// Shows the created invitation link, or a button to create it
export function InvitationSection({ timerId }: { timerId: number }) {
  const { invitationUuid, createInvitation, isPending } =
    useTimerInvitation(timerId);

  return (
    <div className="flex flex-col gap-1">
      <span className="text-base-content/70 text-sm">Invitation link</span>
      <div className="flex flex-wrap items-center gap-3">
        {invitationUuid ? (
          <CopyLinkButton link={createInvitationLink(invitationUuid)} />
        ) : (
          <button
            type="button"
            className="btn btn-outline"
            disabled={isPending}
            onClick={createInvitation}
          >
            {isPending ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <span className="icon-[material-symbols--key-outline]" />
            )}
            Create invitation link
          </button>
        )}
      </div>
      <span className="text-base-content/70 text-sm">
        Anyone with the link can join the timer
      </span>
    </div>
  );
}
