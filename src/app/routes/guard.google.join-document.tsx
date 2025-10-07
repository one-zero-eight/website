import { useMe } from "@/api/accounts/user.ts";
import { $guard } from "@/api/guard";
import { AuthWall } from "@/components/common/AuthWall.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";

export type GuardGoogleJoinDocumentParams = {
  spreadsheet_id: string | undefined;
};

export const Route = createFileRoute("/guard/google/join-document")({
  validateSearch: (
    search: Record<string, unknown>,
  ): GuardGoogleJoinDocumentParams => {
    return {
      spreadsheet_id:
        typeof search.spreadsheet_id === "string"
          ? search.spreadsheet_id
          : undefined,
    };
  },

  component: function GuardGoogleJoinDocumentPage() {
    const { spreadsheet_id } = Route.useSearch();
    const { me } = useMe();
    const [gmail, setGmail] = useState("");
    const [countdown, setCountdown] = useState<number | null>(null);
    const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

    const {
      mutate: joinDocument,
      isPending,
      isSuccess,
      error,
    } = $guard.useMutation("post", "/google/join-document");

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
      if (!spreadsheet_id || !gmail.trim()) return;

      joinDocument(
        {
          body: {
            gmail: gmail.trim(),
            spreadsheet_id: spreadsheet_id,
          },
        },
        {
          onSuccess: () => {
            const url = `https://docs.google.com/spreadsheets/d/${spreadsheet_id}/edit`;
            setRedirectUrl(url);
            setCountdown(3);
          },
        },
      );
    };

    if (!spreadsheet_id) {
      return (
        <>
          <Helmet>
            <title>Error - Join InNoHassle Guard Document</title>
          </Helmet>
          <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 text-6xl">❌</div>
            <h2 className="mb-2 text-2xl font-bold">Error</h2>
            <p className="text-lg text-contrast/70">
              No spreadsheet ID provided in URL
            </p>
          </div>
        </>
      );
    }

    if (!me) {
      return (
        <>
          <Helmet>
            <title>Sign In - Join InNoHassle Guard Document</title>
          </Helmet>
          <div className="flex h-full items-center justify-center">
            <AuthWall
              signInRedirect={`/guard/google/join-document?spreadsheet_id=${spreadsheet_id}`}
            />
          </div>
        </>
      );
    }

    return (
      <div className="flex grow items-center justify-center p-5">
        <Helmet>
          <title>Join InNoHassle Guard Document</title>
        </Helmet>
        <div className="w-full max-w-xl rounded-xl bg-floating p-10 shadow-lg">
          <h1 className="mb-2 text-center text-3xl font-bold">
            Join InNoHassle Guard Document
          </h1>
          <p className="mb-8 text-center text-sm text-contrast/70">
            Enter your Gmail address to get access to the Google Spreadsheet
          </p>

          {!isSuccess ? (
            <form onSubmit={handleSubmit}>
              <div className="mb-5">
                <label
                  htmlFor="gmail"
                  className="mb-1 block font-medium text-contrast/80"
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
                  className="w-full rounded-lg border-2 border-contrast/20 bg-primary/5 px-3 py-3 text-base outline-none transition-colors focus:border-brand-violet focus:bg-primary/10"
                  disabled={isPending}
                />
              </div>

              <button
                type="submit"
                disabled={isPending || !gmail.trim()}
                className="w-full rounded-lg bg-brand-violet py-4 text-base font-medium text-white transition-colors hover:bg-[#6600CC] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Adding you to the document..." : "Join Document"}
              </button>
            </form>
          ) : null}

          {isPending && (
            <div className="mt-5 text-center text-brand-violet">
              <div className="mb-2 inline-block">
                <span className="icon-[mdi--loading] animate-spin text-5xl" />
              </div>
              <p>Adding you to the document...</p>
            </div>
          )}

          {isSuccess && (
            <div className="mt-5 rounded-lg border border-green-200 bg-green-100 p-4 text-green-800 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300">
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
            <div className="mt-5 rounded-lg border border-red-200 bg-red-100 p-4 text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300">
              <strong>❌ Error:</strong>
              <br />
              Failed to join document. Please try again.
            </div>
          )}
        </div>
      </div>
    );
  },
});
