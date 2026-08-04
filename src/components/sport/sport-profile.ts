import { useMe } from "@/api/accounts/user.ts";
import { $sport } from "@/api/sport";
import { useMySportAccessToken } from "@/api/helpers/sport-access-token.ts";
import { useMemo } from "react";

/** Shared sport profile/token state used by the sport tabs and every sport page. */
export function useSportProfile() {
  const { me } = useMe();
  const [sportToken] = useMySportAccessToken();
  const canQuerySport = !!me && !!sportToken;

  const {
    data: profile,
    isPending: profilePending,
    isError: profileError,
    error: profileErr,
  } = $sport.useQuery(
    "get",
    "/users/me",
    {},
    {
      enabled: canQuerySport,
      retry: 1,
    },
  );

  const studentId = profile?.user_id;
  const isTrainer = (profile?.trainer_info?.groups.length ?? 0) > 0;
  const isAdmin = profile?.is_admin ?? false;
  const trainerGroupIds = useMemo(
    () => new Set(profile?.trainer_info?.groups.map((group) => group.id) ?? []),
    [profile?.trainer_info?.groups],
  );

  return {
    sportToken,
    canQuerySport,
    profile,
    profilePending,
    profileError,
    profileErr,
    studentId,
    isTrainer,
    isAdmin,
    trainerGroupIds,
  };
}

export type SportProfile = ReturnType<typeof useSportProfile>;
export type SportProfileReady = SportProfile & {
  profile: NonNullable<SportProfile["profile"]>;
};
