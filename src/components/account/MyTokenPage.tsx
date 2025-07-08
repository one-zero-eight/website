import { $accounts } from "@/api/accounts";
import { useMe } from "@/api/accounts/user.ts";
import { SignInButton } from "@/components/common/SignInButton.tsx";
import React, { useMemo, useState } from "react";
import { useCopyToClipboard } from "usehooks-ts";

export function MyTokenPage() {
  const { me } = useMe();
  const { data } = $accounts.useQuery("get", "/tokens/generate-my-token", {});
  const accessToken = data?.access_token;

  const tokenExp = useMemo(() => {
    // Decode JWT and get expiration time
    if (!accessToken) return null;
    const payload = JSON.parse(atob(accessToken.split(".")[1]));
    return payload.exp ? new Date(payload.exp * 1000) : null;
  }, [accessToken]);

  const [_, _copy] = useCopyToClipboard();
  const [copied, setCopied] = useState(false);
  const [timer, setTimer] = useState<any>();

  const copy = () => {
    if (!accessToken) return;
    _copy(accessToken).then((ok) => {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
      if (ok) {
        setCopied(true);
        setTimer(setTimeout(() => setCopied(false), 1500));
      } else {
        setCopied(false);
      }
    });
  };

  if (!me) {
    return (
      <>
        <h1 className="break-words text-center text-2xl font-medium">
          Sign in to get access
        </h1>
        <p className="text-center text-contrast/75">
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

  return (
    <>
      <h1 className="break-words text-2xl font-medium">Access token</h1>
      <p className="text-contrast/75">
        This token gives an application full access to your account.
      </p>
      <p className="text-contrast/75">
        Use only for development. Do not send it to untrusted people or
        applications!
      </p>
      <div className="flex flex-col justify-center overflow-x-hidden">
        <div className="flex flex-row gap-2">
          <input
            readOnly
            value={accessToken}
            className="w-full grow rounded-xl border border-inactive bg-secondary p-2"
          />
          <button
            className="w-fit rounded-xl p-2 text-brand-violet hover:bg-secondary"
            onClick={copy}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
      {tokenExp && (
        <p className="text-contrast/75">
          Expires at:{" "}
          {tokenExp.toLocaleDateString("ru-RU", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
    </>
  );
}
