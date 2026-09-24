import { Modal } from "@/components/common/Modal.tsx";
import { useToast } from "@/components/toast";
import { useState } from "react";

export function CopyableTextModal({
  open,
  text,
  title,
  copiedDescription,
  onOpenChange,
}: {
  open: boolean;
  text: string;
  title: string;
  copiedDescription: string;
  onOpenChange: (open: boolean) => void;
}) {
  const { showSuccess, showError } = useToast();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showSuccess("Скопировано", copiedDescription);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      showError("Ошибка", "Не удалось скопировать текст");
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      overlayClassName="!flex items-start justify-center overflow-y-auto pt-[max(1rem,8vh)]"
      containerClassName="max-h-[calc(100dvh-2rem-8vh)] max-w-3xl overflow-y-auto"
    >
      <pre className="bg-base-100 rounded-box max-h-[min(60dvh,32rem)] overflow-auto p-3 text-xs wrap-break-word whitespace-pre-wrap">
        {text}
      </pre>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => onOpenChange(false)}
        >
          Закрыть
        </button>
        <button type="button" className="btn btn-primary" onClick={handleCopy}>
          <span
            className={
              copied
                ? "icon-[material-symbols--check] text-lg"
                : "icon-[material-symbols--content-copy-outline] text-lg"
            }
          />
          {copied ? "Скопировано" : "Копировать"}
        </button>
      </div>
    </Modal>
  );
}
