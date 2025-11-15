import { useState } from "react";
import { buildJoinLink, buildSheetsUrl, formatDate } from "./utils";
import { CopyLinkButton } from "./CopyLinkButton";
import { JoinsList } from "./JoinsList";
import { BannedList } from "./BannedList";
import { EditTitleButton } from "./EditTitleButton";
import { MESSAGES } from "./consts";
import { FileRole } from "./hooks";

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

interface FileDetailsProps {
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
}

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
}: FileDetailsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  const handleDelete = async () => {
    if (!confirm(MESSAGES.deleteConfirm)) return;
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateDefaultRole = async (newRole: FileRole) => {
    if (!file) return;

    const affectedCount = file.sso_joins?.length || 0;
    const roleLabel = newRole === FileRole.writer ? "Writer" : "Reader";

    const message = `Update all roles to ${roleLabel}?\n\nThis will update the default role to ${roleLabel} and change permissions for ${affectedCount} user${affectedCount === 1 ? "" : "s"}. Are you sure?`;

    if (!confirm(message)) return;

    setIsUpdatingRole(true);
    try {
      await onUpdateDefaultRole(newRole);
    } finally {
      setIsUpdatingRole(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <EditTitleButton
            currentTitle={file?.title || "Untitled"}
            onSave={onUpdateTitle}
          />
          <p className="text-base-content/60 text-sm font-normal">
            created at {file?.created_at ? formatDate(file.created_at) : "—"}
          </p>
        </div>
        <div className="ml-4 flex shrink-0 items-center gap-2">
          <button
            onClick={onBack}
            className="border-base-content/20 hover:border-base-content/40 rounded-field border-2 px-3 py-2 text-sm font-medium"
          >
            Back to files
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <CopyLinkButton text={buildJoinLink(slug)} variant="primary" />

        <button
          onClick={() => {
            if (!file?.file_id) return;
            window.location.href = buildSheetsUrl(file.file_id);
          }}
          disabled={!file?.file_id}
          className="border-base-content/20 hover:border-base-content/40 rounded-field border-2 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          Open spreadsheet
        </button>

        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="rounded-field border-2 border-red-500 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
      </div>

      {file && (
        <div className="mb-4 flex flex-col gap-2">
          <p className="text-base-content/60 text-base">
            Default Role:{" "}
            <span className="text-base-content font-medium">
              {file?.default_role}
            </span>
          </p>
          <div>
            <button
              onClick={() =>
                handleUpdateDefaultRole(
                  file.default_role === FileRole.writer
                    ? FileRole.reader
                    : FileRole.writer,
                )
              }
              disabled={isUpdatingRole}
              className={`border-base-content/20 hover:border-base-content/40 rounded-field border-2 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50`}
              title={`Update all roles to ${file.default_role === FileRole.writer ? "Reader" : "Writer"}`}
            >
              {isUpdatingRole
                ? "Updating..."
                : `Update all roles to ${file.default_role === FileRole.writer ? "Reader" : "Writer"}`}
            </button>
          </div>
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by gmail or innomail"
          className="border-base-content/20 bg-inh-primary/5 focus:border-base-content/40 focus:bg-inh-primary/10 rounded-field w-full border-2 px-4 py-3 outline-hidden transition-colors"
        />
      </div>

      {isLoading ? (
        <div className="text-base-content/70">Loading...</div>
      ) : (
        <>
          <div className="mb-6">
            <h4 className="mb-2 text-base font-semibold">Joins</h4>
            <JoinsList
              joins={file?.sso_joins || []}
              search={search}
              onBan={onBan}
              onUpdateRole={onUpdateUserRole}
            />
          </div>

          <div>
            <h4 className="mb-2 text-base font-semibold">Banned</h4>
            <BannedList
              banned={file?.sso_banned || []}
              search={search}
              onUnban={onUnban}
            />
          </div>
        </>
      )}
    </div>
  );
}
