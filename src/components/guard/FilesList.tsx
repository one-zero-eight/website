import { useMemo } from "react";
import { buildJoinLink, formatDate, parseSlugFromJoinLink } from "./utils";
import { CopyLinkButton } from "./CopyLinkButton";

type FileItem = {
  slug: string;
  title: string;
  created_at: string;
  sso_joins_count: number;
  default_role: string;
};

export function FilesList({
  files,
  search,
  onShowDetails,
}: {
  files: FileItem[];
  search: string;
  onShowDetails: (slug: string) => void;
}) {
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
    return <p className="text-base-content/60">No files found.</p>;
  }

  if (filtered.length === 0) {
    return <p className="text-base-content/60">No files match your search.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {filtered.map((file) => (
        <FileItemCard
          key={file.slug}
          file={file}
          onShowDetails={onShowDetails}
        />
      ))}
    </div>
  );
}

function FileItemCard({
  file,
  onShowDetails,
}: {
  file: FileItem;
  onShowDetails: (slug: string) => void;
}) {
  return (
    <div
      onClick={() => onShowDetails(file.slug)}
      className="bg-base-200 hover:bg-base-300 rounded-box flex cursor-pointer flex-col gap-3 px-4 py-3 transition-colors sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <div className="truncate font-medium">{file.title || "Untitled"}</div>
        <div className="text-base-content/60 flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1">
            <span className="icon-[material-symbols--group-outline-rounded] text-base" />
            {file.sso_joins_count}
          </span>
          <span className="flex items-center gap-1">
            <span className="icon-[material-symbols--schedule-outline-rounded] text-base" />
            {formatDate(file.created_at)}
          </span>
        </div>
      </div>
      <div
        className="flex shrink-0 items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <CopyLinkButton text={buildJoinLink(file.slug)} />
      </div>
    </div>
  );
}
