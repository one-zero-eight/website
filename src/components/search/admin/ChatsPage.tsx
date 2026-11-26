import { $search, searchTypes } from "@/api/search";
import { formatApiErrorDescriptor } from "@/api/helpers/create-query-client";
import { useToast } from "@/components/toast";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
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

const REFRESH_DELAY_MS = 15_000;

type Platform = "all" | "telegram" | "max";
type Chat = searchTypes.SchemaChatListItem;

// Telegram dialogs and MAX sources in one list: the card of a chat is the one of its platform
export function ChatsPage() {
  const { t } = useLingui();
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState<Platform>("all");
  const [connectedOnly, setConnectedOnly] = useState(true);
  const { data, isPending, error, refetch } = $search.useQuery(
    "get",
    "/admin/chats",
  );

  if (isPending) return <AdminLoading />;
  if (error || !data) return <AdminError error={error} onRetry={refetch} />;

  const query = search.trim().toLocaleLowerCase();
  const shown = data.chats.filter(
    (chat) =>
      (platform === "all" || chat.platform === platform) &&
      (!connectedOnly || chat.connected) &&
      (chat.title.toLocaleLowerCase().includes(query) ||
        chat.chat_id.includes(query) ||
        (chat.raw_chat_id ?? "").includes(query)),
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <ListRefreshButtons account={data.max_account} onTelegramDone={refetch} />
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="input min-w-0 flex-1"
          placeholder={t`Search by title or id`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className="select w-auto"
          value={platform}
          onChange={(event) => setPlatform(event.target.value as Platform)}
        >
          <option value="all">{t`All platforms`}</option>
          <option value="telegram">Telegram</option>
          <option value="max">MAX</option>
        </select>
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
          {data.chats.some((chat) => chat.platform === "max") ? (
            <Trans>No chats.</Trans>
          ) : (
            <Trans>
              No chats. For MAX, log in with the account, then refresh the
              catalog: the chats and channels it sees appear here.
            </Trans>
          )}
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {shown.map((chat) => (
          <li key={`${chat.platform}-${chat.chat_id}`}>
            <ChatRow chat={chat} />
          </li>
        ))}
      </ul>
      <Link to="/search/admin/proposals" className="link w-fit">
        <Trans>Chats proposed from Moodle courses</Trans>
      </Link>
    </div>
  );
}

function ChatRow({ chat }: { chat: Chat }) {
  const { i18n } = useLingui();
  const groupCode = chat.group_code;
  const access = labelOf(ACCESS_LABELS, chat.access);
  const history = labelOf(HISTORY_LABELS, chat.history_status);
  const badges = (
    <>
      <span className="badge badge-outline">
        {chat.platform === "telegram" ? "Telegram" : "MAX"}
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
      {chat.search_only && (
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
        <span className="badge badge-soft">{groupCode}</span>
      )}
      <span
        className={chat.connected ? "badge badge-success" : "badge badge-ghost"}
      >
        {chat.connected ? (
          <Trans>Connected</Trans>
        ) : (
          <Trans>Not connected</Trans>
        )}
      </span>
    </>
  );
  const body = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 font-medium break-words">
          {chat.title || <Trans>Untitled</Trans>}
        </span>
        {badges}
      </div>
      {chat.platform === "max" && (
        <span className="text-base-content/75 text-sm">
          <Trans>raw ID</Trans> <code>{chat.raw_chat_id}</code>
          {access && <> · {i18n._(access)}</>}
          {history && <> · {i18n._(history)}</>}
        </span>
      )}
    </>
  );
  const className =
    "bg-base-200 hover:bg-base-300 flex flex-col gap-1 rounded-xl p-3";

  if (chat.platform === "telegram") {
    return (
      <Link
        to="/search/admin/telegram/$chatId"
        params={{ chatId: chat.chat_id }}
        className={className}
      >
        {body}
      </Link>
    );
  }
  return (
    <Link
      to="/search/admin/max/$chatId"
      params={{ chatId: chat.chat_id }}
      className={className}
    >
      {body}
    </Link>
  );
}

// The Telegram list comes from the userbot and the MAX catalog from the MAX worker: each is refreshed on its own
function ListRefreshButtons({
  account,
  onTelegramDone,
}: {
  account: searchTypes.SchemaMaxAccountView;
  onTelegramDone: () => void;
}) {
  const { i18n } = useLingui();
  const { showSuccess, showError } = useToast();
  const invalidateAdmin = useInvalidateAdmin();
  const { mutate: refreshTelegram, isPending: isRefreshingTelegram } =
    $search.useMutation("post", "/admin/telegram/refresh", {
      onSuccess: () => {
        showSuccess(
          msg`Asked the userbot to refresh; it takes up to 15 seconds`,
        );
        setTimeout(onTelegramDone, REFRESH_DELAY_MS);
      },
      onError: (error) =>
        showError(msg`Error`, formatApiErrorDescriptor(error)),
    });
  const { mutate: refreshMax, isPending: isRefreshingMax } =
    $search.useMutation("post", "/admin/max/refresh", {
      onSuccess: () => {
        invalidateAdmin();
        showSuccess(msg`Catalog refresh requested`);
      },
      onError: (error) =>
        showError(msg`Error`, formatApiErrorDescriptor(error)),
    });
  const loginRequired = account.catalog_error === "login_required";
  const catalogStatus = labelOf(CATALOG_LABELS, account.catalog_status);
  const errorReason = account.catalog_error
    ? (labelOf(REASON_LABELS, account.catalog_error) ?? UNKNOWN_REASON)
    : undefined;

  return (
    <div className="bg-base-200 flex flex-col gap-2 rounded-xl p-4">
      <div className="font-medium">
        {loginRequired ? (
          <Trans>
            MAX: login required, run <code>catix-maxuserbot login</code> in the
            terminal
          </Trans>
        ) : account.online ? (
          <Trans>MAX account: online</Trans>
        ) : (
          <Trans>MAX account: offline</Trans>
        )}
      </div>
      <div>
        <Trans>Catalog:</Trans>{" "}
        {catalogStatus ? i18n._(catalogStatus) : <Trans>unknown</Trans>}
      </div>
      {errorReason && !loginRequired && (
        <div className="text-warning">{i18n._(errorReason)}</div>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-sm"
          disabled={isRefreshingTelegram}
          onClick={() => refreshTelegram({})}
        >
          <Trans>Refresh Telegram list</Trans>
        </button>
        <button
          type="button"
          className="btn btn-sm"
          disabled={isRefreshingMax}
          onClick={() => refreshMax({})}
        >
          <Trans>Refresh MAX catalog</Trans>
        </button>
      </div>
    </div>
  );
}
