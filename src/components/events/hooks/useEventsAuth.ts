import { $clubs } from "@/api/clubs";
import { $workshops } from "@/api/workshops";
import { UserRole } from "@/api/workshops/types";

export function useEventsAuth() {
  const { data: eventsUser } = $workshops.useQuery("get", "/users/me");
  const { data: clubsUser } = $clubs.useQuery("get", "/users/me");

  const isAdmin = eventsUser?.role === UserRole.admin;
  const leaderClubIds = clubsUser?.leader_in_clubs?.map((c) => c.id) ?? [];
  const isClubLeader = leaderClubIds.length > 0;

  return {
    eventsUser,
    clubsUser,
    isAdmin,
    leaderClubIds,
    isClubLeader,
  };
}
