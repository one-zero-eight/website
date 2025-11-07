import { useMe } from "@/api/accounts/user.ts";
import { AuthWall } from "@/components/common/AuthWall.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Helmet } from "@dr.pogodin/react-helmet";

export type FormSubmitParams = {
  form: string | undefined;
};

export const Route = createFileRoute("/forms/submit")({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): FormSubmitParams => {
    return {
      form: typeof search.form === "string" ? search.form : undefined,
    };
  },
});

function RouteComponent() {
  const { form } = Route.useSearch();
  const { me } = useMe();

  useEffect(() => {
    if (!form || !me) return;
    const email = me.innopolis_sso?.email;
    if (!email) return;
    const telegram = me.telegram?.username;
    const fio = me.innopolis_sso?.name;

    // Redirect after 1 second
    const redirectTimeout = setTimeout(() => {
      try {
        const url = new URL(form);
        url.searchParams.append("email", email);
        if (telegram) url.searchParams.append("telegram", "@" + telegram);
        if (fio) url.searchParams.append("fio", fio);
        window.location.replace(url.toString());
      } catch {
        // Invalid URL, do nothing
      }
    }, 1000);

    return () => {
      clearTimeout(redirectTimeout);
    };
  }, [form, me]);

  if (!form) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
        <h2 className="mb-2 text-2xl font-bold">Invalid Link</h2>
        <p className="text-base-content/70 text-lg">
          The form parameter is missing or invalid.
        </p>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="flex h-full items-center justify-center">
        <AuthWall />
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <Helmet>
        <title>Redirecting to the form</title>
      </Helmet>
      <div className="mb-6">
        <span className="icon-[mdi--loading] text-primary animate-spin text-6xl" />
      </div>
      <h2 className="mb-2 text-2xl font-bold">Redirecting...</h2>
      <p className="text-base-content/70 mb-4 text-lg">
        Just a moment, we're redirecting you to the form...
      </p>
    </div>
  );
}
