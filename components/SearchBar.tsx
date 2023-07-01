import SearchIcon from "@/components/icons/SearchIcon";

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
    <div className="relative text-gray-600 focus-within:text-gray-400 xl:ml-auto">
      <span className="absolute inset-y-0 right-0 flex items-center pr-6">
        <SearchIcon />
      </span>
      <input
        type="text"
        className={`form-control bg-background hover:bg-border active:bg-border rounded-full text-xl px-6 placeholder:text-white/50 text-white/75 focus:outline-none min-h-[56px] min-w-[${width}px]`}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
