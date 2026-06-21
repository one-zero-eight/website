import { cn } from "@/lib/ui/cn";
import { Link } from "@tanstack/react-router";

export function CreateMeetingButton({
  className,
  children,
}: {
  className?: string;
  children?: string;
}) {
  return (
    <Link
      to="/when2meet/new"
      className={cn("btn btn-primary gap-1.5", className)}
      title="Create new meeting"
    >
      <span className="icon-[material-symbols--add] shrink-0 text-xl" />
      {children ?? "Create meeting"}
    </Link>
  );
}
