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
        <SearchIcon className="fill-light_text_transparent dark:fill-text_transparent" />
      </span>
      <input
        type="text"
        className={`form-control bg-light_primary dark:bg-primary hover:bg-light_border dark:hover:bg-border active:bg-light_border dark:active:bg-border rounded-full text-xl px-6 placeholder:text-light_text_transparent dark:placeholder:text-text_transparent text-light_text_secondary dark:text-text_secondary focus:outline-none min-h-[56px] min-w-[${width}px]`}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
