import { $timer } from "@/api/timer";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { useToast } from "@/components/toast";
import { useLocalStorage } from "usehooks-ts";

// The API cannot list invitations, so the created one is remembered in this browser
export function useTimerInvitation(timerId: number) {
  const { showError } = useToast();
  const [invitationUuids, setInvitationUuids] = useLocalStorage<
    Record<number, string>
  >("hackathon-timer-invitations", {});

  const { mutate, isPending } = $timer.useMutation(
    "post",
    "/timers/{timer_id}/invitations",
    {
      onSuccess: (invitation) =>
        setInvitationUuids((previous) => ({
          ...previous,
          [timerId]: invitation.uuid,
        })),
      onError: (error) => showError("Error", formatApiErrorMessage(error)),
    },
  );

  function createInvitation() {
    mutate({ params: { path: { timer_id: timerId } } });
  }

  return {
    invitationUuid: invitationUuids[timerId] as string | undefined,
    createInvitation,
    isPending,
  };
}
