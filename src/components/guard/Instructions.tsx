import { useState } from "react";

interface ServiceAccountEmailProps {
  email: string;
}

export function ServiceAccountEmail({ email }: ServiceAccountEmailProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!email) return;

    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (_) {
      console.error("Failed to copy to clipboard");
    }
  };

  return (
    <span
      onClick={handleCopy}
      className={`inline-block cursor-pointer rounded px-2 py-0.5 font-mono text-xs transition-colors ${
        copied
          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
          : "bg-contrast/10 hover:bg-contrast/20"
      }`}
      title="Click to copy"
    >
      {copied ? "✓ Copied!" : email}
    </span>
  );
}

interface CreateInstructionsProps {
  serviceEmail: string;
}

export function CreateInstructions({ serviceEmail }: CreateInstructionsProps) {
  return (
    <div className="text-contrast/80 mt-3 rounded-sm border-l-4 border-blue-400 bg-blue-50 p-3 text-sm dark:border-blue-600 dark:bg-blue-900/20">
      <ol className="list-inside list-decimal space-y-1">
        <li>
          We will create a new Google Spreadsheet using the title you provide.
        </li>
        <li>
          The service account <ServiceAccountEmail email={serviceEmail} /> will
          own the file.
        </li>
        <li>
          You will get a join link to share with respondents, they will get
          access after signing in via SSO.
        </li>
      </ol>
      <div className="mt-3 rounded-sm border-l-4 border-yellow-400 bg-yellow-50 p-3 dark:border-yellow-600 dark:bg-yellow-900/20">
        <p className="text-contrast/80 text-sm">
          💡 Spreadsheet must be owned by the service account so only it can add
          editors. Otherwise, anyone can add editors and you lose control over
          who has access to the spreadsheet.
        </p>
      </div>
    </div>
  );
}

interface CopyInstructionsProps {
  serviceEmail: string;
}

export function CopyInstructions({ serviceEmail }: CopyInstructionsProps) {
  return (
    <div className="text-contrast/80 mt-3 rounded-sm border-l-4 border-blue-400 bg-blue-50 p-3 text-sm dark:border-blue-600 dark:bg-blue-900/20">
      <ol className="list-inside list-decimal space-y-1">
        <li>
          Open your spreadsheet and give Editor access to{" "}
          <ServiceAccountEmail email={serviceEmail} />
        </li>
        <li>Paste the spreadsheet URL below.</li>
        <li>We will create a copy of your file owned by the service account</li>
        <li>
          You will get a join link to share with respondents, they will get
          access after signing in via SSO.
        </li>
        <li>Your original file remains unchanged and under your control.</li>
      </ol>
      <div className="mt-3 rounded-sm border-l-4 border-yellow-400 bg-yellow-50 p-3 dark:border-yellow-600 dark:bg-yellow-900/20">
        <p className="text-contrast/80 text-sm">
          💡 The protected copy is owned by the service account so only it can
          add editors. This ensures you have full control over who has access.
        </p>
      </div>
    </div>
  );
}
