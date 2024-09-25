import TelegramLoginButton, {
  TelegramUser,
} from "@/components/account/TelegramLoginButton.tsx";
import { SignInButton } from "@/components/common/SignInButton.tsx";
import { accounts } from "@/lib/accounts";
import { useMe } from "@/lib/auth/user.ts";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export function ConnectTelegramPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { me } = useMe();
  const { searchStr } = useLocation({
    select: ({ searchStr }) => ({ searchStr }),
  });

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
    // Support LoginUrl
    const searchParams = new URLSearchParams(searchStr);
    if (searchParams.has("id")) {
      const telegramUser = TelegramUser.safeParse(
        Object.fromEntries(searchParams.entries()),
      );
      if (telegramUser.success) {
        connectTelegram({ data: telegramUser.data });
      }
    }
  }, [searchStr, connectTelegram]);

  if (!me) {
    return (
      <>
        <h1 className="break-words text-center text-2xl font-medium">
          Sign in to get access
        </h1>
        <p className="text-center text-text-secondary/75">
          Use your Innopolis account
          <br />
          to access InNoHassle services.
        </p>
        <div className="flex items-center justify-center">
          <SignInButton signInRedirect="" />
        </div>
      </>
    );
  }

  if (!me.telegram) {
    return (
      <>
        <h1 className="break-words text-center text-2xl font-medium">
          Connect your Telegram
        </h1>
        <div className="flex flex-col justify-center overflow-x-hidden text-center">
          <p className="break-words text-xl">{me.innopolis_sso?.name}</p>
          <p className="overflow-ellipsis text-text-secondary/75">
            {me.innopolis_sso?.email}
          </p>
        </div>
        <div className="flex items-center justify-center">
          <TelegramLoginButton
            botName={import.meta.env.VITE_BOT_NAME!}
            onAuth={(data) => connectTelegram({ data })}
            className="flex h-10 w-full items-center justify-center"
          />
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="break-words text-center text-2xl font-medium">Success!</h1>
      <div className="flex flex-col justify-center overflow-x-hidden text-center">
        <p className="break-words text-xl">{me.innopolis_sso?.name}</p>
        <p className="overflow-ellipsis text-text-secondary/75">
          {me.innopolis_sso?.email}
        </p>
        <p className="overflow-ellipsis text-text-secondary/75">
          @{me.telegram.username}
        </p>
      </div>
      <div className="flex items-center justify-center">
        <button
          className="border-focus_color flex h-14 w-fit items-center justify-center gap-4 rounded-2xl border-2 bg-base px-6 py-2 text-xl font-medium hover:bg-primary-hover"
          onClick={() => {
            const searchParams = new URLSearchParams(searchStr);
            const bot = searchParams.get("bot");
            if (bot) {
              const encodedBot = encodeURIComponent(bot);
              window.location.replace(`https://t.me/${encodedBot}`);
            } else {
              navigate({ to: "/dashboard" });
            }
          }}
        >
          Continue
        </button>
      </div>
    </>
  );
}
