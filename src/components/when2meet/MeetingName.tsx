import { $when2meet, type when2meetTypes } from "@/api/when2meet";
import { formatApiErrorDescriptor } from "@/api/helpers/create-query-client";
import Tooltip from "@/components/common/Tooltip.tsx";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { useState, type FormEvent } from "react";

export function MeetingName({
  meetingRef,
  name,
  canEdit,
  onMeetingUpdated,
}: {
  meetingRef: string;
  name: string;
  canEdit: boolean;
  onMeetingUpdated: (meeting: when2meetTypes.SchemaEventView) => void;
}) {
  const { t } = useLingui();
  const { showError } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [hasNameError, setHasNameError] = useState(false);
  const { mutate, isPending } = $when2meet.useMutation(
    "patch",
    "/meetings/{meeting_ref}",
    {
      onSuccess: (meeting) => {
        onMeetingUpdated(meeting);
        setIsEditing(false);
      },
      onError: (error) =>
        showError(msg`Error`, formatApiErrorDescriptor(error)),
    },
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit || isPending) {
      return;
    }

    const trimmedName = draftName.trim();
    if (trimmedName.length < 3) {
      setHasNameError(true);
      return;
    }

    mutate({
      params: { path: { meeting_ref: meetingRef } },
      body: { name: trimmedName },
    });
  }

  if (!isEditing || !canEdit) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        <h1 className="min-w-0 text-2xl font-semibold wrap-anywhere">{name}</h1>
        {canEdit && (
          <Tooltip content={t`Edit meeting name`}>
            <button
              type="button"
              title={t`Edit meeting name`}
              className="btn btn-ghost btn-sm btn-square text-base-content/60 shrink-0"
              onClick={() => {
                setDraftName(name);
                setHasNameError(false);
                setIsEditing(true);
              }}
            >
              <span className="icon-[material-symbols--edit-outline] text-xl" />
            </button>
          </Tooltip>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-w-0 flex-wrap gap-2">
      <label className="min-w-0 grow basis-full">
        <span className="sr-only">
          <Trans>Meeting name</Trans>
        </span>
        <input
          type="text"
          autoFocus
          className={cn("input w-full", hasNameError && "input-error")}
          value={draftName}
          disabled={isPending}
          onChange={(event) => {
            setDraftName(event.target.value);
            setHasNameError(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape" && !isPending) {
              setIsEditing(false);
            }
          }}
        />
      </label>
      {hasNameError && (
        <p className="text-error basis-full text-sm">
          <Trans>Meeting name should contain at least 3 symbols.</Trans>
        </p>
      )}
      <button
        type="submit"
        className="btn btn-primary btn-sm"
        disabled={isPending}
      >
        {isPending ? (
          <span className="loading loading-spinner loading-sm" />
        ) : (
          <Trans>Save</Trans>
        )}
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        disabled={isPending}
        onClick={() => setIsEditing(false)}
      >
        <Trans>Cancel</Trans>
      </button>
    </form>
  );
}
