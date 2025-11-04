import { useState, useMemo } from "react";
import { formatDate, filterByFields } from "./utils";
import { MESSAGES } from "./consts";

type JoinItem = {
  user_id: string;
  gmail: string;
  innomail: string;
  joined_at: string;
};

interface JoinsListProps {
  joins: JoinItem[];
  search: string;
  onBan: (userId: string) => Promise<void>;
}

export function JoinsList({ joins, search, onBan }: JoinsListProps) {
  const filtered = useMemo(
    () => filterByFields(joins, search, ["gmail", "innomail"]),
    [joins, search],
  );

  if (!joins || joins.length === 0) {
    return <div className="text-base-content/60">No joins yet.</div>;
  }

  return (
    <div className="flex max-h-80 flex-col gap-3 overflow-auto">
      {filtered.map((join) => (
        <JoinItem key={join.user_id} join={join} onBan={onBan} />
      ))}
    </div>
  );
}

interface JoinItemProps {
  join: JoinItem;
  onBan: (userId: string) => Promise<void>;
}

function JoinItem({ join, onBan }: JoinItemProps) {
  return (
    <div className="border-base-content/20 bg-inh-primary/5 rounded-field flex items-center justify-between border-2 px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Email email={join.gmail} />
          <Email email={join.innomail} />
        </div>
        <div className="text-base-content/50 text-xs">
          joined at {formatDate(join.joined_at)}
        </div>
      </div>
      <BanButton onClick={() => onBan(join.user_id)} />
    </div>
  );
}

function Email({ email }: { email: string }) {
  return (
    <span>
      {email.split("@")[0]}
      <span className="text-base-content/50">@{email.split("@")[1]}</span>
    </span>
  );
}

function BanButton({ onClick }: { onClick: () => Promise<void> }) {
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    if (!confirm(MESSAGES.banConfirm)) return;
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
      className="rounded-field ml-4 shrink-0 border-2 border-red-500 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
      title="Ban user"
    >
      {pending ? "Banning..." : "Ban"}
    </button>
  );
}
