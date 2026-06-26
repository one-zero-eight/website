import { Modal } from "@/components/common/Modal.tsx";
import { FIND108_BORDER } from "@/components/find-108/find108-theme.ts";
import { cn } from "@/lib/ui/cn";

export function Find108Modal({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      overlayClassName="bg-black/85"
      containerClassName={cn(
        FIND108_BORDER,
        "gap-4 rounded-none bg-black p-6 text-white shadow-none",
        "[&_button]:rounded-none [&_button]:text-white/50",
        "[&_button]:hover:bg-white/10 [&_button]:hover:text-white/80",
      )}
    >
      {children}
    </Modal>
  );
}

export function Find108ModalButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        FIND108_BORDER,
        "rounded-none px-4 py-2 text-sm text-white/90 hover:bg-white/10",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
