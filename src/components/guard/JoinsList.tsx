import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { useMemo, useState } from "react";
import { FileRole } from "./hooks";
import { filterByFields } from "./utils";

type JoinItem = {
  user_id: string;
  gmail: string;
  innomail: string;
  joined_at: string;
  role: string;
};

export function JoinsList({
  joins,
  search,
  onBan,
  onUpdateRole,
}: {
  joins: JoinItem[];
  search: string;
  onBan: (userId: string) => Promise<void>;
  onUpdateRole: (userId: string, role: string) => Promise<void>;
}) {
  const filtered = useMemo(
    () => filterByFields(joins, search, ["gmail", "innomail"]),
    [joins, search],
  );

  if (!joins || joins.length === 0) {
    return (
      <div className="bg-base-200/50 text-base-content/60 rounded-box flex flex-col items-center gap-2 px-4 py-10 text-center">
        <span className="icon-[material-symbols--group-outline-rounded] text-3xl" />
        <p>No one has joined yet</p>
        <p className="text-sm">Share the join link to grant access</p>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <p className="text-base-content/60 py-6 text-center text-sm">
        No joins match your search
      </p>
    );
  }

  return (
    <div className="flex max-h-96 flex-col gap-2 overflow-auto">
      {filtered.map((join) => (
        <JoinItemCard
          key={join.user_id}
          join={join}
          onBan={onBan}
          onUpdateRole={onUpdateRole}
        />
      ))}
    </div>
  );
}

function JoinItemCard({
  join,
  onBan,
  onUpdateRole,
}: {
  join: JoinItem;
  onBan: (userId: string) => Promise<void>;
  onUpdateRole: (userId: string, role: string) => Promise<void>;
}) {
  return (
    <div className="bg-base-200 rounded-box flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col">
        <Email email={join.gmail} />
        <Email email={join.innomail} />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <RolesSwitch
          currentRole={join.role as FileRole}
          onSwitch={async (role) => onUpdateRole(join.user_id, role)}
        />
        <BanButton
          email={join.gmail || join.innomail}
          onClick={() => onBan(join.user_id)}
        />
      </div>
    </div>
  );
}

function Email({ email }: { email: string }) {
  const [local, domain] = email.split("@");
  return (
    <span className="truncate text-sm">
      {local}
      <span className="text-base-content/50">@{domain}</span>
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

  const handleSwitch = async (role: FileRole) => {
    if (pending || role === currentRole) return;
    setPending(true);
    try {
      await onSwitch(role);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={cn("join", pending && "pointer-events-none opacity-50")}>
      <button
        type="button"
        className={cn(
          "btn join-item btn-sm",
          isWriter ? "btn-primary" : "btn-ghost border-base-content/20",
        )}
        onClick={() => handleSwitch(FileRole.writer)}
        disabled={pending}
      >
        Writer
      </button>
      <button
        type="button"
        className={cn(
          "btn join-item btn-sm",
          !isWriter ? "btn-primary" : "btn-ghost border-base-content/20",
        )}
        onClick={() => handleSwitch(FileRole.reader)}
        disabled={pending}
      >
        Reader
      </button>
    </div>
  );
}

function BanButton({
  onClick,
  email,
}: {
  onClick: () => Promise<void>;
  email: string;
}) {
  const { showConfirm } = useToast();
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    const confirmed = await showConfirm({
      title: "Ban user",
      message: `Ban ${email}? They will lose access to this sheet and will not be able to join again until unbanned.`,
      confirmText: "Ban",
      cancelText: "Cancel",
      type: "error",
    });
    if (!confirmed) return;

    setPending(true);
    try {
      await onClick();
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="btn btn-ghost btn-error btn-sm btn-square"
    >
      {pending ? (
        <span className="loading loading-spinner loading-sm" />
      ) : (
        <span className="icon-[material-symbols--block-rounded] text-lg" />
      )}
    </button>
  );
}
