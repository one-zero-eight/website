import { Trans, useLingui } from "@lingui/react/macro";
import { useMe } from "@/api/accounts/user.ts";
import { $guard } from "@/api/guard";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { AuthWall } from "@/components/common/AuthWall.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const GMAIL_STORAGE_KEY = "guard_saved_gmail";

export const Route = createFileRoute("/guard/google/files/$slug/join")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useLingui();
  const { slug } = Route.useParams();
  const { me } = useMe();
  const [gmail, setGmail] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  const {
    mutate: joinFile,
    isPending,
    isSuccess,
    error,
  } = $guard.useMutation("post", "/google/files/{slug}/joins");

  const errorMessage = error ? formatApiErrorMessage(error) : null;

  useEffect(() => {
    const savedGmail = localStorage.getItem(GMAIL_STORAGE_KEY);
    if (savedGmail) {
      setGmail(savedGmail);
    }
  }, []);

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && redirectUrl) {
      window.location.href = redirectUrl;
    }
  }, [countdown, redirectUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !gmail.trim()) return;

    joinFile(
      {
        params: { path: { slug } },
        body: { gmail: gmail.trim() },
      },
      {
        onSuccess: (data) => {
          localStorage.setItem(GMAIL_STORAGE_KEY, gmail.trim());
          const url = `https://docs.google.com/spreadsheets/d/${data.file_id}/edit`;
          setRedirectUrl(url);
          setCountdown(3);
        },
      },
    );
  };

  if (!me) {
    return (
      <>
        <Helmet>
          <title>{t`Sign In - Join InNoHassle Guard File`}</title>
          <meta name="robots" content="noindex, follow" />
        </Helmet>
        <div className="flex h-full items-center justify-center">
          <AuthWall />
        </div>
      </>
    );
  }

  return (
    <div className="flex grow items-center justify-center p-5">
      <Helmet>
        <title>{t`Join InNoHassle Guard File`}</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>
      <div className="bg-base-200 rounded-box w-full max-w-xl p-8 sm:p-10">
        <h1 className="mb-2 text-center text-3xl font-bold">
          <Trans>Join InNoHassle Guard File</Trans>
        </h1>
        <p className="text-base-content/70 mb-8 text-center text-sm">
          <Trans>
            Enter your Gmail address to get access to the Google Spreadsheet
          </Trans>
        </p>

        {!isSuccess ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">
                <Trans>Gmail address</Trans>
              </legend>
              <input
                type="email"
                id="gmail"
                name="gmail"
                required
                value={gmail}
                onChange={(e) => setGmail(e.target.value)}
                placeholder="your.email@gmail.com"
                className="input input-bordered w-full"
                disabled={isPending}
              />
            </fieldset>

            <button
              type="submit"
              disabled={isPending || !gmail.trim()}
              className="btn btn-primary w-full"
            >
              {isPending ? (
                <>
                  <span className="loading loading-spinner loading-sm" />
                  <Trans>Adding you to the file...</Trans>
                </>
              ) : (
                <Trans>Join file</Trans>
              )}
            </button>
          </form>
        ) : null}

        {isSuccess && (
          <div className="alert alert-success alert-soft mt-5">
            <div className="w-full text-center">
              <p className="font-semibold">
                <Trans>Success!</Trans>
              </p>
              <p className="mt-1">
                <Trans>
                  <strong>{gmail}</strong> has been added to the spreadsheet.
                </Trans>
              </p>
              <p className="mt-3">
                <Trans>
                  Redirecting to spreadsheet in{" "}
                  <strong className="text-xl">{countdown}</strong> seconds...
                </Trans>
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-error alert-soft mt-5">
            <span>
              <strong>
                <Trans>Error:</Trans>
              </strong>{" "}
              {errorMessage}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
