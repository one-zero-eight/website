import { isApiHttpError } from "@/api/helpers/create-query-client";
import { $search, type searchTypes } from "@/api/search";
import { RequireAuth } from "@/components/common/AuthWall";
import { Modal } from "@/components/common/Modal";
import { Trans, useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";

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
        <Trans>Propose a Telegram chat</Trans>
      </button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={<Trans>Telegram source requests</Trans>}
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
  const groupListId = useId();
  const [inviteLink, setInviteLink] = useState("");
  const [proposedGroup, setProposedGroup] = useState<string | undefined>();
  const [comment, setComment] = useState("");
  const [consent, setConsent] = useState(false);
  const requests = $search.useQuery("get", "/sources/requests", undefined, {
    retry: false,
    refetchInterval: 15_000,
    refetchOnMount: "always",
  });
  const verifiedGroups = requests.data?.verified_groups ?? [];
  const groupCode =
    proposedGroup ?? (verifiedGroups.length === 1 ? verifiedGroups[0] : "");
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
  const normalizedInvite = normalizeTelegramLink(inviteLink);
  const validInvite = normalizedInvite !== undefined;
  const validGroup =
    /^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/.test(groupCode.trim()) &&
    groupCode.trim().toLowerCase() !== "all";
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
        group_code: groupCode.trim(),
        comment,
        consent: true,
      },
    });
  }

  function hideInviteLinks(text: string) {
    return text.replace(
      /(?:https?:\/\/)?t\.me\/(?:\+|joinchat\/)[^\s]+/gi,
      t`[private invite hidden]`,
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-base-content/70 text-sm">
        <Trans>
          Submitting a request does not join the chat. A cAtIx administrator
          must review it first; Telegram may then require its own approval.
        </Trans>
      </p>
      <p className="text-base-content/70 text-sm">
        <Trans>
          Study group verification is not proof of Telegram chat membership.
          Indexed messages will be available to verified students of the target
          study group, including those who are not in the Telegram chat.
        </Trans>
      </p>
      <label className="flex flex-col gap-1">
        <Trans>Telegram chat or channel link</Trans>
        <input
          className="input w-full"
          name="invite_link"
          maxLength={160}
          value={inviteLink}
          onChange={(event) => setInviteLink(event.target.value)}
        />
        <span className="text-base-content/70 text-xs">
          <Trans>
            Use t.me/username for a public chat or channel, or t.me/+HASH or
            t.me/joinchat/HASH for a private invitation. Links with https:// are
            also supported.
          </Trans>
        </span>
        {!validInvite && (
          <span className="text-error text-sm">
            <Trans>Enter a valid Telegram chat, channel or invite link.</Trans>
          </span>
        )}
      </label>
      <label className="flex flex-col gap-1">
        <Trans>Study group</Trans>
        <input
          className="input w-full"
          name="group_code"
          maxLength={40}
          list={groupListId}
          value={groupCode}
          onChange={(event) => setProposedGroup(event.target.value)}
        />
        <datalist id={groupListId}>
          {verifiedGroups.map((group) => (
            <option key={group} value={group} />
          ))}
        </datalist>
        <span className="text-base-content/70 text-xs">
          <Trans>Choose a specific study group, not "all".</Trans>
        </span>
      </label>
      <label className="flex flex-col gap-1">
        <Trans>Comment (optional)</Trans>
        <textarea
          className="textarea w-full"
          name="comment"
          maxLength={2000}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="checkbox shrink-0"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
        />
        <Trans>
          The Telegram chat administrator agreed to indexing this chat and
          making its messages available to verified students of the target study
          group.
        </Trans>
      </label>
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
              {hideInviteLinks(request.title ?? request.group_code)}
            </p>
            <p>{hideInviteLinks(request.group_code)}</p>
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
      return <Trans>Approved; queued to join</Trans>;
    case "joining":
      return <Trans>Joining Telegram chat</Trans>;
    case "waiting_join":
      return <Trans>Waiting for Telegram membership confirmation</Trans>;
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
