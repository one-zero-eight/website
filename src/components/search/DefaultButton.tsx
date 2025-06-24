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
      className="rounded-md bg-purple-600 px-6 py-2 font-semibold text-white hover:bg-purple-700"
    >
      {content}
    </button>
  );
};
