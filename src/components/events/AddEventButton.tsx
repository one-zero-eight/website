import { cn } from "@/lib/ui/cn";
import { ButtonHTMLAttributes } from "react";

export default function AddEventButton({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = "btn btn-primary gap-1.5";

  return (
    <button
      type="button"
      className={cn(base, children && "pr-3", className)}
      title="Add new workshop"
      {...props}
    >
      <span className="icon-[fa--plus] shrink-0 text-xs" />
      {children}
    </button>
  );
}
