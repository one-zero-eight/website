export default function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center border-b-[1px] border-b-secondary-hover px-2 pb-[1px] focus-within:border-b-2 focus-within:border-b-brand-violet focus-within:pb-0">
      <input
        placeholder="Find the group..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 grow bg-transparent px-2 py-1 outline-none"
      />
      <button
        type="submit"
        tabIndex={-1} // Do not allow to focus on this button
        className="icon-[material-symbols--search-rounded] shrink-0 text-2xl text-secondary-hover"
      />
    </div>
  );
}
