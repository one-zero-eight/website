import clsx from "clsx";

export function LeaveFeedbackButton({
  isMinimized = false,
  isMorePage = false,
  className = "",
}: {
  isMinimized?: boolean;
  isMorePage?: boolean;
  className?: string;
}) {
  return (
    <a
      href="https://forms.gle/2vMmu4vSoVShvbMw6"
      target="_blank"
      rel="noopener noreferrer"
      className={clsx(
        "text-base-content/50 hover:text-base-content/40 w-full cursor-pointer gap-2 rounded-xl p-2 underline",
        !isMorePage ? "flex items-center justify-center" : "flex px-4",
        className,
      )}
    >
      {!isMinimized ? (
        <span>Leave feedback</span>
      ) : (
        <span className="icon-[material-symbols--maps-ugc-outline-rounded] text-base-content/70 text-2xl" />
      )}
    </a>
  );
}
