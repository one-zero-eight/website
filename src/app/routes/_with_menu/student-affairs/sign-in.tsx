import { useMe } from "@/api/accounts/user.ts";
import { $studentAffairs } from "@/api/student-affairs";
import { AuthWall } from "@/components/common/AuthWall.tsx";
import { Helmet } from "@dr.pogodin/react-helmet";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export type FormSubmitParams = {
  return_to?: string | undefined;
};

export const Route = createFileRoute("/_with_menu/student-affairs/sign-in")({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): FormSubmitParams => {
    return {
      return_to:
        typeof search.return_to === "string" ? search.return_to : undefined,
    };
  },
});

function RouteComponent() {
  const { return_to } = Route.useSearch();
  const { me } = useMe();
  const { data } = $studentAffairs.useQuery("post", "/sso/generate-link", {
    params: { query: { return_to } },
  });

  useEffect(() => {
    if (!data) return;

    // Redirect after 1 second
    const redirectTimeout = setTimeout(() => {
      window.location.replace(data);
    }, 1000);

    return () => {
      clearTimeout(redirectTimeout);
    };
  }, [data]);

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
        <title>Redirecting to the Student Affairs Helpdesk</title>
      </Helmet>

      <div className="mb-6">
        <span className="text-primary loading loading-spinner loading-6xl" />
      </div>
      <h2 className="mb-2 text-2xl font-bold">Redirecting...</h2>
      <p className="text-base-content/70 mb-4 text-lg">
        Just a moment, we're redirecting you to the helpdesk...
      </p>
    </div>
  );
}
