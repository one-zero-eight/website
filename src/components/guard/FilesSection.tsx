export function FilesSection({
  search,
  onSearchChange,
  children,
}: {
  search: string;
  onSearchChange: (search: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Your sheets</h2>

      <label className="input input-bordered flex w-full items-center gap-2">
        <span className="icon-[material-symbols--search-rounded] text-base-content/50 shrink-0 text-xl" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by title, join link, or slug"
          className="grow"
        />
      </label>

      {children}
    </div>
  );
}
