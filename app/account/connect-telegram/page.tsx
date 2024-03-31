"use client";
import TelegramLoginButton, {
  TelegramUser,
} from "@/components/account/TelegramLoginButton";
import SignInButton from "@/components/common/SignInButton";
import { accounts } from "@/lib/accounts";
import { useMe } from "@/lib/auth/user";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useIsClient } from "usehooks-ts";

export default function Page() {
  const isClient = useIsClient();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { me } = useMe();

  const searchParams = useMemo(
    () =>
      isClient
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams(),
    [isClient],
  );
  const bot = searchParams.get("bot");

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
    if (searchParams.has("id")) {
      const telegramUser = TelegramUser.safeParse(
        Object.fromEntries(searchParams.entries()),
      );
      if (telegramUser.success) {
        connectTelegram({ data: telegramUser.data });
      }
    }
  }, [searchParams, connectTelegram]);

  if (!isClient || !me) {
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
          <SignInButton
            signInRedirect={
              typeof window !== "undefined"
                ? window.location.href
                : "/account/connect-telegram"
            }
          />
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
          <p className="break-words text-xl">{me?.innopolis_sso?.name}</p>
          <p className="overflow-ellipsis text-text-secondary/75">
            {me?.innopolis_sso?.email}
          </p>
        </div>
        <div className="flex items-center justify-center">
          <TelegramLoginButton
            botName={process.env.NEXT_PUBLIC_BOT_NAME!}
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
        <p className="break-words text-xl">{me?.innopolis_sso?.name}</p>
        <p className="overflow-ellipsis text-text-secondary/75">
          {me?.innopolis_sso?.email}
        </p>
        <p className="overflow-ellipsis text-text-secondary/75">
          @{me?.telegram?.username}
        </p>
      </div>
      <div className="flex items-center justify-center">
        <button
          className="border-focus_color flex h-14 w-fit items-center justify-center gap-4 rounded-2xl border-2 bg-base px-6 py-2 text-xl font-medium hover:bg-primary-hover"
          onClick={() => {
            if (bot) {
              router.push(`https://t.me/${bot}`);
            } else {
              router.push("/dashboard");
            }
          }}
        >
          Continue
        </button>
      </div>
    </>
  );
}
