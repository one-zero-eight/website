import { useState } from "react";
import { cn } from "@/lib/ui/cn";

export function ServiceAccountEmail({ email }: { email: string }) {
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
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "badge badge-sm font-mono transition-colors",
        copied ? "badge-success" : "badge-ghost hover:badge-soft",
      )}
    >
      {copied ? "Copied!" : email || "…"}
    </button>
  );
}

export function CopyInstructions({ serviceEmail }: { serviceEmail: string }) {
  return (
    <div className="alert alert-info alert-soft">
      <span className="text-sm">
        Give Editor access to the service account{" "}
        <ServiceAccountEmail email={serviceEmail} />, then paste the spreadsheet
        URL below.
      </span>
    </div>
  );
}
