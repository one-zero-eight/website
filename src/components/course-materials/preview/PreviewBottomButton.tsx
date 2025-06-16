import { ReactNode } from "react";

export default function PreviewBottomButton({
  icon,
  text,
  ...props
}: {
  icon: ReactNode;
  text: string;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      className="bg-base-100 flex flex-wrap items-center justify-center rounded-lg px-4 py-2 dark:bg-primary-hover md:py-[14px]"
      {...props}
    >
      {icon}
      <p className="text-nowrap pl-2 text-sm md:text-xs">{text}</p>
    </a>
  );
}
