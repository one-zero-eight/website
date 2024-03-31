"use client";

import TelegramLoginButton, {
  TelegramUser,
} from "@/components/account/TelegramLoginButton";
import { accounts } from "@/lib/accounts";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function TelegramLogin({ showButton = true }) {
  const searchParams = useSearchParams();
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

  useEffect(() => {
    if (searchParams.has("id")) {
      const telegramUser = TelegramUser.safeParse(
        Object.fromEntries(searchParams.entries()),
      );
      if (telegramUser.success) {
        connectTelegram({ data: telegramUser.data });
      }
    }
  }, [searchParams, connectTelegram]);

  const onAuth = (user: TelegramUser) => {
    connectTelegram({ data: user });
  };

  if (!showButton) {
    return null;
  }

  return (
    <TelegramLoginButton
      botName={process.env.NEXT_PUBLIC_BOT_NAME!}
      onAuth={onAuth}
      className="flex h-10 w-full items-center justify-center"
    />
  );
}
