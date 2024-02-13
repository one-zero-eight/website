import Tooltip from "@/components/common/Tooltip";
import { useRouter } from "next/navigation";

export default function LinkIconButton({
  tooltip,
  href,
  icon,
}: {
  tooltip: string;
  href: string;
  icon: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <Tooltip content={tooltip}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          router.push(href);
        }}
        className="-mr-2 h-52 w-52 rounded-2xl p-2 text-4xl text-icon-main/50 hover:bg-secondary-hover hover:text-icon-hover/75"
      >
        {icon}
      </button>
    </Tooltip>
  );
}
