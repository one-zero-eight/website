import Tooltip from "@/components/common/Tooltip";

export default function SimpleExportButton({
  tooltip,
  onClick,
}: {
  tooltip?: string;
  onClick?: () => void;
}) {
  return (
    <Tooltip content={tooltip || "Export your schedule"}>
      <button
        className="hover:bg-base-300-hover rounded-box flex h-10 w-10 items-center justify-center text-3xl"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onClick?.();
        }}
      >
        <span className="icon-[material-symbols--cloud-download-outline] mb-0.25 text-green-500" />
      </button>
    </Tooltip>
  );
}
