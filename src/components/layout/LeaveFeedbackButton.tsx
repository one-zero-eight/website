import Tooltip from "@/components/common/Tooltip.tsx";

export function LeaveFeedbackButton({
  isMinimized = false,
}: {
  isMinimized?: boolean;
}) {
  return (
    <div className="w-full">
      <Tooltip content="Leave feedback">
        <a
          href="https://forms.gle/2vMmu4vSoVShvbMw6"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl p-2 text-inactive underline-offset-4 hover:text-contrast/50 hover:underline"
        >
          {!isMinimized ? (
            <span>Leave feedback</span>
          ) : (
            <span className="icon-[material-symbols--maps-ugc-outline-rounded] text-3xl text-inactive" />
          )}
        </a>
      </Tooltip>
    </div>
  );
}
