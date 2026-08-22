import { cn } from "@/lib/ui/cn.ts";
import { useDebounceValue } from "usehooks-ts";

export default function ScheduleLinkInput({
  id,
  url,
  setURL,
  isCalendarChecked,
}: {
  id: string;
  url: string;
  setURL: (url: string) => void;
  isCalendarChecked: boolean;
}) {
  const [isError] = useDebounceValue(
    !isCalendarChecked && url.length > 0,
    1000,
  );

  return (
    <div className="mb-3 flex flex-col gap-1">
      <input
        id={id}
        value={url}
        onChange={(e) => setURL(e.target.value)}
        placeholder="Paste link to .ics here..."
        className={cn(
          "input bg-base-200 w-full grow rounded-xl border-0 p-2 text-base focus:outline-none",
          isError && "input-error border-1",
        )}
      />
      {isError && (
        <p className="label text-error ml-1 text-xs">Link is invalid</p>
      )}
    </div>
  );
}
