import { useState } from "react";

interface SetupResultProps {
  result: {
    sheetTitle: string;
    spreadsheetId: string;
    roleDisplay: string;
    joinLink: string;
  };
}

export function SetupResult({ result }: SetupResultProps) {
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

  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${result.spreadsheetId}/edit`;

  return (
    <div className="mt-6 rounded-lg border-2 border-green-200 bg-green-50 p-6 dark:border-green-800 dark:bg-green-900/20">
      <div className="mb-4 text-center text-5xl">✅</div>
      <h3 className="mb-6 text-center text-xl font-semibold text-green-800 dark:text-green-300">
        Setup Complete!
      </h3>

      <div>
        <p className="mb-2 font-medium text-contrast/80">
          📎 Share this link with respondents:
        </p>
        <div className="flex gap-2">
          <div className="flex-1 break-all rounded border border-blue-200 bg-blue-50 p-3 text-sm text-contrast/90 dark:border-blue-800 dark:bg-blue-900/20">
            {result.joinLink}
          </div>
          <button
            onClick={handleCopy}
            className={`rounded px-4 py-3 font-medium transition-all ${
              copied
                ? "bg-green-500 text-white"
                : "bg-brand-violet text-white hover:bg-[#6600CC]"
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
        <p className="mt-3 text-sm text-contrast/60">
          Respondents will use this link to add their Gmail address and get
          access to the spreadsheet.
        </p>
      </div>

      <div className="mt-6 border-t border-green-200 pt-6 dark:border-green-800">
        <a
          href={spreadsheetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 font-medium text-brand-violet transition-colors hover:text-[#6600CC]"
        >
          <span>Open Spreadsheet</span>
          <span className="icon-[material-symbols--open-in-new] text-lg" />
        </a>
      </div>
    </div>
  );
}
