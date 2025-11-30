interface ResourceCardProps {
  title: string;
  icon: string;
  link?: string;
  color?: string;
  className?: string;
}

export function ResourceCard({
  title,
  icon,
  link,
  color = "text-gray-600",
  className = "",
}: ResourceCardProps) {
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className={`group animate-in zoom-in-50 relative h-[130px] w-[130px] ${className}`}
    >
      <div className="dark:bg-base-200 dark:border-base-100 group-hover:border-primary dark:group-hover:border-primary absolute top-0 left-0 flex min-h-full w-full flex-col items-center justify-center rounded-lg border-2 border-gray-200 bg-white py-3 shadow-sm transition-all duration-300 group-hover:shadow-xl hover:scale-105 dark:border">
        <div className="flex w-full flex-col items-center justify-center gap-2">
          <span className={`${icon} text-4xl ${color}`} />
          <h3 className="px-2 text-center font-medium text-gray-900 dark:text-gray-100">
            {title}
          </h3>
        </div>
      </div>
    </a>
  );
}
