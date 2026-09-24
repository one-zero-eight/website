import { Modal } from "@/components/common/Modal.tsx";
import type { ReactNode } from "react";

export function SportTrainingModalShell({
  open,
  onOpenChange,
  title,
  titleBadges,
  closeDisabled,
  onBack,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  titleBadges?: ReactNode;
  closeDisabled?: boolean;
  onBack?: () => void;
  children: ReactNode;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && closeDisabled) return;
        onOpenChange(nextOpen);
      }}
      hideHeader
      closeOnOutsidePress={!closeDisabled}
      containerClassName="max-h-[min(90vh,720px)] gap-0 overflow-hidden border-0 p-0"
      overlayClassName="bg-black/75"
    >
      <div className="border-b-base-300 flex shrink-0 items-start justify-between gap-2 border-b p-4">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          {onBack ? (
            <button
              type="button"
              className="text-base-content/50 hover:bg-base-300/50 hover:text-base-content/75 rounded-box flex h-10 w-10 shrink-0 items-center justify-center active:border active:border-[#8D4CF6] active:text-[#8D4CF6]"
              onClick={onBack}
              disabled={closeDisabled}
            >
              <span className="icon-[material-symbols--arrow-back] text-2xl" />
            </button>
          ) : null}
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-lg font-semibold wrap-break-word">{title}</h2>
            {titleBadges ? (
              <div className="flex flex-wrap items-center gap-2">
                {titleBadges}
              </div>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          className="text-base-content/50 hover:bg-base-300/50 hover:text-base-content/75 rounded-box flex h-10 w-10 shrink-0 items-center justify-center active:border active:border-[#8D4CF6] active:text-[#8D4CF6]"
          onClick={() => onOpenChange(false)}
          disabled={closeDisabled}
        >
          <span className="icon-[material-symbols--close] text-2xl" />
        </button>
      </div>
      {children}
    </Modal>
  );
}
