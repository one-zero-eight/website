import { $search, searchTypes } from "@/api/search";
import { formatApiErrorDescriptor } from "@/api/helpers/create-query-client";
import { useToast } from "@/components/toast";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { useState } from "react";
import { AdminError, AdminLoading } from "./AdminStates";
import {
  apiDetail,
  GROUP_CODE_PATTERN,
  MODE_LABELS,
  Mode,
  useInvalidateAdmin,
} from "./admin-utils";
import { GroupCodeInput } from "./GroupCodeInput";
import { OfficialToggle } from "./OfficialToggle";

type Detail = searchTypes.SchemaTelegramChatDetail;
type Reader = "auto" | "userbot" | "bot";

export function TelegramChatPage({ chatId }: { chatId: number }) {
  const {
    data: chat,
    isPending,
    error,
    refetch,
  } = $search.useQuery("get", "/admin/telegram/chats/{chat_id}", {
    params: { path: { chat_id: chatId } },
  });

  if (isPending) return <AdminLoading />;
  if (error || !chat) return <AdminError error={error} onRetry={refetch} />;

  const formKey = JSON.stringify([
    chat.group_code,
    chat.default_mode,
    chat.reader,
    chat.topics.map((topic) => topic.mode),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <div>
        <h2 className="text-2xl font-medium break-words">{chat.title}</h2>
        <div className="text-base-content/75 flex flex-wrap items-center gap-2">
          {chat.username && <span>@{chat.username}</span>}
          <code>{chat.chat_id}</code>
        </div>
      </div>
      <TelegramChatForm key={formKey} chat={chat} />
      <TelegramChatAdvanced chat={chat} />
    </div>
  );
}

function TelegramChatForm({ chat }: { chat: Detail }) {
  const { i18n } = useLingui();
  const { showSuccess, showError } = useToast();
  const invalidateAdmin = useInvalidateAdmin();
  const [groupCode, setGroupCode] = useState(chat.group_code);
  const [defaultMode, setDefaultMode] = useState<Mode>(chat.default_mode);
  const [topicModes, setTopicModes] = useState<Record<number, Mode>>(
    Object.fromEntries(
      chat.topics.map((topic) => [topic.topic_id, topic.mode]),
    ),
  );
  // A stored "search" reader is shown as Auto, like the old /listen did
  const [reader, setReader] = useState<Reader>(
    chat.reader === "search" ? "auto" : chat.reader,
  );
  const { mutate, isPending } = $search.useMutation(
    "put",
    "/admin/telegram/chats/{chat_id}",
    {
      onSuccess: () => {
        invalidateAdmin();
        showSuccess(msg`Saved`);
      },
      onError: (error) => {
        const detail = apiDetail(error);
        showError(msg`Error`, detail ?? formatApiErrorDescriptor(error));
      },
    },
  );
  const chatId = Number(chat.chat_id);
  const modes = (Object.keys(MODE_LABELS) as Mode[]).filter(
    (mode) => mode !== "search" || !chat.bot_only,
  );
  const isGroupValid = GROUP_CODE_PATTERN.test(groupCode);

  function handleSave() {
    const changedTopics = Object.fromEntries(
      Object.entries(topicModes).filter(([, mode]) => mode !== defaultMode),
    );
    mutate({
      params: { path: { chat_id: chatId } },
      body: {
        group_code: groupCode,
        default_mode: defaultMode,
        topic_modes: changedTopics,
        reader,
      },
    });
  }

  return (
    <div className="bg-base-200 flex flex-col gap-4 rounded-xl p-4">
      <label className="flex flex-col gap-1">
        <span className="font-medium">
          <Trans>Study group</Trans>
        </span>
        <GroupCodeInput value={groupCode} onChange={setGroupCode} />
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-medium">
          {chat.forum ? (
            <Trans>Other and new topics</Trans>
          ) : (
            <Trans>Whole chat</Trans>
          )}
        </span>
        <ModeSelect
          value={defaultMode}
          modes={modes}
          onChange={setDefaultMode}
        />
      </label>

      {chat.forum && (
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>
                  <Trans>Topic id</Trans>
                </th>
                <th>
                  <Trans>Topic</Trans>
                </th>
                <th>
                  <Trans>Mode</Trans>
                </th>
              </tr>
            </thead>
            <tbody>
              {chat.topics.map((topic) => (
                <tr key={topic.topic_id}>
                  <td>
                    <code>{topic.topic_id}</code>
                  </td>
                  <td className="break-words">{topic.title}</td>
                  <td>
                    <ModeSelect
                      value={topicModes[topic.topic_id] ?? defaultMode}
                      modes={modes}
                      onChange={(mode) =>
                        setTopicModes({ ...topicModes, [topic.topic_id]: mode })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <label className="flex flex-col gap-1">
        <span className="font-medium">
          <Trans>Who reads the messages</Trans>
        </span>
        <select
          className="select"
          value={reader}
          onChange={(event) => setReader(event.target.value as Reader)}
        >
          <option value="auto">{i18n._(msg`Auto`)}</option>
          {!chat.bot_only && <option value="userbot">userbot</option>}
          {(chat.bot_in || chat.bot_only) && (
            <option value="bot">{i18n._(msg`Bot`)}</option>
          )}
        </select>
      </label>

      <p className="text-base-content/75 text-sm">
        <Trans>
          Off: new messages are not stored and Telegram search is off. Stored
          messages stay until you clear the history.
        </Trans>
      </p>
      <button
        type="button"
        className="btn btn-primary w-fit"
        disabled={isPending || !isGroupValid}
        onClick={handleSave}
      >
        {isPending && <span className="loading loading-spinner loading-sm" />}
        <Trans>Save</Trans>
      </button>
    </div>
  );
}

function ModeSelect({
  value,
  modes,
  onChange,
}: {
  value: Mode;
  modes: Mode[];
  onChange: (mode: Mode) => void;
}) {
  const { i18n } = useLingui();
  return (
    <select
      className="select"
      value={value}
      onChange={(event) => onChange(event.target.value as Mode)}
    >
      {modes.map((mode) => (
        <option key={mode} value={mode}>
          {i18n._(MODE_LABELS[mode])}
        </option>
      ))}
    </select>
  );
}

function TelegramChatAdvanced({ chat }: { chat: Detail }) {
  const { showSuccess, showError, showConfirm } = useToast();
  const invalidateAdmin = useInvalidateAdmin();
  const chatId = Number(chat.chat_id);
  const count = chat.message_count;
  const { mutate: clearMessages, isPending: isClearing } = $search.useMutation(
    "delete",
    "/admin/telegram/chats/{chat_id}/messages",
    {
      onSuccess: (result) => {
        invalidateAdmin();
        const deleted = result.deleted;
        showSuccess(msg`Messages deleted: ${deleted}`);
      },
      onError: (error) =>
        showError(msg`Error`, formatApiErrorDescriptor(error)),
    },
  );
  const { mutate: disconnect, isPending: isDisconnecting } =
    $search.useMutation("delete", "/admin/telegram/chats/{chat_id}/listen", {
      onSuccess: () => {
        invalidateAdmin();
        showSuccess(msg`Disconnected`);
      },
      onError: (error) => {
        const detail = apiDetail(error);
        showError(msg`Error`, detail ?? formatApiErrorDescriptor(error));
      },
    });

  async function handleClear() {
    const confirmed = await showConfirm({
      title: msg`Clear messages`,
      message: msg`Delete all ${count} messages and their embeddings? This cannot be undone. The chat, its study group and its settings stay.`,
      confirmText: msg`Delete messages`,
      type: "error",
    });
    if (!confirmed) return;
    clearMessages({ params: { path: { chat_id: chatId } } });
  }

  async function handleDisconnect() {
    const confirmed = await showConfirm({
      title: msg`Disconnect`,
      message: msg`Disconnect this chat? Messages stay in the database.`,
      confirmText: msg`Disconnect`,
      type: "warning",
    });
    if (!confirmed) return;
    disconnect({ params: { path: { chat_id: chatId } } });
  }

  return (
    <div className="bg-base-200 flex flex-col gap-4 rounded-xl p-4">
      <h3 className="text-lg font-medium">
        <Trans>Advanced</Trans>
      </h3>
      <OfficialToggle chatId={chatId} official={chat.official} />
      <div className="flex flex-wrap items-center gap-3">
        <span>
          <Trans>Messages stored: {count}</Trans>
        </span>
        <button
          type="button"
          className="btn btn-error btn-sm"
          disabled={isClearing}
          onClick={handleClear}
        >
          <Trans>Clear messages</Trans>
        </button>
      </div>
      {chat.listened && (
        <button
          type="button"
          className="btn btn-sm w-fit"
          disabled={isDisconnecting}
          onClick={handleDisconnect}
        >
          <Trans>Disconnect</Trans>
        </button>
      )}
    </div>
  );
}
