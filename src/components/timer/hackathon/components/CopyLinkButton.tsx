import Tooltip from "@/components/common/Tooltip.tsx";
import { useState } from "react";
import { useCopyToClipboard } from "usehooks-ts";

const COPIED_LABEL_DURATION_MS = 1500;

export function CopyLinkButton({ link }: { link: string }) {
  const [, copy] = useCopyToClipboard();
  const [isCopied, setIsCopied] = useState(false);

  async function handleClick() {
    const isSuccessful = await copy(link);
    if (!isSuccessful) return;
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), COPIED_LABEL_DURATION_MS);
  }

  return (
    <Tooltip content="Copy invitation link">
      <button
        type="button"
        className="btn btn-sm relative max-w-full"
        onClick={handleClick}
      >
        <span className="truncate font-mono text-xs">{link}</span>
        {isCopied ? (
          <span className="icon-[material-symbols--check] text-success text-lg" />
        ) : (
          <span className="icon-[material-symbols--content-copy-outline] text-lg" />
        )}
      </button>
    </Tooltip>
  );
}
