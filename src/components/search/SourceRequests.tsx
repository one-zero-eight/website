import { isApiHttpError } from "@/api/helpers/create-query-client";
import { $search, type searchTypes } from "@/api/search";
import { RequireAuth } from "@/components/common/AuthWall";
import { Modal } from "@/components/common/Modal";
import { Trans, useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

const EMPTY_VERIFIED_GROUPS: string[] = [];

function normalizeTelegramLink(value: string): string | undefined {
  const link = value.trim().replace(/^t\.me\//, "https://t.me/");
  if (/^https:\/\/t\.me\/(\+|joinchat\/)[A-Za-z0-9_-]{16,128}$/.test(link)) {
    return link;
  }
  const username = /^https:\/\/t\.me\/([A-Za-z][A-Za-z0-9_]{3,30}[A-Za-z0-9])$/
    .exec(link)?.[1]
    .toLowerCase();
  if (
    !username ||
    /^(joinchat|share|proxy|socks|login|confirmphone|setlanguage|addstickers|addemoji|addtheme|bg|invoice|giftcode|addlist|boost|contact)$/.test(
      username,
    )
  ) {
    return undefined;
  }
  return `https://t.me/${username}`;
}

function normalizeChatLink(value: string): string | undefined {
  const link = value.trim();
  const maxPath =
    /^(?:https:\/\/)?max\.ru\/(join\/[A-Za-z0-9_-]{1,128}|[A-Za-z0-9_-]{1,128})$/.exec(
      link,
    )?.[1];
  if (maxPath && maxPath !== "join") return `https://max.ru/${maxPath}`;
  return normalizeTelegramLink(link);
}

export function SourceRequests() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="btn btn-ghost btn-sm mt-1"
        onClick={() => setOpen(true)}
      >
        <span className="icon-[material-symbols--add-circle-outline] text-lg" />
        <Trans>Propose a chat</Trans>
      </button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={<Trans>Chat source requests</Trans>}
        containerClassName="max-h-[85dvh] overflow-y-auto"
      >
        {open && (
          <RequireAuth>
            <SourceRequestsContent />
          </RequireAuth>
        )}
      </Modal>
    </>
  );
}

