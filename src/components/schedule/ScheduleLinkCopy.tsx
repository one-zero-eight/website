import { ymEvent } from "@/lib/tracking/YandexMetrika";
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
  const [timer, setTimer] = useState<any>();

  const copy = () => {
    ymEvent("button-copy", { url: url });
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
        className="w-full grow rounded-xl bg-secondary-main p-2"
      />
      <button
        className="w-fit rounded-xl p-2 text-focus hover:bg-secondary-main"
        ref={copyButtonRef}
        onClick={copy}
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
