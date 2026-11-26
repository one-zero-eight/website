import { $search } from "@/api/search";
import { formatApiErrorDescriptor } from "@/api/helpers/create-query-client";
import { useToast } from "@/components/toast";
import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useState } from "react";
import { AdminError, AdminLoading } from "./AdminStates";
import { useInvalidateAdmin } from "./admin-utils";

export function AbusePage() {
  const {
    data: abuse,
    isPending,
    error,
    refetch,
  } = $search.useQuery("get", "/admin/abuse");

  if (isPending) return <AdminLoading />;
  if (error || !abuse) return <AdminError error={error} onRetry={refetch} />;

  const pauseAt = abuse.pause_at;
  const windowHours = abuse.window_hours;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4">
      <p className="text-base-content/75">
        <Trans>
          Pause threshold: {pauseAt} in {windowHours} h
        </Trans>
      </p>
      {abuse.users.length === 0 && (
        <p>
          <Trans>No offenders.</Trans>
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>
                <Trans>User</Trans>
              </th>
              <th>
                <Trans>Strikes</Trans>
              </th>
              <th>
                <Trans>Pauses</Trans>
              </th>
              <th>
                <Trans>Paused until</Trans>
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
            {abuse.users.map((user) => (
              <AbuseRow key={user.user_key} user={user} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AbuseRow({
  user,
}: {
  user: {
    user_key: string;
    strikes: number;
    pauses: number;
    paused_until: string | null;
  };
}) {
  const { showSuccess, showError, showConfirm } = useToast();
  const invalidateAdmin = useInvalidateAdmin();
  const [isOpen, setIsOpen] = useState(false);
  const { mutate: forgive, isPending } = $search.useMutation(
    "delete",
    "/admin/abuse/{user_key}",
    {
      onSuccess: () => {
        invalidateAdmin();
        showSuccess(msg`Forgiven`);
      },
      onError: (error) =>
        showError(msg`Error`, formatApiErrorDescriptor(error)),
    },
  );
  const userKey = user.user_key;

  async function handleForgive() {
    const confirmed = await showConfirm({
      title: msg`Forgive`,
      message: msg`Lift the pause of ${userKey} and forget their violations?`,
      confirmText: msg`Forgive`,
      type: "warning",
    });
    if (!confirmed) return;
    forgive({ params: { path: { user_key: userKey } } });
  }

  return (
    <>
      <tr>
        <td className="break-all">
          <button
            type="button"
            className="link"
            onClick={() => setIsOpen(!isOpen)}
          >
            {userKey}
          </button>
        </td>
        <td>{user.strikes}</td>
        <td>{user.pauses}</td>
        <td className="whitespace-nowrap">
          {user.paused_until
            ? new Date(user.paused_until).toLocaleString()
            : "—"}
        </td>
        <td>
          <button
            type="button"
            className="btn btn-sm"
            disabled={isPending}
            onClick={handleForgive}
          >
            <Trans>Forgive</Trans>
          </button>
        </td>
      </tr>
      {isOpen && (
        <tr>
          <td colSpan={5}>
            <AbuseEntries userKey={userKey} />
          </td>
        </tr>
      )}
    </>
  );
}

function AbuseEntries({ userKey }: { userKey: string }) {
  const {
    data: detail,
    isPending,
    error,
    refetch,
  } = $search.useQuery("get", "/admin/abuse/{user_key}", {
    params: { path: { user_key: userKey } },
  });

  if (isPending) return <div className="skeleton h-16 w-full" />;
  if (error || !detail) return <AdminError error={error} onRetry={refetch} />;

  return (
    <ul className="flex flex-col gap-1 text-sm">
      {detail.entries.map((entry) => (
        <li key={`${entry.at}-${entry.category}`}>
          <span className="text-base-content/75">
            {new Date(entry.at).toLocaleString()}
          </span>{" "}
          <span className="badge badge-soft">{entry.category}</span>{" "}
          {entry.preview}
        </li>
      ))}
    </ul>
  );
}
