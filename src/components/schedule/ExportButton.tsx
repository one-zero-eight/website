import Tooltip from "@/components/common/Tooltip";

export default function ExportButton({
  tooltip,
  onClick,
}: {
  tooltip?: string;
  onClick?: () => void;
}) {
  return (
    <Tooltip content={tooltip || "Export your schedule"}>
      <button
        className="flex flex-row items-center justify-center gap-2 rounded-2xl border-2 border-brand-violet bg-primary-main px-4 py-2 text-center text-xl font-medium hover:bg-primary-hover"
        onClick={onClick}
      >
        <span className="icon-[material-symbols--download] text-4xl" />
        Export
      </button>
    </Tooltip>
  );
}
