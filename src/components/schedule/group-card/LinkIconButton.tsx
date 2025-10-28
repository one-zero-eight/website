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
        className="text-contrast/50 hover:bg-secondary-hover hover:text-contrast/75 -mr-2 flex h-12 w-12 items-center justify-center rounded-2xl text-4xl"
      >
        {icon}
      </button>
    </Tooltip>
  );
}
