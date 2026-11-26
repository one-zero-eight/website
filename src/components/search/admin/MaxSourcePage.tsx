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
  useInvalidateAdmin,
} from "./admin-utils";
import { GroupCodeInput } from "./GroupCodeInput";
import {
  ACCESS_LABELS,
  CATCHUP_LABELS,
  HISTORY_LABELS,
  labelOf,
  REASON_LABELS,
  REPEATABLE_HISTORY,
  UNKNOWN_REASON,
} from "./max-labels";
import { OfficialToggle } from "./OfficialToggle";

type Detail = searchTypes.SchemaMaxSourceDetail;

export function MaxSourcePage({ chatId }: { chatId: number }) {
  const {
    data: source,
    isPending,
    error,
    refetch,
  } = $search.useQuery("get", "/admin/max/{chat_id}", {
    params: { path: { chat_id: chatId } },
  });

  if (isPending) return <AdminLoading />;
  if (error || !source) return <AdminError error={error} onRetry={refetch} />;

  const formKey = JSON.stringify([
    source.config_version,
    source.generation,
    source.legacy_chat_id,
  ]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <MaxSourceInfo source={source} />
      <MaxSourceForm key={formKey} source={source} onStale={refetch} />
      <MaxSourceAdvanced source={source} onStale={refetch} />
    </div>
  );
}

function MaxSourceInfo({ source }: { source: Detail }) {
  const { i18n } = useLingui();
  const access = labelOf(ACCESS_LABELS, source.access);
  const history = labelOf(HISTORY_LABELS, source.history_status);
  const catchup = labelOf(CATCHUP_LABELS, source.catchup_status);
  const reason = source.last_error
    ? (labelOf(REASON_LABELS, source.last_error) ?? UNKNOWN_REASON)
    : undefined;

  return (
    <div className="bg-base-200 flex flex-col gap-1 rounded-xl p-4">
      <h2 className="text-2xl font-medium break-words">
        {source.title || <Trans>Untitled</Trans>}
      </h2>
      <div>
        <Trans>MAX raw ID:</Trans> <code>{source.raw_chat_id}</code>
      </div>
      <div>
        <Trans>ID in the database:</Trans> <code>{source.chat_id}</code>
      </div>
      <div>
        <Trans>Access:</Trans> {access && i18n._(access)}
      </div>
      <div>
        <Trans>History:</Trans> {history && i18n._(history)}
      </div>
      <div>
        <Trans>Catch-up:</Trans> {catchup && i18n._(catchup)}
      </div>
      {reason && <div className="text-warning">{i18n._(reason)}</div>}
      {source.legacy_chat_id && (
        <div>
          <Trans>Linked old source:</Trans> <code>{source.legacy_chat_id}</code>
        </div>
      )}
    </div>
  );
}

