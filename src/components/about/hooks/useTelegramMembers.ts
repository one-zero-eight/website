import { useQuery } from "@tanstack/react-query";
import telegramConfig from "@/config/telegram-members.json";

interface TelegramMember {
  id: number;
  username: string;
  avatar_url: string;
}

export const useTelegramMembers = () => {
  return useQuery({
    queryKey: ["telegram-members"],
    queryFn: async (): Promise<TelegramMember[]> => {
      return telegramConfig.telegramMembers.map((member, index) => ({
        id: index + 1,
        username: member.username,
        avatar_url: member.avatar,
      }));
    },
    staleTime: 10 * 60 * 1000, // 10 минут
    refetchOnWindowFocus: false,
  });
};
