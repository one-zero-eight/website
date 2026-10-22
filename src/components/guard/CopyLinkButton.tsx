import { useState } from "react";
import { Trans } from "@lingui/react/macro";
import { cn } from "@/lib/ui/cn";

export function CopyLinkButton({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      console.error("Failed to copy to clipboard");
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "btn btn-sm",
        copied ? "btn-success" : "btn-primary",
        className,
      )}
    >
      {copied ? <Trans>Copied!</Trans> : <Trans>Copy join link</Trans>}
    </button>
  );
}
