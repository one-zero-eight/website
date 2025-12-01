import clsx from "clsx";

interface SectionHeaderProps {
  id: string;
  title: string;
  className?: string;
}

export const SectionHeader = ({ id, title, className }: SectionHeaderProps) => {
  return (
    <h2
      id={id}
      className={clsx(
        "group flex scroll-mt-24 items-center gap-2 text-3xl font-semibold",
        className,
      )}
    >
      <a
        href={`#${id}`}
        className="decoration-dotted underline-offset-4 hover:underline"
      >
        {title}
      </a>
      <a
        href={`#${id}`}
        className="text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        aria-label={`Link to ${title}`}
      >
        <span className="icon-[mdi--link-variant] text-xl" />
      </a>
    </h2>
  );
};
