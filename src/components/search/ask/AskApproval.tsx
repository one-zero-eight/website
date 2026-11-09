import { searchTypes } from "@/api/search";
import { Trans } from "@lingui/react/macro";
import { decideApproval } from "./ask-session";

// What the assistant is about to do for the user in InNoHassle (book the music room or a room, enrol them in an event, cancel
// a booking). Nothing is done until the user approves it here; a newer question in the chat drops it undone
export function AskApproval({
  approval,
  isLast,
  isPending,
}: {
  approval: searchTypes.SchemaAskApproval;
  isLast: boolean;
  isPending: boolean;
}) {
  return (
    <div className="border-base-300 bg-base-100 rounded-field flex flex-col gap-2 border! p-3">
      <span className="font-medium">
        <Trans>The assistant needs your approval to do this:</Trans>
      </span>
      <ul className="flex flex-col gap-1">
        {approval.actions.map((action, i) => (
          <li key={i} className="ml-5 list-disc">
            {action.description}
          </li>
        ))}
      </ul>
      {!isLast ? (
        <span className="text-base-content/60 text-sm">
          <Trans>Not done: a newer question was asked.</Trans>
        </span>
      ) : isPending ? (
        <span className="loading loading-spinner loading-sm" />
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => decideApproval("approve")}
          >
            <Trans>Confirm</Trans>
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => decideApproval("reject")}
          >
            <Trans>Decline</Trans>
          </button>
        </div>
      )}
    </div>
  );
}
