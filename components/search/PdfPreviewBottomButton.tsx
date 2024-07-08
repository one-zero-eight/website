import { MouseEventHandler, ReactNode } from "react";

export default function PdfPreviewBottomButton({
  icon,
  text,
  href,
}: {
  icon: ReactNode;
  text: string;
  href: string | undefined;
}) {
  return (
    <a
      className="flex flex-wrap items-center justify-center rounded-lg bg-base-100 px-4 py-2 dark:bg-primary-hover md:py-[14px]"
      href={href}
    >
      {icon}
      <p className="text-nowrap pl-2 text-sm md:text-xs">{text}</p>
    </a>
  );
}
