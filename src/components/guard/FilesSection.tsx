interface FilesSectionProps {
  search: string;
  onSearchChange: (search: string) => void;
  children: React.ReactNode;
}

export function FilesSection({
  search,
  onSearchChange,
  children,
}: FilesSectionProps) {
  return (
    <div>
      <h2 className="mb-3 text-xl font-semibold">Your Files</h2>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by title or paste full join link or slug"
          className="w-full rounded-lg border-2 border-contrast/20 bg-primary/5 px-4 py-3 outline-none transition-colors focus:border-contrast/40 focus:bg-primary/10"
        />
      </div>

      {children}
    </div>
  );
}
