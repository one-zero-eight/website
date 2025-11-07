import { $accounts } from "@/api/accounts";
import { useMe } from "@/api/accounts/user.ts";
import TelegramLoginButton, {
  TelegramUser,
} from "@/components/account/TelegramLoginButton.tsx";
import { SignInButton } from "@/components/common/SignInButton.tsx";
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

  const { mutate: connectTelegram } = $accounts.useMutation(
    "post",
    "/providers/telegram/connect",
    {
      onSuccess: () => {
        return queryClient.invalidateQueries({
          queryKey: $accounts.queryOptions("get", "/users/me").queryKey,
        });
      },
    },
  );

  useEffect(() => {
    // Support LoginUrl
    const searchParams = new URLSearchParams(searchStr);
    if (searchParams.has("id")) {
      const telegramUser = TelegramUser.safeParse(
        Object.fromEntries(searchParams.entries()),
      );
      if (telegramUser.success) {
        connectTelegram({ body: telegramUser.data });
      }
    }
  }, [searchStr, connectTelegram]);

  if (!me) {
    return (
      <>
        <h1 className="text-center text-2xl font-medium wrap-break-word">
          Sign in to get access
        </h1>
        <p className="text-base-content/75 text-center">
          Use your Innopolis account
          <br />
          to access InNoHassle services.
        </p>
        <div className="flex items-center justify-center">
          <SignInButton />
        </div>
      </>
    );
  }

  if (!me.telegram) {
    return (
      <>
        <h1 className="text-center text-2xl font-medium wrap-break-word">
          Connect your Telegram
        </h1>
        <div className="flex flex-col justify-center overflow-x-hidden text-center">
          <p className="text-xl wrap-break-word">{me.innopolis_sso?.name}</p>
          <p className="text-base-content/75 text-ellipsis">
            {me.innopolis_sso?.email}
          </p>
        </div>
        <div className="flex items-center justify-center">
          <TelegramLoginButton
            botName={import.meta.env.VITE_BOT_NAME!}
            onAuth={(data) => connectTelegram({ body: data })}
            className="flex h-10 w-full items-center justify-center"
          />
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="text-center text-2xl font-medium wrap-break-word">
        Success!
      </h1>
      <div className="flex flex-col justify-center overflow-x-hidden text-center">
        <p className="text-xl wrap-break-word">{me.innopolis_sso?.name}</p>
        <p className="text-base-content/75 text-ellipsis">
          {me.innopolis_sso?.email}
        </p>
        <p className="text-base-content/75 text-ellipsis">
          @{me.telegram.username}
        </p>
      </div>
      <div className="flex items-center justify-center">
        <button
          type="button"
          className="border-primary bg-base-100 hover:bg-inh-primary-hover rounded-box flex h-14 w-fit items-center justify-center gap-4 border-2 px-6 py-2 text-xl font-medium"
          onClick={() => {
            const searchParams = new URLSearchParams(searchStr);
            const bot = searchParams.get("bot");
            if (bot) {
              window.location.replace(`https://t.me/${bot}`);
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
