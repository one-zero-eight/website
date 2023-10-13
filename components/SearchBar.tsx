type SearchBarProps = {
  width: number;
  placeholder: string;
  value: string;
  onChange: (e: any) => void;
};
export default function SearchBar({
  width,
  placeholder,
  value,
  onChange,
}: SearchBarProps) {
  return (
    <div className="relative">
      <span className="absolute inset-y-0 right-0 flex items-center pr-4">
        <span className="icon-[material-symbols--search] text-3xl text-text-transparent/50" />
      </span>
      <input
        type="text"
        className="form-control min-h-[56px] rounded-2xl bg-primary-main px-4 text-xl text-text-secondary/75 placeholder:text-text-transparent/50 hover:bg-border focus:outline-none active:bg-border"
        style={{ width: width }}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
