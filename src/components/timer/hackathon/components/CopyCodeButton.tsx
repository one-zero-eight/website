import Tooltip from "@/components/common/Tooltip.tsx";
import { useState } from "react";
import { useCopyToClipboard } from "usehooks-ts";

const COPIED_LABEL_DURATION_MS = 1500;

export function CopyCodeButton({ code }: { code: string }) {
  const [, copy] = useCopyToClipboard();
  const [isCopied, setIsCopied] = useState(false);

  async function handleClick() {
    const isSuccessful = await copy(code);
    if (!isSuccessful) return;
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), COPIED_LABEL_DURATION_MS);
  }

  return (
    <Tooltip content="Copy join code">
      <button
        type="button"
        className="btn btn-sm relative"
        onClick={handleClick}
      >
        <span className="font-mono tracking-widest">{code}</span>
        {isCopied ? (
          <span className="icon-[material-symbols--check] text-success text-lg" />
        ) : (
          <span className="icon-[material-symbols--content-copy-outline] text-lg" />
        )}
      </button>
    </Tooltip>
  );
}
