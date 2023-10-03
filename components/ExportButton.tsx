import DownloadIcon from "@/components/icons/DownloadIcon";
import Tooltip from "@/components/Tooltip";
import Link from "next/link";

export default function ExportButton({ alias }: { alias: string }) {
  return (
    <Tooltip content={"Export your schedule"}>
      <Link
        href={`/schedule/event-groups/${alias}/export`}
        className="flex flex-row items-center justify-center gap-2 rounded-2xl border-2 border-focus_color bg-primary-main px-4 py-2 text-center text-xl font-medium hover:bg-primary-hover"
      >
        <DownloadIcon className="flex fill-icon-main" width={34} height={34} />
        Export
      </Link>
    </Tooltip>
  );
}
