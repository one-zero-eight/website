import Tooltip from "@/components/common/Tooltip";
import Link from "next/link";

export default function ExportButton({
  alias,
  href,
  tooltip,
}: {
  alias?: string;
  href?: string;
  tooltip?: string;
}) {
  return (
    <Tooltip content={tooltip || "Export your schedule"}>
      <Link
        href={href || `/schedule/event-groups/${alias}/export`}
        className="flex flex-row items-center justify-center gap-2 rounded-2xl border-2 border-focus bg-primary-main px-4 py-2 text-center text-xl font-medium hover:bg-primary-hover"
      >
        <span className="icon-[material-symbols--download] text-4xl" />
        Export
      </Link>
    </Tooltip>
  );
}
