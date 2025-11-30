import { useQuery } from "@tanstack/react-query";
import membersConfig from "@/components/about/members.json";

export interface TeamMember {
  fullName: string;
  telegram?: string;
  github?: string;
  avatar?: string;
}

const decodeBase64 = (str?: string) => (str ? atob(str) : undefined);

export const useTeamMembers = () => {
  return useQuery({
    queryKey: ["team-members"],
    queryFn: async (): Promise<TeamMember[]> => {
      return membersConfig.map((member) => {
        const telegram = decodeBase64(member.telegram);
        const github = decodeBase64(member.github);

        return {
          fullName: member.fullName,
          telegram,
          github,
          avatar: telegram
            ? `https://storage.innohassle.ru/website-static/about/avatars/${telegram}.webp`
            : member.avatar,
        };
      });
    },
    staleTime: 10 * 60 * 1000, // 10 минут
    refetchOnWindowFocus: false,
  });
};
