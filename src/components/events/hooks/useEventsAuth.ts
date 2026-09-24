import { useMe } from "@/api/accounts/user.ts";
import { $workshops } from "@/api/workshops";

export function useEventsAuth() {
  const { me: accountMe } = useMe();
  const {
    data: me,
    isPending,
    isError,
    error,
    refetch,
  } = $workshops.useQuery("get", "/users/me", undefined, {
    enabled: !!accountMe,
  });

  const roles = me?.roles ?? [];
  const clubs = me?.clubs ?? [];

  const isClubLeader = roles.includes("club-leader");
  const isEventManager = roles.includes("event-manager");
  const isModerator = roles.includes("moderator");
  const canManage = isClubLeader || isEventManager;

  return {
    me,
    clubs,
    roles,
    isPending: !!accountMe && isPending,
    isError: !!accountMe && isError,
    error,
    refetch,
    isClubLeader,
    isEventManager,
    isModerator,
    canManage,
  };
}
