import React from "react";
import { useEffect } from "react";

type ModalProps = {
  className?: string;
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
};
{
  /* Компонент модалки в пропсы принимает видимость, обработчик закрытия и контент */
}
const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  children,
  className = "",
  title,
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
    <div className="fixed inset-0 z-10 grid place-items-center bg-black/75 @container/modal">
      <div className="flex h-fit w-full max-w-lg flex-col p-4 outline-none">
        <div className="overflow-hidden rounded-2xl bg-floating">
          <div className={`flex flex-col p-4 @2xl/modal:p-8 min-w-0 ${className}`}>
            {/* Heading and close button */}
            <div className="mb-0 flex w-full flex-row">
              {title && (
                <div className="grow items-center text-3xl font-semibold break-words overflow-hidden pr-2">
                  {title}
                </div>
              )}
              <button
                type="button"
                className="-mr-2 -mt-2 flex h-12 w-12 items-center justify-center rounded-2xl text-contrast/50 hover:bg-primary-hover/50 hover:text-contrast/75"
                onClick={onClose}
              >
                <span className="icon-[material-symbols--close] text-4xl" />
              </button>
            </div>

            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
