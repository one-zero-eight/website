import clsx from "clsx";
import { ButtonHTMLAttributes } from "react";

export default function AddEventButton({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const base =
    "bg-brand-violet hover:bg-brand-violet/80 flex w-full cursor-pointer items-center justify-center gap-0.5 rounded-lg border-none px-2 py-3 text-sm font-medium text-white shadow-[0_4px_12px_rgba(0,0,0,0.4)] transition-colors duration-200 ease-in-out md:w-fit md:py-2";

  return (
    <button
      type="button"
      className={clsx(base, children && "pr-3", className)}
      title="Add new workshop"
      {...props}
    >
      <span className="icon-[material-symbols--add] shrink-0 text-xl" />
      {children}
    </button>
  );
}
