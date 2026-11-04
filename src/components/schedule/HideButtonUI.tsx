import Tooltip from "@/components/common/Tooltip";
import { MouseEventHandler } from "react";
import { useLingui } from "@lingui/react/macro";

export default function HideButtonUI({
  isHidden,
  onClick,
}: {
  isHidden: boolean;
  onClick: MouseEventHandler;
}) {
  const { t } = useLingui();
  return (
    <Tooltip
      content={isHidden ? t`Hidden from calendar` : t`Hide from calendar`}
    >
      <button
        type="button"
        onClick={onClick}
        className="hover:bg-base-200 rounded-box flex h-10 w-10 items-center justify-center text-3xl"
      >
        {isHidden ? (
          <span className="icon-[material-symbols--visibility-off-outline] text-base-content/50" />
        ) : (
          <span className="icon-[material-symbols--visibility-outline] text-base-content/50" />
        )}
      </button>
    </Tooltip>
  );
}
