import Tooltip from "@/components/common/Tooltip.tsx";
import clsx from "clsx";
import { useSnowVisibility } from "../snow/SnowContext";

export default function ToggleSnowButton() {
  const { isSnowVisible, toggleSnowVisibility } = useSnowVisibility();
  return (
    <Tooltip content="Snow">
      <button
        onClick={toggleSnowVisibility}
        type="button"
        className="hover:bg-base-300 flex items-center justify-center rounded-xl p-2"
      >
        <span
          className={clsx(
            "icon-[lsicon--heavy-snow-outline] flex text-3xl",
            isSnowVisible ? "text-[#69ddff]" : "text-base-content/70",
          )}
        />
      </button>
    </Tooltip>
  );
}
