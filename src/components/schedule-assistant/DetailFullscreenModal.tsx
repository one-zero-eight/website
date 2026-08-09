import { Modal } from "@/components/common/Modal.tsx";

export function DetailFullscreenModal({
  open,
  onOpenChange,
  title,
  children,
}: React.PropsWithChildren<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
}>) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      closeOnOutsidePress={false}
      overlayClassName="p-0"
      containerClassName="detail h-dvh max-h-dvh min-h-0 w-full max-w-none rounded-none border-0"
    >
      <div className="flex min-h-0 flex-1 [scrollbar-width:thin] flex-col overflow-y-auto">
        {children}
      </div>
    </Modal>
  );
}