function SourceRequestsContent() {
  const { i18n, t } = useLingui();
  const queryClient = useQueryClient();
  const groupSelectionInitialized = useRef(false);
  const [inviteLink, setInviteLink] = useState("");
  const [audience, setAudience] = useState<"own" | "all">("own");
  const [selectedGroup, setSelectedGroup] = useState<string | undefined>();
  const [comment, setComment] = useState("");
  const [consent, setConsent] = useState(false);
  const requests = $search.useQuery("get", "/sources/requests", undefined, {
    retry: false,
    refetchInterval: 15_000,
    refetchOnMount: "always",
  });
  const verifiedGroups = requests.isSuccess
    ? requests.data.verified_groups
    : EMPTY_VERIFIED_GROUPS;
  useEffect(() => {
    if (!requests.isSuccess || groupSelectionInitialized.current) return;
    groupSelectionInitialized.current = true;
    if (verifiedGroups.length === 1) setSelectedGroup(verifiedGroups[0]);
  }, [requests.isSuccess, verifiedGroups]);
  useEffect(() => {
    if (
      audience === "own" &&
      selectedGroup &&
      !verifiedGroups.includes(selectedGroup)
    ) {
      setConsent(false);
    }
  }, [audience, selectedGroup, verifiedGroups]);
  const mutation = $search.useMutation("post", "/sources/requests", {
    retry: false,
    onSuccess: () => {
      setInviteLink("");
      setComment("");
      setConsent(false);
      void queryClient.invalidateQueries({
        queryKey: $search.queryOptions("get", "/sources/requests").queryKey,
      });
    },
  });
  const normalizedInvite = normalizeChatLink(inviteLink);
  const validInvite = normalizedInvite !== undefined;
  const validGroup =
    audience === "all" ||
    (requests.isSuccess &&
      selectedGroup !== undefined &&
      verifiedGroups.includes(selectedGroup));
  const groupCode = audience === "all" ? "all" : (selectedGroup ?? "");
  const canSubmit =
    consent &&
    validInvite &&
    validGroup &&
    comment.length <= 2000 &&
    !mutation.isPending;

  function handleSubmit() {
    if (!canSubmit || !normalizedInvite) return;
    mutation.mutate({
      body: {
        invite_link: normalizedInvite,
        group_code: groupCode,
        comment,
        consent: true,
      },
    });
  }

  function handleAudienceChange(value: "own" | "all") {
    if (value === audience) return;
    setAudience(value);
    setConsent(false);
  }

  function hideInviteLinks(text: string) {
    return text.replace(
      /(?:https?:\/\/)?(?:t\.me\/(?:\+|joinchat\/)|max\.ru\/join\/)[^\s]+/gi,
      t`[private invite hidden]`,
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-base-content/70 text-sm">
        <Trans>
          Submitting a request does not join the chat. A cAtIx administrator
          must review it first. Telegram may then require its own approval. For
          MAX, the chat administrator must add the MAX bot as an administrator
          with access to read messages; the bot cannot join automatically.
        </Trans>
      </p>
      <p className="text-base-content/70 text-sm">
        <Trans>Study group verification is not proof of chat membership.</Trans>
      </p>
      <label className="flex flex-col gap-1">
        <Trans>Who should be able to see indexed messages?</Trans>
        <select
          className="select w-full"
          name="audience"
          value={audience}
          onChange={(event) =>
            handleAudienceChange(event.target.value as "own" | "all")
          }
        >
          <option value="own">
            <Trans>My verified study group</Trans>
          </option>
          <option value="all">
            <Trans>All cAtIx users</Trans>
          </option>
        </select>
      </label>
      {audience === "own" ? (
        <p className="text-base-content/70 text-sm">
          <Trans>
            Indexed messages will be visible to students verified for the
            selected study group, including students who are not chat members.
          </Trans>
        </p>
      ) : (
        <p className="alert alert-warning text-sm">
          <Trans>
            Messages will be visible to all cAtIx users, including people who
            are not members of your study group or chat.
          </Trans>
        </p>
      )}
      <label className="flex flex-col gap-1">
        <Trans>Telegram or MAX chat or channel link</Trans>
        <input
          className="input w-full"
          name="invite_link"
          maxLength={160}
          value={inviteLink}
          onChange={(event) => setInviteLink(event.target.value)}
        />
        <span className="text-base-content/70 text-xs">
          <Trans>
            Use t.me/username or max.ru/username for a public chat or channel,
            t.me/+HASH or t.me/joinchat/HASH for a private Telegram invitation,
            or max.ru/join/HASH for a private MAX invitation. Links with
            https:// are also supported.
          </Trans>
        </span>
        {!validInvite && (
          <span className="text-error text-sm">
            <Trans>
              Enter a valid Telegram or MAX chat, channel or invite link.
            </Trans>
          </span>
        )}
      </label>
      {audience === "own" && (
        <label className="flex flex-col gap-1">
          <Trans>Study group</Trans>
          <select
            className="select w-full"
            name="group_code"
            value={selectedGroup ?? ""}
            onChange={(event) => {
              if (event.target.value !== selectedGroup) {
                setSelectedGroup(event.target.value || undefined);
                setConsent(false);
              }
            }}
          >
            <option value="">
              <Trans>Select a verified study group</Trans>
            </option>
            {verifiedGroups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
          <span className="text-base-content/70 text-xs">
            {requests.isError ? (
              <Trans>
                Your study groups could not be verified. Refresh to try again,
                or choose all cAtIx users.
              </Trans>
            ) : verifiedGroups.length === 0 && requests.isSuccess ? (
              <Trans>
                No verified study groups are available. Choose all cAtIx users
                or refresh after verification is available.
              </Trans>
            ) : (
              <Trans>
                Only groups verified for your account can be selected.
              </Trans>
            )}
          </span>
          {!validGroup && !requests.isError && verifiedGroups.length > 0 && (
            <span className="text-error text-sm">
              <Trans>Choose one of your verified study groups.</Trans>
            </span>
          )}
        </label>
      )}
      <label className="flex flex-col gap-1">
        <Trans>Comment (optional)</Trans>
        <textarea
          className="textarea w-full"
          name="comment"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
        <span className="text-base-content/70 text-xs">
          <Trans>Maximum 2000 characters.</Trans>
        </span>
        {comment.length > 2000 && (
          <span className="text-error text-sm">
            <Trans>Comment must be 2000 characters or fewer.</Trans>
          </span>
        )}
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="checkbox shrink-0"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
        />
        {audience === "all" ? (
          <Trans>
            The chat administrator agreed to indexing this chat and making its
            messages visible to all cAtIx users.
          </Trans>
        ) : (
          <Trans>
            The chat administrator agreed to indexing this chat and making its
            messages available to verified students of the selected study group.
          </Trans>
        )}
      </label>
      {!consent && (
        <p className="text-error text-sm">
          <Trans>
            Confirm the chat administrator's consent for this audience.
          </Trans>
        </p>
      )}
      {mutation.isError && (
        <p className="text-error text-sm">
          <SourceRequestError error={mutation.error} />
        </p>
      )}
      {mutation.isSuccess && (
        <p className="text-success text-sm">
          <Trans>
            Request saved. Current status:{" "}
            <SourceRequestStatus status={mutation.data.status} />
          </Trans>
        </p>
      )}
      <button
        type="button"
        className="btn btn-primary"
        disabled={!canSubmit}
        onClick={handleSubmit}
      >
        {mutation.isPending && (
          <span className="loading loading-spinner loading-sm" />
        )}
        <Trans>Submit request</Trans>
      </button>
      {mutation.isPending && (
        <p className="text-base-content/70 text-sm">
          <Trans>Submitting your request…</Trans>
        </p>
      )}
      <h3 className="mt-2 font-semibold">
        <Trans>Your requests</Trans>
      </h3>
      {requests.isPending && (
        <div className="skeleton p-3 text-sm">
          <Trans>Loading requests…</Trans>
        </div>
      )}
      {requests.isError && (
        <p className="text-error text-sm">
          <Trans>Could not load your requests. Refresh to try again.</Trans>
        </p>
      )}
      {requests.isSuccess && requests.data.requests.length === 0 && (
        <p className="text-base-content/70 text-sm">
          <Trans>No requests yet.</Trans>
        </p>
      )}
      <button
        type="button"
        className="btn btn-ghost btn-sm self-start"
        disabled={requests.isFetching}
        onClick={() => void requests.refetch()}
      >
        <Trans>Refresh requests</Trans>
      </button>
      <ul className="flex flex-col gap-2">
        {requests.data?.requests.map((request) => (
          <li
            key={request.id}
            className="border-base-300 rounded-box border p-3 text-sm"
          >
            <p className="font-medium break-words">
              {hideInviteLinks(
                request.title ??
                  (request.group_code === "all"
                    ? t`All cAtIx users`
                    : request.group_code),
              )}
            </p>
            <p>
              {request.group_code === "all"
                ? t`All cAtIx users`
                : hideInviteLinks(request.group_code)}
            </p>
            <p>
              <SourceRequestStatus status={request.status} />
            </p>
            {request.message && (
              <p className="mt-1 break-words whitespace-pre-wrap">
                {hideInviteLinks(request.message)}
              </p>
            )}
            <time
              dateTime={request.created_at}
              className="text-base-content/60 text-xs"
            >
              {i18n.date(request.created_at, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </time>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SourceRequestError({ error }: { error: unknown }) {
  if (isApiHttpError(error)) {
    if (error.httpCode === 403) {
      return (
        <Trans>
          Your selected study group is no longer verified. Refresh your requests
          and select a currently verified group before submitting.
        </Trans>
      );
    }
    if (error.httpCode === 409) {
      return (
        <Trans>
          This invitation already has a rejected or failed request. Refresh your
          requests and contact a cAtIx administrator for review, or use a new
          invitation.
        </Trans>
      );
    }
    if (error.httpCode === 429) {
      return (
        <Trans>
          You have reached the daily limit for new requests. Wait 24 hours
          before submitting a new invitation. You can still refresh your
          existing requests.
        </Trans>
      );
    }
  }
  return (
    <Trans>
      Could not submit the request. Check the invite link, study group and
      consent, then retry. If the connection was interrupted, refresh your
      requests before trying again.
    </Trans>
  );
}

function SourceRequestStatus({
  status,
}: {
  status: searchTypes.SchemaSourceRequestView["status"];
}) {
  switch (status) {
    case "pending":
      return <Trans>Awaiting cAtIx administrator approval</Trans>;
    case "approved":
      return <Trans>Approved; queued to connect</Trans>;
    case "joining":
      return <Trans>Connecting chat</Trans>;
    case "waiting_join":
      return <Trans>Waiting for chat access confirmation</Trans>;
    case "connected":
      return (
        <Trans>Source enabled; message history may still be loading</Trans>
      );
    case "failed":
      return <Trans>Connection failed</Trans>;
    case "rejected":
      return <Trans>Request rejected</Trans>;
  }
}
