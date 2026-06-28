import { cn } from "@/lib/ui/cn";
import { forwardRef } from "react";

export const BubbleMenuButton = forwardRef<
  HTMLButtonElement,
  {
    isActive?: boolean;
    isDisabled?: boolean;
    onClick: () => void;
    title: string;
    className?: string;
    iconClassName: string;
  } & React.ButtonHTMLAttributes<HTMLButtonElement>
>(function BubbleMenuButton(
  {
    isActive = false,
    isDisabled = false,
    onClick,
    title,
    className,
    iconClassName,
    ...props
  },
  ref,
) {
  return (
    <li>
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        disabled={isDisabled}
        className={cn(
          "btn btn-sm btn-ghost btn-square disabled:opacity-30",
          isActive && "btn-active bg-primary/20 text-primary",
          className,
        )}
        title={title}
        {...props}
      >
        <span className={cn(iconClassName, "shrink-0 text-lg")} />
      </button>
    </li>
  );
});
