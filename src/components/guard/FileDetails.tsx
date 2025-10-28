import { useState } from "react";
import { buildJoinLink, buildSheetsUrl, formatDate } from "./utils";
import { CopyLinkButton } from "./CopyLinkButton";
import { JoinsList } from "./JoinsList";
import { BannedList } from "./BannedList";
import { EditTitleButton } from "./EditTitleButton";
import { MESSAGES } from "./consts";

type FileDetailsData = {
  title: string;
  file_id: string;
  user_role: string;
  created_at: string;
  sso_joins: Array<{
    user_id: string;
    gmail: string;
    innomail: string;
    joined_at: string;
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
}: FileDetailsProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(MESSAGES.deleteConfirm)) return;
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
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
          <p className="text-contrast/60 text-sm font-normal">
            {file?.user_role}, created at{" "}
            {file?.created_at ? formatDate(file.created_at) : "—"}
          </p>
        </div>
        <div className="ml-4 flex shrink-0 items-center gap-2">
          <button
            onClick={onBack}
            className="border-contrast/20 hover:border-contrast/40 rounded-lg border-2 px-3 py-2 text-sm font-medium"
          >
            Back to files
          </button>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <CopyLinkButton text={buildJoinLink(slug)} variant="primary" />

        <button
          onClick={() => {
            if (!file?.file_id) return;
            window.location.href = buildSheetsUrl(file.file_id);
          }}
          disabled={!file?.file_id}
          className="border-contrast/20 hover:border-contrast/40 rounded-lg border-2 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          Open spreadsheet
        </button>

        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="rounded-lg border-2 border-red-500 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by gmail or innomail"
          className="border-contrast/20 bg-primary/5 focus:border-contrast/40 focus:bg-primary/10 w-full rounded-lg border-2 px-4 py-3 outline-hidden transition-colors"
        />
      </div>

      {isLoading ? (
        <div className="text-contrast/70">Loading...</div>
      ) : (
        <>
          <div className="mb-6">
            <h4 className="mb-2 text-base font-semibold">Joins</h4>
            <JoinsList
              joins={file?.sso_joins || []}
              search={search}
              onBan={onBan}
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
