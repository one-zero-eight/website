import { Helmet } from "@dr.pogodin/react-helmet";

export function TvStartupPage({
  code,
  error,
}: {
  code?: string;
  error?: string;
}) {
  return (
    <>
      <Helmet>
        <title>TV Startup</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div
        data-theme="light"
        className="bg-base-100 text-base-content flex h-dvh w-full items-center justify-center p-8"
      >
        <div className="max-w-2xl text-center">
          {!code ? (
            <div className="space-y-4">
              <p className="text-2xl">Initializing TV...</p>
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : (
            <>
              <p className="text-2xl">Startup password</p>
              <p className="text-primary mt-2 text-7xl font-bold tracking-[0.2em]">
                {code}
              </p>
            </>
          )}
          {error && <p className="text-error mt-6 text-lg">{error}</p>}
        </div>
      </div>
    </>
  );
}