function MaxSourceForm({
  source,
  onStale,
}: {
  source: Detail;
  onStale: () => void;
}) {
  const { i18n } = useLingui();
  const { showSuccess, showError } = useToast();
  const invalidateAdmin = useInvalidateAdmin();
  const [audience, setAudience] = useState<"everyone" | "group">(
    source.group_code === "all" ? "everyone" : "group",
  );
  const [groupCode, setGroupCode] = useState(
    source.group_code === "all" ? "" : source.group_code,
  );
  const [enabled, setEnabled] = useState(source.enabled);
  const [legacyChatId, setLegacyChatId] = useState("");
  const { mutate, isPending } = $search.useMutation(
    "put",
    "/admin/max/{chat_id}",
    {
      onSuccess: () => {
        invalidateAdmin();
        showSuccess(msg`Saved`);
      },
      onError: (error) => {
        const detail = apiDetail(error);
        if (detail === "changed") {
          showError(msg`Settings or access changed; reloaded`);
          onStale();
          return;
        }
        if (detail === "source_unavailable") {
          showError(
            msg`No fresh access confirmation; catalog refresh requested. Try again after it.`,
          );
          return;
        }
        showError(msg`Error`, formatApiErrorDescriptor(error));
      },
    },
  );
  const isGroupValid =
    audience === "everyone" ||
    (GROUP_CODE_PATTERN.test(groupCode) && groupCode.toLowerCase() !== "all");
  const showLegacy =
    source.legacy_chat_id === null && source.legacy_candidates.length > 0;

  function handleSave() {
    mutate({
      params: { path: { chat_id: Number(source.chat_id) } },
      body: {
        group_code: audience === "everyone" ? "all" : groupCode,
        enabled,
        legacy_chat_id: legacyChatId || null,
        config_version: source.config_version,
        generation: source.generation,
      },
    });
  }

  return (
    <div className="bg-base-200 flex flex-col gap-4 rounded-xl p-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="font-medium">
          <Trans>Audience</Trans>
        </legend>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            className="radio"
            checked={audience === "everyone"}
            onChange={() => setAudience("everyone")}
          />
          <Trans>Everyone</Trans>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            className="radio"
            checked={audience === "group"}
            onChange={() => setAudience("group")}
          />
          <Trans>Study group</Trans>
        </label>
        {audience === "group" && (
          <GroupCodeInput value={groupCode} onChange={setGroupCode} />
        )}
      </fieldset>

      <label className="flex flex-col gap-1">
        <span className="font-medium">
          <Trans>Reading</Trans>
        </span>
        <select
          className="select"
          value={enabled ? "store" : "off"}
          onChange={(event) => setEnabled(event.target.value === "store")}
        >
          <option value="store">{i18n._(msg`Store`)}</option>
          <option value="off">{i18n._(msg`Off`)}</option>
        </select>
      </label>

      {showLegacy && (
        <label className="flex flex-col gap-1">
          <span className="font-medium">
            <Trans>Old source (archive)</Trans>
          </span>
          <select
            className="select"
            value={legacyChatId}
            onChange={(event) => setLegacyChatId(event.target.value)}
          >
            <option value="">{i18n._(msg`No old source`)}</option>
            {source.legacy_candidates.map((candidate) => {
              const messageCount = candidate.message_count;
              return (
                <option key={candidate.chat_id} value={candidate.chat_id}>
                  {candidate.title} · {candidate.raw_chat_id} ·{" "}
                  {i18n._(msg`${messageCount} messages`)}
                  {candidate.matches_raw_id &&
                    ` ${i18n._(msg`(matches raw ID)`)}`}
                </option>
              );
            })}
          </select>
          <span className="text-warning text-sm">
            <Trans>
              On save with reading on, the old archive is hidden from search;
              this link cannot be changed.
            </Trans>
          </span>
        </label>
      )}

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

function MaxSourceAdvanced({
  source,
  onStale,
}: {
  source: Detail;
  onStale: () => void;
}) {
  const { showSuccess, showError, showConfirm } = useToast();
  const invalidateAdmin = useInvalidateAdmin();
  const chatId = Number(source.chat_id);
  const count = source.message_count;
  const versions = {
    config_version: source.config_version,
    generation: source.generation,
  };
  const canRetryHistory =
    source.enabled &&
    source.access === "ready" &&
    REPEATABLE_HISTORY.includes(source.history_status);

  function handleError(error: unknown) {
    const detail = apiDetail(error);
    if (detail === "changed") {
      showError(msg`Settings or access changed; reloaded`);
      onStale();
      return;
    }
    if (detail === "source_unavailable") {
      showError(
        msg`No fresh access confirmation; catalog refresh requested. Try again after it.`,
      );
      return;
    }
    showError(msg`Error`, formatApiErrorDescriptor(error));
  }

  const { mutate: clearMessages, isPending: isClearing } = $search.useMutation(
    "delete",
    "/admin/max/{chat_id}/messages",
    {
      onSuccess: (result) => {
        invalidateAdmin();
        const deleted = result.deleted;
        showSuccess(msg`Messages deleted: ${deleted}`);
      },
      onError: handleError,
    },
  );
  const { mutate: retryHistory, isPending: isRetrying } = $search.useMutation(
    "post",
    "/admin/max/{chat_id}/history",
    {
      onSuccess: () => {
        invalidateAdmin();
        showSuccess(msg`History reload requested`);
      },
      onError: handleError,
    },
  );

  async function handleClear() {
    const confirmed = await showConfirm({
      title: msg`Clear messages`,
      message: msg`Delete all ${count} messages and their embeddings? This cannot be undone. The chat, its study group and its settings stay.`,
      confirmText: msg`Delete messages`,
      type: "error",
    });
    if (!confirmed) return;
    clearMessages({
      params: { path: { chat_id: chatId }, query: versions },
    });
  }

  return (
    <div className="bg-base-200 flex flex-col gap-4 rounded-xl p-4">
      <h3 className="text-lg font-medium">
        <Trans>Advanced</Trans>
      </h3>
      <OfficialToggle chatId={chatId} official={source.official} />
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
      {canRetryHistory && (
        <button
          type="button"
          className="btn btn-sm w-fit"
          disabled={isRetrying}
          onClick={() =>
            retryHistory({
              params: { path: { chat_id: chatId } },
              body: versions,
            })
          }
        >
          <Trans>Retry history</Trans>
        </button>
      )}
    </div>
  );
}
