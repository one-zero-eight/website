import { useState } from "react";
import { buildSheetsUrl, buildDocsUrl } from "./utils";

interface SetupResultProps {
  result: {
    title: string;
    fileId: string;
    fileType: string;
    roleDisplay: string;
    joinLink: string;
  };
  onDismiss?: () => void;
}

export function SetupResult({ result, onDismiss }: SetupResultProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.joinLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      console.log("Failed to copy to clipboard");
    }
  };

  const fileUrl =
    result.fileType === "spreadsheet"
      ? buildSheetsUrl(result.fileId)
      : buildDocsUrl(result.fileId);

  return (
    <div className="rounded-field mt-6 border-2 border-green-200 bg-green-50 p-6 dark:border-green-800 dark:bg-green-900/20">
      <div className="mb-4 text-center text-5xl">✅</div>
      <h3 className="mb-6 text-center text-xl font-semibold text-green-800 dark:text-green-300">
        Setup Complete!
      </h3>

      <div>
        <p className="text-base-content/80 mb-2 font-medium">
          📎 Share this link with respondents:
        </p>
        <div className="flex gap-2">
          <div className="text-base-content/90 flex-1 rounded-sm border border-blue-200 bg-blue-50 p-3 text-sm break-all dark:border-blue-800 dark:bg-blue-900/20">
            {result.joinLink}
          </div>
          <button
            onClick={handleCopy}
            className={`rounded px-4 py-3 font-medium transition-all ${
              copied
                ? "bg-green-500 text-white"
                : "bg-primary text-white hover:bg-[#6600CC]"
            }`}
            title="Copy link"
          >
            {copied ? (
              "✓"
            ) : (
              <span className="icon-[material-symbols--content-copy] text-xl" />
            )}
          </button>
        </div>
        <p className="text-base-content/60 mt-3 text-sm">
          Respondents will use this link to add their Gmail address and get
          access to the spreadsheet.
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-green-200 pt-6 dark:border-green-800">
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary inline-flex items-center gap-2 font-medium transition-colors hover:text-[#6600CC]"
        >
          <span>
            Open{" "}
            {result.fileType === "spreadsheet" ? "Spreadsheet" : "Document"}
          </span>
          <span className="icon-[material-symbols--open-in-new] text-lg" />
        </a>

        {onDismiss ? (
          <button
            onClick={onDismiss}
            className="border-base-content/20 hover:border-base-content/40 rounded-field border-2 px-3 py-2 text-sm font-medium"
          >
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  );
}
