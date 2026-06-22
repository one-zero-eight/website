import { cn } from "@/lib/ui/cn";
import { Link } from "@tanstack/react-router";
import { HTMLAttributes } from "react";

export function CreateMeetingButton({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLAnchorElement>) {
  return (
    <Link
      to="/when2meet/new"
      className={cn("btn btn-primary gap-1.5", children && "pr-3", className)}
      title="Create new meeting"
      {...props}
    >
      <span className="icon-[material-symbols--add] shrink-0 text-lg" />
      {children ?? "Create meeting"}
    </Link>
  );
}
