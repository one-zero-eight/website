import Tooltip from "@/components/common/Tooltip.tsx";
import clsx from "clsx";

export function LeaveFeedbackButton({
  isMinimized = false,
  isMorePage = false,
}: {
  isMinimized?: boolean;
  isMorePage?: boolean;
}) {
  return (
    <div className="w-full">
      <Tooltip content="Leave feedback">
        <a
          href="https://forms.gle/2vMmu4vSoVShvbMw6"
          target="_blank"
          rel="noopener noreferrer"
          className={clsx(
            "text-base-content/70 hover:text-base-content/50 gap-2 rounded-xl p-2 underline-offset-4 hover:underline",
            !isMorePage ? "flex items-center justify-center" : "flex px-4",
          )}
        >
          {!isMinimized ? (
            <span className="underline">Leave feedback</span>
          ) : (
            <span className="icon-[material-symbols--maps-ugc-outline-rounded] text-base-content/70 text-2xl" />
          )}
        </a>
      </Tooltip>
    </div>
  );
}
