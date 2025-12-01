import clsx from "clsx";
import { useState } from "react";

interface SectionHeaderProps {
  id: string;
  title: string;
  className?: string;
}

export const SectionHeader = ({ id, title, className }: SectionHeaderProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    window.location.hash = id;
  };

  return (
    <h2
      id={id}
      className={clsx(
        "group flex scroll-mt-24 items-center text-3xl font-semibold",
        className,
      )}
    >
      <span className="relative flex items-center">
        <a
          href={`#${id}`}
          className="decoration-dotted underline-offset-4 hover:underline"
        >
          {title}
        </a>
        <a
          href={`#${id}`}
          onClick={handleCopy}
          className="absolute left-full ml-2 cursor-pointer text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          aria-label={`Link to ${title}`}
        >
          <span
            className={clsx(
              "text-xl",
              copied
                ? "icon-[mdi--check] text-green-500"
                : "icon-[mdi--link-variant]",
            )}
          />
        </a>
      </span>
    </h2>
  );
};
