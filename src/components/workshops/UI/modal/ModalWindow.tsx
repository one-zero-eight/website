import React from "react";
import { useEffect } from "react";
import styles from "./ModalWindow.module.css";

type ModalProps = {
  className?: string;
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
};
{
  /* Компонент модалки в пропсы принимает видимость, обработчик закрытия и контент */
}
const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  children,
  className = "",
}) => {
  useEffect(() => {
    {
      /* Обработчик для закрытия модалки по клавише Escape */
    }
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    {
      /* Добавляем слушатель только если модалка отрисована */
    }
    if (visible) {
      document.addEventListener("keydown", handleEscKey);
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div className={styles["modal-backdrop"]}>
      <div
        className={`${styles["modal-content"]} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className={styles["modal-close"]} onClick={onClose}>
          x
        </button>
        {children}
      </div>
    </div>
  );
};

export default Modal;
