import Tooltip from "@/components/common/Tooltip";
import { Trans, useLingui } from "@lingui/react/macro";

export default function ExportButton({
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
        className="bg-base-200 hover:bg-base-300 rounded-box flex flex-row items-center justify-center gap-2 px-4 py-2 text-center text-xl font-medium"
        onClick={onClick}
      >
        <span className="icon-[material-symbols--cloud-download-outline] text-4xl text-green-500" />
        <Trans>Export</Trans>
      </button>
    </Tooltip>
  );
}
