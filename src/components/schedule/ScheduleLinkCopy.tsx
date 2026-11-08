import { ymEvent } from "@/app/tracking/YandexMetrika";
import { cn } from "@/lib/ui/cn";
import { Trans } from "@lingui/react/macro";
import React, { useState } from "react";
import { useCopyToClipboard } from "usehooks-ts";

export default function ScheduleLinkCopy({
  url,
  copyButtonRef,
  sensitive = false,
  disabled = false,
}: {
  url: string;
  copyButtonRef: React.Ref<HTMLButtonElement>;
  sensitive?: boolean;
  disabled?: boolean;
}) {
  const [_, _copy] = useCopyToClipboard();
  const [copied, setCopied] = useState(false);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout>>();

  const copy = () => {
    ymEvent("button-copy");
    _copy(url).then((ok) => {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
      if (ok) {
        setCopied(true);
        setTimer(setTimeout(() => setCopied(false), 1500));
      } else {
        setCopied(false);
      }
    });
  };

  return (
    <div className={cn("flex flex-row gap-2", sensitive && "ym-hide-content")}>
      <input
        readOnly
        value={url}
        className={cn(
          "bg-base-300 w-full grow rounded-xl p-2",
          sensitive && "ym-disable-keys",
        )}
      />
      <button
        type="button"
        className="text-primary hover:bg-base-300 w-fit rounded-xl p-2"
        ref={copyButtonRef}
        disabled={disabled}
        onClick={copy}
      >
        {copied ? <Trans>Copied!</Trans> : <Trans>Copy</Trans>}
      </button>
    </div>
  );
}
