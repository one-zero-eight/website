import { $accounts } from "@/api/accounts";
import { $schedule } from "@/api/schedule";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { AdminUserDetails } from "@/components/admin/AdminUserDetails.tsx";
import { buildEventGroupsByAlias } from "@/components/admin/PredefinedGroupBadge.tsx";
import { useImpersonation } from "@/components/admin/useImpersonation.ts";
import {
  getPredefinedGroupsForEmail,
  getViewUserEmail,
} from "@/components/admin/utils.ts";
import { useMemo } from "react";

export function AdminUserPage({ id }: { id: string }) {
  const {
    data: user,
    isPending,
    isError,
    error,
    refetch,
  } = $accounts.useQuery("get", "/users/by-id/{user_id}", {
    params: {
      path: {
        user_id: id,
      },
    },
  });

  const { impersonate, isImpersonating, canImpersonate } =
    useImpersonation(user);

  const { data: predefined, isPending: isPredefinedPending } =
    $schedule.useQuery("get", "/get-predefined-data");

  const { data: eventGroupsData } = $schedule.useQuery("get", "/event-groups/");
  const eventGroupsByAlias = useMemo(
    () => buildEventGroupsByAlias(eventGroupsData?.event_groups),
    [eventGroupsData],
  );

  const email = user ? getViewUserEmail(user) : undefined;
  const { userGroups, academicGroups } = getPredefinedGroupsForEmail(
    predefined,
    email,
  );

  if (isPending) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-40 w-full rounded-xl" />
        <div className="skeleton h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
        <div className="alert alert-error">
          <span>{formatApiErrorMessage(error)}</span>
        </div>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => refetch()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4">
      <AdminUserDetails
        user={user}
        userGroups={userGroups}
        academicGroups={academicGroups}
        isPredefinedPending={isPredefinedPending}
        eventGroupsByAlias={eventGroupsByAlias}
      />

      <div>
        <button
          type="button"
          className="btn btn-warning"
          disabled={!canImpersonate || isImpersonating}
          onClick={impersonate}
        >
          {isImpersonating ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            "Impersonate"
          )}
        </button>
      </div>
    </div>
  );
}
