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
        className="border-primary bg-inh-primary hover:bg-inh-primary-hover rounded-box flex flex-row items-center justify-center gap-2 border-2 px-4 py-2 text-center text-xl font-medium"
        onClick={onClick}
      >
        <span className="icon-[material-symbols--download] text-4xl" />
        Export
      </button>
    </Tooltip>
  );
}
