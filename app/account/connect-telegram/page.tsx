"use client";
import TelegramLogin from "@/components/account/TelegramLogin";
import SignInButton from "@/components/common/SignInButton";
import { useMe } from "@/lib/auth/user";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useIsClient } from "usehooks-ts";

export default function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isClient = useIsClient();
  const { me } = useMe();

  const bot = searchParams.get("bot");

  useEffect(() => {
    if (me?.telegram) {
      if (bot) {
        router.push(`https://t.me/${bot}`);
      } else {
        router.push("/dashboard");
      }
    }
  }, [bot, me?.telegram, router]);

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
          <SignInButton signInRedirect="/account/connect-telegram" />
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
          <TelegramLogin />
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
