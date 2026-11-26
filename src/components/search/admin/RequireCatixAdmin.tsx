import { $search } from "@/api/search";
import { RequireAuth } from "@/components/common/AuthWall.tsx";
import { AdminError, AdminLoading } from "./AdminStates";
import { Trans } from "@lingui/react/macro";
import { PropsWithChildren } from "react";

// Who is a cAtIx admin is decided by the cAtIx API only
export function RequireCatixAdmin({ children }: PropsWithChildren) {
  return (
    <RequireAuth>
      <AdminGate>{children}</AdminGate>
    </RequireAuth>
  );
}

function AdminGate({ children }: PropsWithChildren) {
  const {
    data: me,
    isPending,
    error,
    refetch,
  } = $search.useQuery("get", "/admin/me");

  if (isPending) return <AdminLoading />;
  if (error || !me) return <AdminError error={error} onRetry={refetch} />;
  if (!me.is_admin) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 p-4">
        <h2 className="text-2xl font-medium">
          <Trans>Access denied</Trans>
        </h2>
        <p>
          <Trans>Send your InNoHassle id to a cAtIx admin:</Trans>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="bg-base-200 rounded px-2 py-1">
            {me.innohassle_id}
          </code>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => navigator.clipboard.writeText(me.innohassle_id)}
          >
            <Trans>Copy</Trans>
          </button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
