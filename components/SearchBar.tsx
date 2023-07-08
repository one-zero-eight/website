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
    <div className="relative z-0 opacity-[0.999] xl:ml-auto">
      <span className="absolute inset-y-0 right-0 flex items-center pr-6">
        <SearchIcon className="fill-text-transparent/50" />
      </span>
      <input
        type="text"
        className={`form-control bg-primary-main hover:bg-border active:bg-border rounded-full text-xl px-6 placeholder:text-text-transparent/50 text-text-secondary/75 focus:outline-none min-h-[56px] min-w-[${width}px]`}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
