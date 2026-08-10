import { Modal } from "@/components/common/Modal.tsx";
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

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Enrolled list">
      <div className="@container/modal flex flex-col gap-3">
        <input
          type="search"
          className={eventFieldClass()}
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="max-h-80 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-base-content/70 text-sm">No matches.</p>
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
      </div>
    </Modal>
  );
}
