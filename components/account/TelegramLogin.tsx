"use client";

import TelegramLoginButton, {
  TelegramUser,
} from "@/components/account/TelegramLoginButton";
import { accounts } from "@/lib/accounts";

export default function TelegramLogin() {
  const { mutate: connectTelegram } = accounts.useProvidersTelegramConnect();

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
