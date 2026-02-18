export default function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="border-b-base-300 focus-within:border-b-primary flex items-center border-b px-2 pb-px focus-within:border-b-2 focus-within:pb-0">
      <input
        placeholder="Find the group..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 grow bg-transparent px-2 py-1 outline-hidden"
      />
      <button
        type="submit"
        tabIndex={-1} // Do not allow to focus on this button
        className="icon-[material-symbols--search-rounded] text-base-300 shrink-0 text-2xl"
      />
    </div>
  );
}
