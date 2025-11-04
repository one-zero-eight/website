import { useState } from "react";
import { MESSAGES } from "./consts";

interface CopyLinkButtonProps {
  text: string;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
}

export function CopyLinkButton({
  text,
  variant = "primary",
  size = "md",
}: CopyLinkButtonProps) {
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

  const baseClasses = "rounded-field font-medium transition-all";
  const sizeClasses = {
    sm: "px-2.5 py-1.5 text-xs",
    md: "px-3.5 py-2.5 text-sm",
    lg: "px-4 py-3 text-base",
  };
  const variantClasses = {
    primary: copied
      ? "bg-green-500 text-white"
      : "bg-primary text-white hover:bg-[#6600CC]",
    secondary: copied
      ? "bg-green-500 text-white"
      : "border-2 border-base-content/20 hover:border-base-content/40",
  };

  return (
    <button
      onClick={handleCopy}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]}`}
      title="Copy link"
    >
      {copied ? (
        MESSAGES.copySuccess
      ) : (
        <span className="icon-[material-symbols--content-copy] text-xl" />
      )}
    </button>
  );
}
