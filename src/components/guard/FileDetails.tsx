import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { useState } from "react";
import { BannedList } from "./BannedList";
import { CopyLinkButton } from "./CopyLinkButton";
import { EditTitleButton } from "./EditTitleButton";
import { JoinsList, RolesSwitch } from "./JoinsList";
import { FileRole } from "./hooks";
import { buildJoinLink, buildSheetsUrl, formatDate } from "./utils";

type FileDetailsData = {
  title: string;
  file_id: string;
  default_role: string;
  created_at: string;
  sso_joins: Array<{
    user_id: string;
    gmail: string;
    innomail: string;
    joined_at: string;
    role: string;
  }>;
  sso_banned: Array<{
    user_id: string;
    gmail: string;
    innomail: string;
    banned_at: string;
  }>;
};

type PeopleTab = "joins" | "banned";

export function FileDetails({
  slug,
  file,
  isLoading,
  search,
  onSearchChange,
  onBack,
  onDelete,
  onUpdateTitle,
  onBan,
  onUnban,
  onUpdateDefaultRole,
  onUpdateUserRole,
}: {
  slug: string;
  file: FileDetailsData | undefined;
  isLoading: boolean;
  search: string;
  onSearchChange: (search: string) => void;
  onBack: () => void;
  onDelete: () => Promise<void>;
  onUpdateTitle: (newTitle: string) => Promise<void>;
  onBan: (userId: string) => Promise<void>;
  onUnban: (userId: string) => Promise<void>;
  onUpdateDefaultRole: (role: string) => Promise<void>;
  onUpdateUserRole: (userId: string, role: string) => Promise<void>;
}) {
  const { showConfirm } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [peopleTab, setPeopleTab] = useState<PeopleTab>("joins");

  const joinsCount = file?.sso_joins?.length ?? 0;
  const bannedCount = file?.sso_banned?.length ?? 0;
  const currentRole =
    file?.default_role === FileRole.reader ? FileRole.reader : FileRole.writer;
  const sheetTitle = file?.title || "Untitled";

  const handleDelete = async () => {
    const confirmed = await showConfirm({
      title: "Delete sheet",
      message: `Delete "${sheetTitle}"? The join link will stop working, and access managed by Guard will be removed. This cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "error",
    });
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGuestsRoleSwitch = async (newRole: FileRole) => {
    if (!file || newRole === currentRole) return;

    const affectedCount = file.sso_joins?.length || 0;
    const roleLabel = newRole === FileRole.writer ? "Writer" : "Reader";
    const message =
      affectedCount > 0
        ? `New guests will get ${roleLabel} access. Permissions for ${affectedCount} already joined user${affectedCount === 1 ? "" : "s"} will be updated too.`
        : `New guests will get ${roleLabel} access when they join via the link.`;

    const confirmed = await showConfirm({
      title: `Set guests role to ${roleLabel}`,
      message,
      confirmText: `Set to ${roleLabel}`,
      cancelText: "Cancel",
      type: "warning",
    });
    if (!confirmed) return;

    setIsUpdatingRole(true);
    try {
      await onUpdateDefaultRole(newRole);
    } finally {
      setIsUpdatingRole(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={onBack}
          className="btn btn-ghost btn-sm w-fit gap-1 px-2"
        >
          <span className="icon-[material-symbols--arrow-back-rounded] text-lg" />
          Sheets
        </button>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <EditTitleButton
              currentTitle={file?.title || "Untitled"}
              onSave={onUpdateTitle}
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="badge badge-ghost badge-sm">
                {file?.created_at ? formatDate(file.created_at) : "—"}
              </span>
              {!isLoading && (
                <>
                  <span className="badge badge-ghost badge-sm">
                    {joinsCount} {joinsCount === 1 ? "join" : "joins"}
                  </span>
                  {bannedCount > 0 && (
                    <span className="badge badge-error badge-soft badge-sm">
                      {bannedCount} banned
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <CopyLinkButton text={buildJoinLink(slug)} />
            <a
              href={file?.file_id ? buildSheetsUrl(file.file_id) : undefined}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "btn btn-ghost btn-sm gap-1",
                !file?.file_id && "pointer-events-none opacity-50",
              )}
              onClick={(e) => {
                if (!file?.file_id) e.preventDefault();
              }}
            >
              <span className="icon-[material-symbols--open-in-new-rounded] text-lg" />
              Open
            </a>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="btn btn-ghost btn-sm btn-error gap-1"
            >
              {isDeleting ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <span className="icon-[material-symbols--delete-outline-rounded] text-lg" />
              )}
              Delete
            </button>
          </div>
        </div>
      </div>

      <section className="bg-base-200 rounded-box flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-medium">Guests Role</p>
            <p className="text-base-content/60 text-sm">
              Role granted when someone joins via the link
            </p>
          </div>
          {isUpdatingRole ? (
            <span className="loading loading-spinner loading-sm" />
          ) : file ? (
            <RolesSwitch
              currentRole={currentRole}
              onSwitch={handleGuestsRoleSwitch}
            />
          ) : (
            <div className="skeleton h-8 w-36" />
          )}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div role="tablist" className="tabs tabs-box tabs-sm w-fit">
            <button
              type="button"
              role="tab"
              className={cn("tab gap-2", peopleTab === "joins" && "tab-active")}
              onClick={() => setPeopleTab("joins")}
            >
              Joins
              <span className="badge badge-sm badge-ghost">{joinsCount}</span>
            </button>
            <button
              type="button"
              role="tab"
              className={cn(
                "tab gap-2",
                peopleTab === "banned" && "tab-active",
              )}
              onClick={() => setPeopleTab("banned")}
            >
              Banned
              <span className="badge badge-sm badge-ghost">{bannedCount}</span>
            </button>
          </div>

          <label className="input input-bordered flex w-full items-center gap-2 sm:max-w-xs">
            <span className="icon-[material-symbols--search-rounded] text-base-content/50 shrink-0 text-lg" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search email"
              className="grow"
            />
          </label>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            <div className="skeleton h-14 w-full" />
            <div className="skeleton h-14 w-full" />
          </div>
        ) : peopleTab === "joins" ? (
          <JoinsList
            joins={file?.sso_joins || []}
            search={search}
            onBan={onBan}
            onUpdateRole={onUpdateUserRole}
          />
        ) : (
          <BannedList
            banned={file?.sso_banned || []}
            search={search}
            onUnban={onUnban}
          />
        )}
      </section>
    </div>
  );
}
