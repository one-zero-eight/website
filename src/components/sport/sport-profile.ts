import { useMe } from "@/api/accounts/user.ts";
import { $sport } from "@/api/sport";
import { useMemo } from "react";

/** Shared sport profile state used by the sport tabs and every sport page. */
export function useSportProfile() {
  const { me } = useMe();
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
      enabled: !!me,
      retry: 1,
    },
  );

  const studentId = profile?.user_id;
  const isTrainer = (profile?.trainer_info?.groups.length ?? 0) > 0;
  const isCollege = profile?.student_info?.is_college ?? false;
  const isAdmin = profile?.is_admin ?? false;
  const studentStatus = profile?.student_info?.student_status ?? null;
  const trainerGroupIds = useMemo(
    () => new Set(profile?.trainer_info?.groups.map((group) => group.id) ?? []),
    [profile?.trainer_info?.groups],
  );

  return {
    profile,
    profilePending,
    profileError,
    profileErr,
    studentId,
    isTrainer,
    isCollege,
    isAdmin,
    studentStatus,
    trainerGroupIds,
  };
}

export type SportProfile = ReturnType<typeof useSportProfile>;
export type SportProfileReady = SportProfile & {
  profile: NonNullable<SportProfile["profile"]>;
};
