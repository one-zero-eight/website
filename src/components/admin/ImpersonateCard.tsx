import { accountsTypes } from "@/api/accounts";
import { Trans, useLingui } from "@lingui/react/macro";
import { UserSearch } from "@/components/admin/UserSearch.tsx";
import { useImpersonation } from "@/components/admin/useImpersonation.ts";
import { useState } from "react";

export function ImpersonateCard() {
  const { t } = useLingui();
  const [selectedUser, setSelectedUser] =
    useState<accountsTypes.SchemaViewUser | null>(null);
  const {
    impersonate,
    depersonate,
    isImpersonating,
    isDepersonating,
    impersonatingUser,
    canImpersonate,
  } = useImpersonation(selectedUser);

  return (
    <section className="bg-base-200 rounded-box flex min-w-0 flex-col gap-4 p-4">
      <h2 className="text-xl font-medium">
        <Trans>Impersonate</Trans>
      </h2>
      {impersonatingUser ? (
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <p className="text-warning min-w-0 truncate text-sm">
            <Trans>Currently impersonating {impersonatingUser.name}</Trans>
          </p>
          <button
            type="button"
            className="btn btn-warning"
            disabled={isImpersonating || isDepersonating}
            onClick={depersonate}
          >
            {isDepersonating ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              <Trans>Depersonate</Trans>
            )}
          </button>
        </div>
      ) : (
        <>
          <UserSearch
            placeholder={t`Name or email...`}
            onSelect={setSelectedUser}
            selectedUserId={selectedUser?.id}
          />
          <div className="flex justify-end">
            <button
              type="button"
              className="btn btn-warning"
              disabled={!canImpersonate || isImpersonating || isDepersonating}
              onClick={impersonate}
            >
              {isImpersonating ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <Trans>Impersonate</Trans>
              )}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
