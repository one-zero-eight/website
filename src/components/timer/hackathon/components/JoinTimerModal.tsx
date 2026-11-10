import { $timer } from "@/api/timer";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { Modal } from "@/components/common/Modal.tsx";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useRefreshTimers } from "../lib/useHackathonTimers";
import { findInvitationUuid } from "../utils";

export function JoinTimerModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const refreshTimers = useRefreshTimers();
  const [invitation, setInvitation] = useState("");
  const invitationUuid = findInvitationUuid(invitation);

  const {
    mutate: joinTimer,
    isPending,
    error,
    reset,
  } = $timer.useMutation("post", "/invitations/{invitation_uuid}/join", {
    onSuccess: refreshTimers,
  });

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      setInvitation("");
      reset();
    }
    onOpenChange(isOpen);
  }

  function handleJoin() {
    if (!invitationUuid) return;
    joinTimer(
      { params: { path: { invitation_uuid: invitationUuid } } },
      {
        onSuccess: (joinedTimer) => {
          handleOpenChange(false);
          navigate({
            to: "/timer/hackathon/$id",
            params: { id: String(joinedTimer.id) },
          });
        },
      },
    );
  }

  return (
    <Modal open={open} onOpenChange={handleOpenChange} title="Join timer">
      <label className="flex flex-col gap-1">
        <span className="text-base-content/70 text-sm">Invitation link</span>
        <input
          type="text"
          className="input w-full"
          placeholder="https://.../timer/join/..."
          value={invitation}
          onChange={(e) => {
            setInvitation(e.target.value.trim());
            reset();
          }}
        />
      </label>
      {error && <p className="text-error">{formatApiErrorMessage(error)}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          className="btn"
          onClick={() => handleOpenChange(false)}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!invitationUuid || isPending}
          onClick={handleJoin}
        >
          {isPending && <span className="loading loading-spinner loading-sm" />}
          Join
        </button>
      </div>
    </Modal>
  );
}
