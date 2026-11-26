import { $search } from "@/api/search";
import { formatApiErrorDescriptor } from "@/api/helpers/create-query-client";
import { useToast } from "@/components/toast";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { AdminError, AdminLoading } from "./AdminStates";

const REFRESH_DELAY_MS = 15_000;

export function TelegramChatsPage() {
  const { t } = useLingui();
  const { showSuccess, showError } = useToast();
  const [search, setSearch] = useState("");
  const [connectedOnly, setConnectedOnly] = useState(true);
  const {
    data: chats,
    isPending,
    error,
    refetch,
  } = $search.useQuery("get", "/admin/telegram/chats");
  const { mutate: refresh, isPending: isRefreshing } = $search.useMutation(
    "post",
    "/admin/telegram/refresh",
    {
      onSuccess: () => {
        showSuccess(
          msg`Asked the userbot to refresh; it takes up to 15 seconds`,
        );
        setTimeout(() => refetch(), REFRESH_DELAY_MS);
      },
      onError: (refreshError) =>
        showError(msg`Error`, formatApiErrorDescriptor(refreshError)),
    },
  );

  if (isPending) return <AdminLoading />;
  if (error || !chats) return <AdminError error={error} onRetry={refetch} />;

  const query = search.trim().toLocaleLowerCase();
  const shown = chats.filter(
    (chat) =>
      (!connectedOnly || chat.listened) &&
      (chat.title.toLocaleLowerCase().includes(query) ||
        chat.chat_id.includes(query)),
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="input min-w-0 flex-1"
          placeholder={t`Search by title or id`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button
          type="button"
          className="btn"
          disabled={isRefreshing}
          onClick={() => refresh({})}
        >
          <Trans>Refresh list</Trans>
        </button>
      </div>
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          className="toggle"
          checked={connectedOnly}
          onChange={(event) => setConnectedOnly(event.target.checked)}
        />
        <span>
          <Trans>Connected only</Trans>
        </span>
      </label>
      {shown.length === 0 && (
        <p className="text-base-content/75">
          <Trans>No chats.</Trans>
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {shown.map((chat) => (
          <li key={chat.chat_id}>
            <Link
              to="/search/admin/telegram/$chatId"
              params={{ chatId: chat.chat_id }}
              className="bg-base-200 hover:bg-base-300 flex flex-wrap items-center gap-2 rounded-xl p-3"
            >
              <span className="min-w-0 flex-1 font-medium break-words">
                {chat.title}
              </span>
              {chat.forum && (
                <span className="badge badge-soft">
                  <Trans>Forum</Trans>
                </span>
              )}
              {chat.bot_in && (
                <span className="badge badge-soft">
                  <Trans>Bot in chat</Trans>
                </span>
              )}
              {chat.reader === "search" && (
                <span className="badge badge-soft">
                  <Trans>Search only</Trans>
                </span>
              )}
              {chat.official && (
                <span className="badge badge-soft badge-primary">
                  <Trans>Official</Trans>
                </span>
              )}
              {chat.group_code !== "all" && (
                <span className="badge badge-soft">{chat.group_code}</span>
              )}
              <span
                className={
                  chat.listened ? "badge badge-success" : "badge badge-ghost"
                }
              >
                {chat.listened ? (
                  <Trans>Connected</Trans>
                ) : (
                  <Trans>Not connected</Trans>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link to="/search/admin/proposals" className="link w-fit">
        <Trans>Chats proposed from Moodle courses</Trans>
      </Link>
    </div>
  );
}
