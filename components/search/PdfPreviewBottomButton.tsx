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
      className="flex flex-row items-center justify-center rounded-lg bg-base-100 px-4 py-2 dark:bg-primary-hover md:py-[14px]"
      href={href}
    >
      {icon}
      <p className="invisible w-0 text-nowrap pl-0 text-sm sm:visible sm:w-auto sm:pl-2 md:text-xs">
        {text}
      </p>
    </a>
  );
}
