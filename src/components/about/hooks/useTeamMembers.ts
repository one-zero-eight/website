import { useQuery } from "@tanstack/react-query";
import membersConfig from "@/components/about/members.json";

export interface TeamMember {
  fullName: string;
  telegram?: string;
  github?: string;
  avatar?: string;
}

export const useTeamMembers = () => {
  return useQuery({
    queryKey: ["team-members"],
    queryFn: async (): Promise<TeamMember[]> => {
      return membersConfig.map((member) => ({
        fullName: member.fullName,
        telegram: member.telegram,
        github: member.github,
        avatar: member.telegram
          ? `https://storage.innohassle.ru/website-static/about/avatars/${member.telegram}.webp`
          : member.avatar,
      }));
    },
    staleTime: 10 * 60 * 1000, // 10 минут
    refetchOnWindowFocus: false,
  });
};
