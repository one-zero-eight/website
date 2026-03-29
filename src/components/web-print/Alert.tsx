import { ModalWindow } from "@/components/events/CreationModal/ModalWindow";
import fontStyles from "@/components/web-print/printers.fonts.module.css";

export function Alert({
  text,
  isShown,
  onClose,
}: {
  text: string | null;
  isShown: boolean;
  onClose: () => void;
}) {
  const alertParts = text?.split("\n").map((elem, i) => (
    <p key={i} className={fontStyles.alertFont}>
      {elem}
    </p>
  ));

  return (
    <ModalWindow open={isShown} onOpenChange={onClose} title={"Warning"}>
      {alertParts}
    </ModalWindow>
  );
}
