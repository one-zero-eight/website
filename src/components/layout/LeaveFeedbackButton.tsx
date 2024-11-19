import Tooltip from "@/components/common/Tooltip.tsx";

export function LeaveFeedbackButton() {
  return (
    <Tooltip content="Leave feedback">
      <a
        href="https://forms.gle/2vMmu4vSoVShvbMw6"
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-xl"
      >
        <div className="ml-auto flex h-14 w-14 flex-col items-center justify-center rounded-2xl hover:bg-secondary">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-icon-main/50">
            <span className="icon-[material-symbols--maps-ugc-outline-rounded] text-4xl" />
          </div>
        </div>
      </a>
    </Tooltip>
  );
}
