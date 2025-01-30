import Tooltip from "@/components/common/Tooltip.tsx";

export function LeaveFeedbackButton() {
  return (
    <Tooltip content="Leave feedback">
      <a
        href="https://forms.gle/2vMmu4vSoVShvbMw6"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center rounded-xl p-2 hover:bg-secondary"
      >
        <span className="icon-[material-symbols--maps-ugc-outline-rounded] text-3xl text-inactive" />
      </a>
    </Tooltip>
  );
}
