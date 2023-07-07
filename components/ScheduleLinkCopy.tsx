"use client";
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
        className="p-2 rounded-xl grow min-w-0 bg-light_secondary dark:bg-secondary"
      />
      <button
        className="p-2 rounded-xl w-fit selected"
        ref={copyButtonRef}
        onClick={copy}
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
