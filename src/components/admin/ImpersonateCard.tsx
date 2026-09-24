import { accountsTypes } from "@/api/accounts";
import { UserSearch } from "@/components/admin/UserSearch.tsx";
import { useImpersonation } from "@/components/admin/useImpersonation.ts";
import { useState } from "react";

export function ImpersonateCard() {
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
      <h2 className="text-xl font-medium">Impersonate</h2>
      {impersonatingUser ? (
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <p className="text-warning min-w-0 truncate text-sm">
            Currently impersonating {impersonatingUser.name}
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
              "Depersonate"
            )}
          </button>
        </div>
      ) : (
        <>
          <UserSearch
            placeholder="Name or email..."
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
                "Impersonate"
              )}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
