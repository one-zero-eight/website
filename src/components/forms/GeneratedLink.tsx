interface GeneratedLinkProps {
  generatedUrl: string;
  copied: boolean;
  onCopy: () => void;
}

export function GeneratedLink({
  generatedUrl,
  copied,
  onCopy,
}: GeneratedLinkProps) {
  return (
    <div className="border-base-content/10 bg-base-content/5 rounded-field mt-6 border p-4">
      <h3 className="text-base-content mb-2 text-sm font-medium">
        Generated Link
      </h3>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={generatedUrl}
          readOnly
          className="border-base-content/20 bg-base-100 text-base-content/80 rounded-field h-10 flex-1 border-2 p-3 text-sm outline-hidden"
        />
        <button
          onClick={onCopy}
          className="bg-primary rounded-field flex h-10 items-center justify-center gap-2 px-3 py-1 text-sm font-normal text-white shadow-[0px-0px-4px-#00000040] transition-colors hover:bg-[#6600CC]"
        >
          {copied ? (
            <>
              <span className="icon-[material-symbols--check] h-4 w-4" />
              Copied!
            </>
          ) : (
            <>
              <span className="icon-[material-symbols--content-copy] h-4 w-4" />
              Copy
            </>
          )}
        </button>
      </div>
    </div>
  );
}
