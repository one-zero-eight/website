import { ModalWindow } from "@/components/events/CreationModal/ModalWindow";
import { ReactNode } from "react";

export function Alert({
  children,
  isShown,
  onClose,
}: {
  children: ReactNode;
  isShown: boolean;
  onClose: () => void;
}) {
  return (
    <ModalWindow open={isShown} onOpenChange={onClose} title={"Warning"}>
      {children}
    </ModalWindow>
  );
}
