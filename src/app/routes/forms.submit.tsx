import { $forms } from "@/api/forms";
import { useMe } from "@/api/accounts/user.ts";
import { AuthWall } from "@/components/common/AuthWall.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export type FormSubmitParams = {
  slug: string | undefined;
  /** @deprecated Prefer `slug`; legacy full form URL — scheduled for removal */
  form: string | undefined;
};

function buildIframeSrc(resolvedUrl: string): string {
  const url = new URL(resolvedUrl);
  url.searchParams.set("iframe", "1");
  return url.toString();
}

export const Route = createFileRoute("/forms/submit")({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): FormSubmitParams => {
    return {
      slug: typeof search.slug === "string" ? search.slug : undefined,
      // DEPRECATED: Remove once old shared links using `form=` are no longer used.
      form: typeof search.form === "string" ? search.form : undefined,
    };
  },
});

function RouteComponent() {
  const { slug, form } = Route.useSearch();
  const { me } = useMe();

  const hasSlug = slug != null && slug.trim() !== "";

  /** DEPRECATED (remove with legacy redirect below): Old links passed raw Yandex URL via `form=` — use `slug=` instead. */
  const isLegacyFormQuery =
    !hasSlug && typeof form === "string" && form.trim().length > 0;

  // DEPRECATED: Full-page redirect for legacy `form=` URLs (same behavior as pre-shortlink).
  // Remove after deprecation window when traffic drops to zero.
  useEffect(() => {
    if (!isLegacyFormQuery || !form || !me) return;
    const email = me.innopolis_sso?.email;
    if (!email) return;
    const telegram = me.telegram?.username;
    const fio = me.innopolis_sso?.name;

    const redirectTimeout = setTimeout(() => {
      try {
        const url = new URL(form);
        url.searchParams.append("email", email);
        if (telegram) url.searchParams.append("telegram", "@" + telegram);
        if (fio) url.searchParams.append("fio", fio);
        window.location.replace(url.toString());
      } catch {
        // Invalid URL — deprecated path had no recovery UI
      }
    }, 1000);

    return () => {
      clearTimeout(redirectTimeout);
    };
  }, [isLegacyFormQuery, form, me]);

  const { data, isPending, isError, refetch } = $forms.useQuery(
    "get",
    "/links/{slug}",
    { params: { path: { slug: slug?.trim() ?? "" } } },
    { enabled: Boolean(hasSlug && me) },
  );

  const iframeSrc =
    data?.url != null && data.url.trim() !== ""
      ? buildIframeSrc(data.url)
      : undefined;

  if (isLegacyFormQuery) {
    if (!me) {
      return (
        <div className="flex h-full items-center justify-center">
          <Helmet>
            <title>Redirecting to the form</title>
            {/* Do not scan this page */}
            <meta name="robots" content="noindex, follow" />
          </Helmet>

          <AuthWall />
        </div>
      );
    }

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
        <Helmet>
          <title>Redirecting to the form</title>
          {/* Do not scan this page */}
          <meta name="robots" content="noindex, follow" />
        </Helmet>

        {/* DEPRECATED UI — paired with legacy redirect effect above; delete together */}
        <div className="mb-6">
          <span className="text-primary loading loading-spinner loading-6xl" />
        </div>
        <h2 className="mb-2 text-2xl font-bold">Redirecting...</h2>
        <p className="text-base-content/70 mb-4 text-lg">
          Just a moment, we're redirecting you to the form...
        </p>
      </div>
    );
  }

  if (!hasSlug) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
        <Helmet>
          <title>Form</title>
          {/* Do not scan this page */}
          <meta name="robots" content="noindex, follow" />
        </Helmet>

        <h2 className="mb-2 text-2xl font-bold">Invalid Link</h2>
        <p className="text-base-content/70 text-lg">
          The slug parameter is missing or invalid.
        </p>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="flex h-full items-center justify-center">
        <Helmet>
          <title>Form</title>
          {/* Do not scan this page */}
          <meta name="robots" content="noindex, follow" />
        </Helmet>

        <AuthWall />
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="flex min-h-[60vh] flex-col gap-4 p-4">
        <Helmet>
          <title>Form</title>
          {/* Do not scan this page */}
          <meta name="robots" content="noindex, follow" />
        </Helmet>
        <div className="skeleton rounded-box min-h-[min(80vh,720px)] w-full" />
      </div>
    );
  }

  if (isError || !iframeSrc) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <Helmet>
          <title>Form</title>
          {/* Do not scan this page */}
          <meta name="robots" content="noindex, follow" />
        </Helmet>

        <h2 className="mb-2 text-2xl font-bold">Could not load form</h2>
        <p className="text-base-content/70 mb-4 max-w-md text-lg">
          This link may be invalid, expired, or you may not have access.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            void refetch();
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="px-4">
      <Helmet>
        <title>Form</title>
        {/* Do not scan this page */}
        <meta name="robots" content="noindex, follow" />
        <script src="https://forms.yandex.ru/_static/embed.js" defer></script>
        <style lang="css">
          {`html {
            background: white;
          }`}
        </style>
      </Helmet>
      <iframe
        title="Yandex Form"
        src={iframeSrc}
        className="mx-auto my-4 w-full max-w-[650px] focus-visible:outline-none md:my-12 xl:my-24"
      ></iframe>
    </div>
  );
}
