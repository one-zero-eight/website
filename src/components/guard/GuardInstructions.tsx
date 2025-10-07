import { useState } from "react";

interface GuardInstructionsProps {
  serviceEmail: string;
}

export function GuardInstructions({ serviceEmail }: GuardInstructionsProps) {
  const [emailCopied, setEmailCopied] = useState(false);

  const handleEmailCopy = async () => {
    if (!serviceEmail) return;

    try {
      await navigator.clipboard.writeText(serviceEmail);
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 1500);
    } catch (_) {
      console.log("Failed to copy to clipboard");
    }
  };

  return (
    <div className="mb-6 rounded border-l-4 border-yellow-400 bg-yellow-50 p-4 dark:border-yellow-600 dark:bg-yellow-900/20">
      <div className="mb-2 font-semibold text-contrast/90">
        📋 Instructions:
      </div>
      <ol className="list-inside list-decimal space-y-2 text-sm text-contrast/80">
        <li>
          Share your spreadsheet with the{" "}
          {serviceEmail ? (
            <span
              onClick={handleEmailCopy}
              className={`inline-block cursor-pointer rounded px-2 py-0.5 font-mono text-xs transition-colors ${
                emailCopied
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  : "bg-contrast/10 hover:bg-contrast/20"
              }`}
              title="Click to copy"
            >
              {emailCopied ? "✓ Copied!" : serviceEmail}
            </span>
          ) : (
            <span className="font-mono text-xs">service account</span>
          )}{" "}
          as <strong>Editor</strong>
        </li>
        <li>Copy the Spreadsheet ID from the URL</li>
        <li>Choose the role for respondents (Writer or Reader)</li>
        <li>Click the button to setup and get the join link</li>
      </ol>
      <div className="mt-3 rounded border-l-4 border-blue-400 bg-blue-50 p-3 dark:border-blue-600 dark:bg-blue-900/20">
        <p className="text-sm text-contrast/80">
          💡 The sheet should be shared as{" "}
          <strong>"Anyone on the internet with the link can view"</strong> for
          respondents to not give them access until they are authorized via
          InNoHassle Guard.
        </p>
      </div>
    </div>
  );
}
