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
