import clsx from "clsx";

type DefaultButtonProps = {
  content: string;
  onClick: () => void;
  icon?: React.ReactNode;
  border?: boolean;
  className?: string;
};

export const PageActionButton = ({
  content,
  onClick,
  icon,
  border = false,
  className = "",
}: DefaultButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "bg-primary sm:rounded-field flex h-10 items-center gap-2 rounded-r-lg px-4 py-2 text-sm font-medium text-white transition-colors",
        border && "border! border-gray-400",
        className,
      )}
    >
      {icon && <span className="flex items-center">{icon}</span>}
      <span className="hidden sm:inline">{content}</span>
    </button>
  );
};
