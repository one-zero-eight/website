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
      className="bg-base-100 dark:bg-primary-hover flex flex-wrap items-center justify-center rounded-lg px-4 py-2 md:py-[14px]"
      {...props}
    >
      {icon}
      <p className="pl-2 text-sm text-nowrap md:text-xs">{text}</p>
    </a>
  );
}
