import { useState, useMemo } from "react";
import { formatDate, filterByFields } from "./utils";
import { MESSAGES } from "./consts";

type BannedItem = {
  user_id: string;
  gmail: string;
  innomail: string;
  banned_at: string;
};

interface BannedListProps {
  banned: BannedItem[];
  search: string;
  onUnban: (userId: string) => Promise<void>;
}

export function BannedList({ banned, search, onUnban }: BannedListProps) {
  const filtered = useMemo(
    () => filterByFields(banned, search, ["gmail", "innomail"]),
    [banned, search],
  );

  if (!banned || banned.length === 0) {
    return <div className="text-contrast/60">No banned users.</div>;
  }

  return (
    <div className="flex max-h-80 flex-col gap-3 overflow-auto">
      {filtered.map((bannedUser) => (
        <BannedItem
          key={bannedUser.user_id}
          banned={bannedUser}
          onUnban={onUnban}
        />
      ))}
    </div>
  );
}

interface BannedItemProps {
  banned: BannedItem;
  onUnban: (userId: string) => Promise<void>;
}

function BannedItem({ banned, onUnban }: BannedItemProps) {
  return (
    <div className="border-contrast/20 bg-primary/5 flex items-center justify-between rounded-lg border-2 px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Email email={banned.gmail} />
          <Email email={banned.innomail} />
        </div>
        <div className="text-contrast/50 text-xs">
          banned at {formatDate(banned.banned_at)}
        </div>
      </div>
      <UnbanButton onClick={() => onUnban(banned.user_id)} />
    </div>
  );
}

function Email({ email }: { email: string }) {
  return (
    <span>
      {email.split("@")[0]}
      <span className="text-contrast/50">@{email.split("@")[1]}</span>
    </span>
  );
}

function UnbanButton({ onClick }: { onClick: () => Promise<void> }) {
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    if (!confirm(MESSAGES.unbanConfirm)) return;
    setPending(true);
    try {
      await onClick();
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="ml-4 shrink-0 rounded-lg border-2 border-green-500 px-3 py-2 text-sm font-medium text-green-500 hover:bg-green-500/20 disabled:cursor-not-allowed disabled:opacity-50"
      title="Unban user"
    >
      {pending ? "Unbanning..." : "Unban"}
    </button>
  );
}
