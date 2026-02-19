import { useState, useMemo } from "react";
import { filterByFields } from "./utils";
import { MESSAGES } from "./consts";
import { FileRole } from "./hooks";

type JoinItem = {
  user_id: string;
  gmail: string;
  innomail: string;
  joined_at: string;
  role: string;
};

interface JoinsListProps {
  joins: JoinItem[];
  search: string;
  onBan: (userId: string) => Promise<void>;
  onUpdateRole: (userId: string, role: string) => Promise<void>;
}

export function JoinsList({
  joins,
  search,
  onBan,
  onUpdateRole,
}: JoinsListProps) {
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
        <JoinItem
          key={join.user_id}
          join={join}
          onBan={onBan}
          onUpdateRole={onUpdateRole}
        />
      ))}
    </div>
  );
}

interface JoinItemProps {
  join: JoinItem;
  onBan: (userId: string) => Promise<void>;
  onUpdateRole: (userId: string, role: string) => Promise<void>;
}

function JoinItem({ join, onBan, onUpdateRole }: JoinItemProps) {
  return (
    <div className="border-base-content/20 bg-base-200/5 rounded-field flex items-center justify-between border-2 px-4 py-3">
      <div className="flex min-w-0 flex-col">
        <Email email={join.gmail} />
        <Email email={join.innomail} />
        {/* <p className="text-base-content/50 text-xs">
          joined at {formatDate(join.joined_at)}
        </p> */}
      </div>
      <div className="ml-4 flex shrink-0 items-center gap-2">
        <RolesSwitch
          currentRole={join.role as FileRole}
          onSwitch={async (role) => onUpdateRole(join.user_id, role)}
        />
        <BanButton onClick={() => onBan(join.user_id)} />
      </div>
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

export function RolesSwitch({
  currentRole,
  onSwitch,
}: {
  currentRole: FileRole;
  onSwitch: (role: FileRole) => void | Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const isWriter = currentRole === FileRole.writer;
  const handleSwitch = async () => {
    if (pending) return;
    const nextRole = isWriter ? FileRole.reader : FileRole.writer;
    setPending(true);
    try {
      await onSwitch(nextRole);
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      className={`border-base-content/20 bg-base-200/5 rounded-field flex w-fit border-2 p-1 text-sm font-medium ${
        pending ? "cursor-not-allowed opacity-50" : "cursor-pointer opacity-100"
      }`}
      title={`Switch to ${isWriter ? "Reader" : "Writer"}`}
      onClick={handleSwitch}
      disabled={pending}
      type="button"
    >
      <span
        className={`rounded-sm border-2 px-1.5 py-0.5 transition-colors ${
          isWriter
            ? "border-primary bg-primary/20 text-primary font-semibold"
            : "text-base-content/70 border-transparent"
        }`}
      >
        Writer
      </span>
      <span
        className={`ml-1 rounded-sm border-2 px-1.5 py-0.5 transition-colors ${
          !isWriter
            ? "border-primary bg-primary/20 text-primary font-semibold"
            : "text-base-content/70 border-transparent"
        }`}
      >
        Reader
      </span>
      {/* {pending && (
        <span className="ml-2 text-xs text-base-content/40">Switching...</span>
      )} */}
    </button>
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
      className="rounded-field shrink-0 border-2 border-red-500 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
      title="Ban user"
    >
      {pending ? "Banning..." : "Ban"}
    </button>
  );
}
