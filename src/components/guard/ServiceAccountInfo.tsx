import { useState } from "react";

interface ServiceAccountInfoProps {
  email: string;
  isLoading: boolean;
}

export function ServiceAccountInfo({
  email,
  isLoading,
}: ServiceAccountInfoProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (_) {
      console.log("Failed to copy to clipboard");
    }
  };

  return (
    <div className="rounded-lg border-l-4 border-primary bg-primary/5 p-4">
      <div className="mb-2 font-medium text-contrast/80">
        Service Account Email:
      </div>
      {isLoading ? (
        <div className="font-mono text-contrast/50">Loading...</div>
      ) : (
        <div
          onClick={handleCopy}
          className={`inline-block cursor-pointer rounded px-3 py-2 font-mono text-sm transition-colors ${
            copied
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
              : "bg-contrast/5 text-contrast/90 hover:bg-contrast/10"
          }`}
          title="Click to copy"
        >
          {copied ? "✓ Copied!" : email || "Error loading email"}
        </div>
      )}
    </div>
  );
}
