import { $accounts } from "@/api/accounts";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import { useMe } from "@/api/accounts/user.ts";
import { SignInButton } from "@/components/common/SignInButton.tsx";
import React, { useMemo, useState } from "react";
import { useCopyToClipboard } from "usehooks-ts";

export function MyTokenPage() {
  const { i18n } = useLingui();
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
        <h1 className="text-center text-2xl font-medium wrap-break-word">
          <Trans>Sign in to get access</Trans>
        </h1>
        <p className="text-base-content/75 text-center">
          <Trans>
            Use your Innopolis account
            <br />
            to access InNoHassle services.
          </Trans>
        </p>
        <div className="flex items-center justify-center">
          <SignInButton />
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-medium wrap-break-word">
        <Trans>Access token</Trans>
      </h1>
      <p className="text-base-content/75">
        <Trans>
          This token gives an application full access to your account.
        </Trans>
      </p>
      <p className="text-base-content/75">
        <Trans>
          Use only for development. Do not send it to untrusted people or
          applications!
        </Trans>
      </p>
      <div className="flex flex-col justify-center overflow-x-hidden">
        <div className="flex flex-row gap-2">
          <input
            readOnly
            value={accessToken}
            className="border-base-300 bg-base-300/55 w-full grow rounded-xl border p-2"
          />
          <button
            className="text-primary hover:bg-base-300 w-fit rounded-xl p-2"
            onClick={copy}
          >
            {copied ? <Trans>Copied!</Trans> : <Trans>Copy</Trans>}
          </button>
        </div>
      </div>
      {tokenExp && (
        <p className="text-base-content/75">
          <Trans>
            Expires at:{" "}
            {tokenExp.toLocaleDateString(i18n.locale, {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Trans>
        </p>
      )}
    </>
  );
}
