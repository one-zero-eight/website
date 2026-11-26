import { $search } from "@/api/search";
import { formatApiErrorDescriptor } from "@/api/helpers/create-query-client";
import { useToast } from "@/components/toast";
import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useState } from "react";
import { AdminError, AdminLoading } from "./AdminStates";
import { apiDetail, useInvalidateAdmin } from "./admin-utils";

export function CatixAdminsPage() {
  const { showSuccess, showError, showConfirm } = useToast();
  const invalidateAdmin = useInvalidateAdmin();
  const [newId, setNewId] = useState("");
  const { data: me } = $search.useQuery("get", "/admin/me");
  const {
    data: admins,
    isPending,
    error,
    refetch,
  } = $search.useQuery("get", "/admin/admins");
  const { mutate: addAdmin, isPending: isAdding } = $search.useMutation(
    "post",
    "/admin/admins",
    {
      onSuccess: () => {
        invalidateAdmin();
        setNewId("");
        showSuccess(msg`Admin added`);
      },
      onError: (addError) => {
        if (apiDetail(addError) === "already_admin") {
          showError(msg`Already an admin`);
          return;
        }
        showError(msg`Error`, formatApiErrorDescriptor(addError));
      },
    },
  );
  const { mutate: removeAdmin, isPending: isRemoving } = $search.useMutation(
    "delete",
    "/admin/admins/{innohassle_id}",
    {
      onSuccess: () => {
        invalidateAdmin();
        showSuccess(msg`Admin removed`);
      },
      onError: (removeError) =>
        showError(msg`Error`, formatApiErrorDescriptor(removeError)),
    },
  );

  if (isPending) return <AdminLoading />;
  if (error || !admins) return <AdminError error={error} onRetry={refetch} />;

  async function handleRemove(innohassleId: string) {
    const confirmed = await showConfirm({
      title: msg`Remove admin`,
      message: msg`Remove ${innohassleId} from the cAtIx admins?`,
      confirmText: msg`Remove`,
      type: "warning",
    });
    if (!confirmed) return;
    removeAdmin({ params: { path: { innohassle_id: innohassleId } } });
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <ul className="flex flex-col gap-2">
        {admins.map((admin) => (
          <li
            key={admin.innohassle_id}
            className="bg-base-200 flex flex-wrap items-center gap-2 rounded-xl p-3"
          >
            <div className="flex min-w-0 flex-1 flex-col">
              <code className="break-all">{admin.innohassle_id}</code>
              <span className="text-base-content/75 text-sm">
                {admin.email ?? "—"} ·{" "}
                {admin.telegram_id ?? (
                  <Trans>
                    Telegram unknown until they open this panel once
                  </Trans>
                )}
              </span>
            </div>
            {admin.fixed && (
              <span className="badge badge-soft">
                <Trans>Fixed</Trans>
              </span>
            )}
            {!admin.fixed && admin.innohassle_id !== me?.innohassle_id && (
              <button
                type="button"
                className="btn btn-sm"
                disabled={isRemoving}
                onClick={() => handleRemove(admin.innohassle_id)}
              >
                <Trans>Remove</Trans>
              </button>
            )}
          </li>
        ))}
      </ul>
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          addAdmin({ body: { innohassle_id: newId } });
        }}
      >
        <input
          className="input min-w-0 flex-1"
          pattern="[0-9a-f]{24}"
          required
          value={newId}
          onChange={(event) =>
            setNewId(event.target.value.trim().toLowerCase())
          }
        />
        <button type="submit" className="btn btn-primary" disabled={isAdding}>
          <Trans>Add admin</Trans>
        </button>
      </form>
    </div>
  );
}
