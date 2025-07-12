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
  icon,
  border = false,
  className = "",
}: DefaultButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-10 items-center gap-2 rounded-lg bg-brand-violet px-4 py-2 text-sm font-medium transition-colors ${border ? "border-2 border-gray-400" : ""} ${className}`}
    >
      {icon && <span className="flex items-center">{icon}</span>}
      {content}
    </button>
  );
};
