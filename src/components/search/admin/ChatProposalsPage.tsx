import { $search } from "@/api/search";
import { Trans } from "@lingui/react/macro";
import { useState } from "react";
import { AdminError, AdminLoading } from "./AdminStates";

const PAGE_SIZE = 50;

export function ChatProposalsPage() {
  const [offset, setOffset] = useState(0);
  const {
    data: proposals,
    isPending,
    error,
    refetch,
  } = $search.useQuery("get", "/admin/chat-proposals", {
    params: { query: { offset, limit: PAGE_SIZE } },
  });

  if (isPending) return <AdminLoading />;
  if (error || !proposals)
    return <AdminError error={error} onRetry={refetch} />;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4">
      <p className="text-base-content/75">
        <Trans>Read-only: connect a chat on the Telegram tab.</Trans>
      </p>
      {proposals.items.length === 0 && (
        <p>
          <Trans>No links yet.</Trans>
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>
                <Trans>Link</Trans>
              </th>
              <th>
                <Trans>Study groups</Trans>
              </th>
              <th>
                <Trans>Course</Trans>
              </th>
              <th>
                <Trans>Found</Trans>
              </th>
              <th>
                <Trans>Owner</Trans>
              </th>
            </tr>
          </thead>
          <tbody>
            {proposals.items.map((item) => (
              <tr key={item.link}>
                <td className="break-all">
                  <a
                    className="link"
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {item.link}
                  </a>
                </td>
                <td>{item.study_groups.join(", ")}</td>
                <td>{item.course}</td>
                <td className="whitespace-nowrap">
                  {new Date(item.found_at).toLocaleDateString()}
                </td>
                <td>
                  <code>{item.owner}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn btn-sm"
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
        >
          <Trans>Prev</Trans>
        </button>
        <span className="text-sm">
          {Math.min(offset + 1, proposals.total)}–
          {Math.min(offset + PAGE_SIZE, proposals.total)} / {proposals.total}
        </span>
        <button
          type="button"
          className="btn btn-sm"
          disabled={offset + PAGE_SIZE >= proposals.total}
          onClick={() => setOffset(offset + PAGE_SIZE)}
        >
          <Trans>Next</Trans>
        </button>
      </div>
    </div>
  );
}
