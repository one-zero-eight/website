import { useMemo } from "react";
import { buildJoinLink, parseSlugFromJoinLink, formatDate } from "./utils";
import { CopyLinkButton } from "./CopyLinkButton";

type FileItem = {
  slug: string;
  title: string;
  created_at: string;
  sso_joins_count: number;
  user_role: string;
};

interface FilesListProps {
  files: FileItem[];
  search: string;
  onShowDetails: (slug: string) => void;
}

export function FilesList({ files, search, onShowDetails }: FilesListProps) {
  const normalizedSearch = search.trim().toLowerCase();

  const searchSlug = useMemo(() => {
    if (!normalizedSearch) return "";
    const slug = parseSlugFromJoinLink(normalizedSearch);
    return slug || normalizedSearch;
  }, [normalizedSearch]);

  const filtered = useMemo(() => {
    if (!normalizedSearch) return files;
    return files.filter((f) => {
      const title = (f.title || "").toLowerCase();
      const slug = f.slug.toLowerCase();
      return title.includes(normalizedSearch) || slug.includes(searchSlug);
    });
  }, [files, normalizedSearch, searchSlug]);

  if (files.length === 0) {
    return <div className="text-contrast/60">No files found.</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      {filtered.map((file) => (
        <FileItem key={file.slug} file={file} onShowDetails={onShowDetails} />
      ))}
    </div>
  );
}

interface FileItemProps {
  file: FileItem;
  onShowDetails: (slug: string) => void;
}

function FileItem({ file, onShowDetails }: FileItemProps) {
  return (
    <div className="border-contrast/20 bg-primary/5 flex items-center justify-between rounded-lg border-2 px-4 py-3">
      <div className="min-w-0">
        <div className="truncate font-medium">{file.title || "Untitled"}</div>
        <div className="text-contrast/60 flex items-center gap-2 truncate text-sm">
          {file.user_role}, {file.sso_joins_count}{" "}
          {file.sso_joins_count === 1 ? "join" : "joins"}, created at{" "}
          {formatDate(file.created_at)}
        </div>
      </div>
      <div className="ml-4 flex shrink-0 items-center gap-2">
        <button
          onClick={() => onShowDetails(file.slug)}
          className="border-contrast/20 hover:border-contrast/40 rounded-lg border-2 px-3 py-2 text-sm font-medium"
        >
          Show more
        </button>
        <CopyLinkButton text={buildJoinLink(file.slug)} variant="primary" />
      </div>
    </div>
  );
}
