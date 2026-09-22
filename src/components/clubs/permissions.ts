import { UserRole } from "@/api/clubs/types.ts";

export function canUserEditClub(
  clubsUser:
    | {
        role: UserRole;
        leader_in_clubs: { id: string | null }[];
      }
    | undefined,
  clubId: string | null | undefined,
) {
  if (!clubsUser || !clubId) return false;
  if (clubsUser.role === UserRole.admin) return true;

  return clubsUser.leader_in_clubs.some(
    (leaderClub) => leaderClub.id === clubId,
  );
}

/**
 * True club leadership only (unlike canUserEditClub, an admin does not count) —
 * for UI that should specifically say "you lead this club", like a "Leader"
 * badge, not "you're allowed to edit this".
 */
export function isClubLeader(
  clubsUser: { leader_in_clubs: { id: string | null }[] } | undefined,
  clubId: string | null | undefined,
) {
  if (!clubsUser || !clubId) return false;
  return clubsUser.leader_in_clubs.some(
    (leaderClub) => leaderClub.id === clubId,
  );
}
