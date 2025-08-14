interface GenerateButtonProps {
  disabled: boolean;
  isGenerating: boolean;
  onClick: () => void;
}

export function GenerateButton({
  disabled,
  isGenerating,
  onClick,
}: GenerateButtonProps) {
  return (
    <button
      type="submit"
      disabled={disabled}
      onClick={onClick}
      className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand-violet px-2 py-1 text-base font-normal leading-6 text-white shadow-[0px-0px-4px-#00000040] hover:bg-[#6600CC] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isGenerating ? (
        <>
          <span className="icon-[mdi--loading] h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <span className="icon-[material-symbols--link-rounded] h-4 w-4" />
          Generate Link
        </>
      )}
    </button>
  );
}
