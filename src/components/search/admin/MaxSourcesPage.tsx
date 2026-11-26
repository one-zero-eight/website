import { $search } from "@/api/search";
import { formatApiErrorDescriptor } from "@/api/helpers/create-query-client";
import { useToast } from "@/components/toast";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { AdminError, AdminLoading } from "./AdminStates";
import { useInvalidateAdmin } from "./admin-utils";
import {
  ACCESS_LABELS,
  CATALOG_LABELS,
  HISTORY_LABELS,
  labelOf,
  REASON_LABELS,
  UNKNOWN_REASON,
} from "./max-labels";

export function MaxSourcesPage() {
  const { i18n } = useLingui();
  const { showSuccess, showError } = useToast();
  const invalidateAdmin = useInvalidateAdmin();
  const {
    data: max,
    isPending,
    error,
    refetch,
  } = $search.useQuery("get", "/admin/max");
  const { mutate: refresh, isPending: isRefreshing } = $search.useMutation(
    "post",
    "/admin/max/refresh",
    {
      onSuccess: () => {
        invalidateAdmin();
        showSuccess(msg`Catalog refresh requested`);
      },
      onError: (refreshError) =>
        showError(msg`Error`, formatApiErrorDescriptor(refreshError)),
    },
  );

  if (isPending) return <AdminLoading />;
  if (error || !max) return <AdminError error={error} onRetry={refetch} />;

  const { account, sources } = max;
  const loginRequired = account.catalog_error === "login_required";
  const catalogStatus = labelOf(CATALOG_LABELS, account.catalog_status);
  const errorReason = account.catalog_error
    ? (labelOf(REASON_LABELS, account.catalog_error) ?? UNKNOWN_REASON)
    : undefined;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <div className="bg-base-200 flex flex-col gap-2 rounded-xl p-4">
        <div className="font-medium">
          {loginRequired ? (
            <Trans>
              Login required: run <code>catix-maxuserbot login</code> in the
              terminal
            </Trans>
          ) : account.online ? (
            <Trans>Account: online</Trans>
          ) : (
            <Trans>Account: offline</Trans>
          )}
        </div>
        <div>
          <Trans>Catalog:</Trans>{" "}
          {catalogStatus ? i18n._(catalogStatus) : <Trans>unknown</Trans>}
        </div>
        {errorReason && !loginRequired && (
          <div className="text-warning">{i18n._(errorReason)}</div>
        )}
        <button
          type="button"
          className="btn w-fit"
          disabled={isRefreshing}
          onClick={() => refresh({})}
        >
          <Trans>Refresh catalog</Trans>
        </button>
      </div>

      {sources.length === 0 && (
        <p className="text-base-content/75">
          <Trans>
            No MAX sources yet. Log in with the account, then refresh the
            catalog: the chats and channels it sees appear here.
          </Trans>
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {sources.map((source) => {
          const groupCode = source.group_code;
          const access = labelOf(ACCESS_LABELS, source.access);
          const history = labelOf(HISTORY_LABELS, source.history_status);
          return (
            <li key={source.chat_id}>
              <Link
                to="/search/admin/max/$chatId"
                params={{ chatId: source.chat_id }}
                className="bg-base-200 hover:bg-base-300 flex flex-col gap-1 rounded-xl p-3"
              >
                <span className="font-medium break-words">
                  {source.official && "🏛 "}
                  {source.title || <Trans>Untitled</Trans>}
                </span>
                <span className="text-base-content/75 text-sm">
                  <Trans>raw ID</Trans> <code>{source.raw_chat_id}</code> ·{" "}
                  {source.group_code === "all" ? (
                    <Trans>Everyone</Trans>
                  ) : (
                    <Trans>Study group {groupCode}</Trans>
                  )}{" "}
                  ·{" "}
                  {source.enabled ? <Trans>enabled</Trans> : <Trans>off</Trans>}
                </span>
                <span className="text-base-content/75 text-sm">
                  {access && i18n._(access)}
                  {history && <> · {i18n._(history)}</>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
