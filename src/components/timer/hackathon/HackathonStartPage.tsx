import { Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { CreateTimerModal } from "./components/CreateTimerModal";
import { JoinTimerModal } from "./components/JoinTimerModal";
import { useHackathonTimers } from "./lib/useHackathonTimers";
import { useLastOpenedHackathon } from "./lib/useLastOpenedHackathon";

// Opens the last opened timer, or offers to create/join one if there are none
export function HackathonStartPage() {
  const { timers } = useHackathonTimers();
  const lastOpenedTimerId = useLastOpenedHackathon();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  const timerToOpen =
    timers.find((timer) => timer.id === lastOpenedTimerId) ?? timers[0];
  if (timerToOpen) {
    return (
      <Navigate
        to="/timer/hackathon/$id"
        params={{ id: timerToOpen.id }}
        replace
      />
    );
  }

  return (
    <div className="flex grow flex-col items-center justify-center gap-6 p-4">
      <p className="text-base-content/70 text-center text-xl">
        You have no timers yet
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={() => setIsCreateOpen(true)}
        >
          <span className="icon-[material-symbols--add]" />
          Add timer
        </button>
        <button
          type="button"
          className="btn btn-outline btn-lg"
          onClick={() => setIsJoinOpen(true)}
        >
          <span className="icon-[material-symbols--key-outline]" />
          Join timer
        </button>
      </div>

      <CreateTimerModal open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      <JoinTimerModal open={isJoinOpen} onOpenChange={setIsJoinOpen} />
    </div>
  );
}
