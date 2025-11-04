import { useMe } from "@/api/accounts/user.ts";
import { $guard } from "@/api/guard";
import { AuthWall } from "@/components/common/AuthWall.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Helmet } from "@dr.pogodin/react-helmet";

const GMAIL_STORAGE_KEY = "guard_saved_gmail";

export const Route = createFileRoute("/guard/google/files/$slug/join" as any)({
  component: RouteComponent,
});

function RouteComponent() {
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

  const errorMessage = error
    ? ((error as any)?.detail ?? "Failed to join file. Please try again.")
    : null;

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
          <title>Sign In - Join InNoHassle Guard File</title>
        </Helmet>
        <div className="flex h-full items-center justify-center">
          <AuthWall signInRedirect={`/guard/google/files/${slug}/join`} />
        </div>
      </>
    );
  }

  return (
    <div className="flex grow items-center justify-center p-5">
      <Helmet>
        <title>Join InNoHassle Guard File</title>
      </Helmet>
      <div className="bg-base-200 w-full max-w-xl rounded-xl p-10 shadow-lg">
        <h1 className="mb-2 text-center text-3xl font-bold">
          Join InNoHassle Guard File
        </h1>
        <p className="text-base-content/70 mb-8 text-center text-sm">
          Enter your Gmail address to get access to the Google Spreadsheet
        </p>

        {!isSuccess ? (
          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label
                htmlFor="gmail"
                className="text-base-content/80 mb-1 block font-medium"
              >
                Gmail Address:
              </label>
              <input
                type="email"
                id="gmail"
                name="gmail"
                required
                value={gmail}
                onChange={(e) => setGmail(e.target.value)}
                placeholder="your.email@gmail.com"
                className="border-base-content/20 bg-inh-primary/5 focus:border-primary focus:bg-inh-primary/10 rounded-field w-full border-2 px-3 py-3 text-base outline-hidden transition-colors"
                disabled={isPending}
              />
            </div>

            <button
              type="submit"
              disabled={isPending || !gmail.trim()}
              className="bg-primary rounded-field w-full py-4 text-base font-medium text-white transition-colors hover:bg-[#6600CC] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Adding you to the file..." : "Join File"}
            </button>
          </form>
        ) : null}

        {isPending && (
          <div className="text-primary mt-5 text-center">
            <div className="mb-2 inline-block">
              <span className="icon-[mdi--loading] animate-spin text-5xl" />
            </div>
            <p>Adding you to the file...</p>
          </div>
        )}

        {isSuccess && (
          <div className="rounded-field mt-5 border border-green-200 bg-green-100 p-4 text-green-800 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300">
            <div className="mb-2 text-center">
              <strong>✅ Success!</strong>
            </div>
            <p className="text-center">
              <strong>{gmail}</strong> has been added to the spreadsheet.
            </p>
            <p className="mt-3 text-center">
              Redirecting to spreadsheet in{" "}
              <strong className="text-xl">{countdown}</strong> seconds...
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-field mt-5 border border-red-200 bg-red-100 p-4 text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300">
            <strong>❌ Error:</strong>
            <br />
            {errorMessage}
          </div>
        )}
      </div>
    </div>
  );
}
