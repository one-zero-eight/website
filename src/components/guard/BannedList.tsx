import { useToast } from "@/components/toast";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { useMemo, useState } from "react";
import { filterByFields, formatDate } from "./utils";

type BannedItem = {
  user_id: string;
  gmail: string;
  innomail: string;
  banned_at: string;
};

export function BannedList({
  banned,
  search,
  onUnban,
}: {
  banned: BannedItem[];
  search: string;
  onUnban: (userId: string) => Promise<void>;
}) {
  const filtered = useMemo(
    () => filterByFields(banned, search, ["gmail", "innomail"]),
    [banned, search],
  );

  if (!banned || banned.length === 0) {
    return (
      <div className="bg-base-200/50 text-base-content/60 rounded-box flex flex-col items-center gap-2 px-4 py-10 text-center">
        <span className="icon-[material-symbols--person-off-outline-rounded] text-3xl" />
        <p>
          <Trans>No banned users</Trans>
        </p>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <p className="text-base-content/60 py-6 text-center text-sm">
        <Trans>No banned users match your search</Trans>
      </p>
    );
  }

  return (
    <div className="flex max-h-96 flex-col gap-2 overflow-auto">
      {filtered.map((bannedUser) => (
        <BannedItemCard
          key={bannedUser.user_id}
          banned={bannedUser}
          onUnban={onUnban}
        />
      ))}
    </div>
  );
}

function BannedItemCard({
  banned,
  onUnban,
}: {
  banned: BannedItem;
  onUnban: (userId: string) => Promise<void>;
}) {
  const { i18n } = useLingui();
  const bannedAt = formatDate(banned.banned_at, i18n.locale);

  return (
    <div className="bg-base-200 rounded-box flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-col">
          <Email email={banned.gmail} />
          <Email email={banned.innomail} />
        </div>
        <div className="text-base-content/50 text-xs">
          <Trans>banned {bannedAt}</Trans>
        </div>
      </div>
      <UnbanButton
        email={banned.gmail || banned.innomail}
        onClick={() => onUnban(banned.user_id)}
      />
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

function UnbanButton({
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
      title: msg`Unban user`,
      message: msg`Unban ${email}? They will be able to join this sheet again via the join link.`,
      confirmText: msg`Unban`,
      cancelText: msg`Cancel`,
      type: "info",
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
      className="btn btn-ghost btn-sm shrink-0 gap-1"
    >
      {pending ? (
        <span className="loading loading-spinner loading-sm" />
      ) : (
        <span className="icon-[material-symbols--undo-rounded] text-lg" />
      )}
      <Trans>Unban</Trans>
    </button>
  );
}
