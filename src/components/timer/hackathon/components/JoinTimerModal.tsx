import { Modal } from "@/components/common/Modal.tsx";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useHackathonTimers } from "../lib/useHackathonTimers";
import { createJoinedTimerPlaceholder } from "../utils";

export function JoinTimerModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { timers, addTimer } = useHackathonTimers();
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      setJoinCode("");
      setError(null);
    }
    onOpenChange(isOpen);
  }

  function handleJoin() {
    if (timers.some((timer) => timer.joinCode === joinCode)) {
      setError("You have already joined this timer");
      return;
    }
    const joinedTimer = createJoinedTimerPlaceholder(joinCode);
    addTimer(joinedTimer);
    handleOpenChange(false);
    navigate({ to: "/timer/hackathon/$id", params: { id: joinedTimer.id } });
  }

  return (
    <Modal open={open} onOpenChange={handleOpenChange} title="Join timer">
      <label className="flex flex-col gap-1">
        <span className="text-base-content/70 text-sm">Join code</span>
        <input
          type="text"
          className="input w-full font-mono tracking-widest uppercase"
          placeholder="ABCDE"
          maxLength={5}
          value={joinCode}
          onChange={(e) => {
            setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""));
            setError(null);
          }}
        />
      </label>
      {error && <p className="text-error">{error}</p>}
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
          disabled={joinCode.length !== 5}
          onClick={handleJoin}
        >
          Join
        </button>
      </div>
    </Modal>
  );
}
