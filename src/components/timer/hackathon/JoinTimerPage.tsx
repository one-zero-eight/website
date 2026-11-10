import { $timer } from "@/api/timer";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useRefreshTimers } from "./lib/useHackathonTimers";

// Joins the timer by the invitation from the link and opens it
export function JoinTimerPage({ invitation }: { invitation: string }) {
  const navigate = useNavigate();
  const refreshTimers = useRefreshTimers();

  const {
    mutate: joinTimer,
    error,
    isError,
  } = $timer.useMutation("post", "/invitations/{invitation_uuid}/join", {
    onSuccess: refreshTimers,
  });

  useEffect(() => {
    joinTimer(
      { params: { path: { invitation_uuid: invitation } } },
      {
        onSuccess: (joinedTimer) =>
          navigate({
            to: "/timer/hackathon/$id",
            params: { id: String(joinedTimer.id) },
            replace: true,
          }),
      },
    );
  }, [invitation, joinTimer, navigate]);

  if (isError) {
    return (
      <div className="flex grow flex-col items-center justify-center gap-4 p-4">
        <p className="text-error text-xl">{formatApiErrorMessage(error)}</p>
        <Link to="/timer/hackathon" className="btn btn-primary">
          Back to timers
        </Link>
      </div>
    );
  }

  return (
    <div className="flex grow flex-col items-center justify-center gap-4 p-4">
      <span className="loading loading-spinner loading-lg" />
      <p className="text-base-content/70 text-xl">Joining the timer...</p>
    </div>
  );
}
