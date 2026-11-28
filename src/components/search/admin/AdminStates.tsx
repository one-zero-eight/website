import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { Trans } from "@lingui/react/macro";

export function AdminLoading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <div className="skeleton h-8 w-48" />
      <div className="skeleton h-40 w-full rounded-xl" />
      <div className="skeleton h-40 w-full rounded-xl" />
    </div>
  );
}

export function AdminError({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <div className="alert alert-error">
        <span>{formatApiErrorMessage(error)}</span>
      </div>
      <button type="button" className="btn btn-primary w-fit" onClick={onRetry}>
        <Trans>Retry</Trans>
      </button>
    </div>
  );
}
