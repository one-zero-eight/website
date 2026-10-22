import { Modal } from "@/components/common/Modal.tsx";
import { Trans, useLingui } from "@lingui/react/macro";
import { useMemo, useState } from "react";
import { eventFieldClass } from "../shared/formStyles";

export function EnrolledListModal({
  open,
  onOpenChange,
  enrolledEmails,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrolledEmails: string[];
}) {
  const { t } = useLingui();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return enrolledEmails;
    }

    return enrolledEmails.filter((email) =>
      email.toLowerCase().includes(normalized),
    );
  }, [enrolledEmails, query]);

  function handleExport() {
    const blob = new Blob([enrolledEmails.join("\n") + "\n"], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "enrolled.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={t`Participants`}>
      <div className="@container/modal flex flex-col gap-3">
        <input
          type="search"
          className={eventFieldClass()}
          placeholder={t`Search...`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="max-h-80 min-h-0 overflow-y-auto">
          {enrolledEmails.length === 0 ? (
            <p className="text-base-content/70 text-sm">
              <Trans>No participants.</Trans>
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-base-content/70 text-sm">
              <Trans>No matches.</Trans>
            </p>
          ) : (
            <ul className="divide-base-300 divide-y">
              {filtered.map((email) => (
                <li key={email} className="py-2 text-sm wrap-anywhere">
                  {email}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            className="btn btn-ghost border"
            disabled={enrolledEmails.length === 0}
            onClick={handleExport}
          >
            <Trans>Export</Trans>
          </button>
        </div>
      </div>
    </Modal>
  );
}
