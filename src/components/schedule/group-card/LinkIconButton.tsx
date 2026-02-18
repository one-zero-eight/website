import Tooltip from "@/components/common/Tooltip";
import { useNavigate } from "@tanstack/react-router";

export default function LinkIconButton({
  tooltip,
  href,
  icon,
}: {
  tooltip: string;
  href: string;
  icon: React.ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <Tooltip content={tooltip}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (href.startsWith("/")) {
            navigate({ to: href });
          } else {
            window.open(href, "_blank");
          }
        }}
        className="text-base-content/50 hover:bg-base-300-hover hover:text-base-content/75 rounded-box -mr-2 flex h-10 w-10 items-center justify-center text-3xl"
      >
        {icon}
      </button>
    </Tooltip>
  );
}
