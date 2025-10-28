import clsx from "clsx";

type DefaultButtonProps = {
  content: string;
  onClick: () => void;
  icon?: React.ReactNode;
  border?: boolean;
  className?: string;
};

export const DefaultButton = ({
  content,
  onClick,
  className = "",
}: DefaultButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "bg-brand-violet flex h-10 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors",
        className,
      )}
    >
      {content}
    </button>
  );
};
