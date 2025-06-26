import React from "react";
import { useEffect } from "react";

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
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[1000] animate-in fade-in duration-250 backdrop-blur-[3px]">      <div
        className={`bg-floating p-5 px-6 pb-4 rounded-xl text-white min-w-80 max-w-lg w-full relative animate-in zoom-in-95 duration-300 whitespace-pre-wrap break-words ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          className="absolute top-2 right-2 text-lg bg-transparent border-none text-white cursor-pointer z-10 w-6 h-6 flex rounded items-center justify-center p-0 transition-all duration-200 outline-none hover:text-red-500 focus:outline-none focus:shadow-none active:scale-90" 
          onClick={onClose}
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
};

export default Modal;
