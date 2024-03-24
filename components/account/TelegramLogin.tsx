"use client";

import TelegramLoginButton, {
  TelegramUser,
} from "@/components/account/TelegramLoginButton";
import { accounts } from "@/lib/accounts";
import { useQueryClient } from "@tanstack/react-query";

export default function TelegramLogin() {
  const queryClient = useQueryClient();
  const { mutate: connectTelegram } = accounts.useProvidersTelegramConnect({
    mutation: {
      onSuccess: () => {
        return queryClient.invalidateQueries({
          queryKey: ["accounts", ...accounts.getUsersGetMeQueryKey()],
        });
      },
    },
  });

  const onAuth = (user: TelegramUser) => {
    connectTelegram({ data: user });
  };

  return (
    <TelegramLoginButton
      botName={process.env.NEXT_PUBLIC_BOT_NAME!}
      onAuth={onAuth}
      className="flex h-10 w-full items-center justify-center"
    />
  );
}
