import Tooltip from "@/components/common/Tooltip";
import { useLingui } from "@lingui/react/macro";

export default function SimpleExportButton({
  tooltip,
  onClick,
}: {
  tooltip?: string;
  onClick?: () => void;
}) {
  const { t } = useLingui();

  return (
    <Tooltip content={tooltip || t`Export your schedule`}>
      <button
        type="button"
        className="hover:bg-base-200 rounded-box flex h-10 w-10 items-center justify-center text-3xl"
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
