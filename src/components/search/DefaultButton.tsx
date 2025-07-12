export const DefaultButton = ({
  content,
  onClick,
}: {
  content: string;
  onClick: () => void;
}) => {
  return (
    <button
      onClick={onClick}
      className="h-10 rounded-md bg-brand-violet px-6 font-semibold text-white hover:bg-purple-600"
    >
      {content}
    </button>
  );
};
