import { MESSAGES } from "./consts";

interface CleanupAlertProps {
  onCleanup: () => void;
  isPending?: boolean;
}

export function CleanupAlert({ onCleanup, isPending }: CleanupAlertProps) {
  return (
    <div className="mt-4 rounded border-2 border-yellow-400 bg-yellow-50 p-4 text-sm text-contrast/80 dark:border-yellow-600 dark:bg-yellow-900/20">
      <p className="font-medium">{MESSAGES.cleanupRecommended}</p>
      <p className="mt-1 text-xs text-contrast/60">
        Running cleanup will revoke access from unverified users. You will need
        to re-join using the Guard link afterwards.
      </p>
      <div className="mt-3">
        <button
          onClick={onCleanup}
          disabled={isPending}
          className="rounded-lg border-2 border-contrast/20 px-3 py-2 text-sm font-medium hover:border-contrast/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Cleaning up..." : "Cleanup access"}
        </button>
      </div>
    </div>
  );
}
