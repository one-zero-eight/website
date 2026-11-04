import { ymEvent } from "@/app/tracking/YandexMetrika";
import { Trans } from "@lingui/react/macro";
import React, { useState } from "react";
import { useCopyToClipboard } from "usehooks-ts";

export default function ScheduleLinkCopy({
  url,
  copyButtonRef,
}: {
  url: string;
  copyButtonRef: React.Ref<HTMLButtonElement>;
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
    <div className="flex flex-row gap-2">
      <input
        readOnly
        value={url}
        className="bg-base-300 w-full grow rounded-xl p-2"
      />
      <button
        type="button"
        className="text-primary hover:bg-base-300 w-fit rounded-xl p-2"
        ref={copyButtonRef}
        onClick={copy}
      >
        {copied ? <Trans>Copied!</Trans> : <Trans>Copy</Trans>}
      </button>
    </div>
  );
}
