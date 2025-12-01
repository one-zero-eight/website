import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import { Toast, ToastType } from "./types.ts";

const toastBorders: Record<ToastType, string> = {
  success: "border-green-500",
  error: "border-red-500",
  warning: "border-yellow-500",
  info: "border-blue-500",
};

const toastColors: Record<ToastType, string> = {
  success: "text-green-500",
  error: "text-red-500",
  warning: "text-yellow-500",
  info: "text-blue-500",
};

const toastIcons: Record<ToastType, string> = {
  success: "icon-[material-symbols--check-circle-outline]",
  error: "icon-[material-symbols--error-outline]",
  warning: "icon-[material-symbols--warning-outline]",
  info: "icon-[material-symbols--info-outline]",
};

export function ToastItem({
  toast,
  onClose,
}: {
  toast: Toast;
  onClose: (id: string) => void;
}) {
  const [isLeaving, setIsLeaving] = useState(false);
  const [isEntering, setIsEntering] = useState(true);

  // Отслеживаем изменение isVisible из пропса
  useEffect(() => {
    if (toast.isVisible === false && !isLeaving) {
      setIsLeaving(true);
      // Через время анимации удаляем компонент
      setTimeout(() => {
        onClose(toast.id);
      }, 300);
    }
  }, [toast.isVisible, isLeaving, onClose, toast.id]);

  const handleClose = useCallback(() => {
    if (!isLeaving) {
      setIsLeaving(true);
      // Даем время для анимации закрытия
      setTimeout(() => {
        onClose(toast.id);
      }, 300);
    }
  }, [onClose, toast.id, isLeaving]);

  useEffect(() => {
    // Запускаем анимацию появления
    const timer = setTimeout(() => {
      setIsEntering(false);
    }, 50); // Небольшая задержка для запуска анимации

    return () => clearTimeout(timer);
  }, []);

  // Автоматическое закрытие если задана продолжительность
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, toast.duration);

      return () => clearTimeout(timer);
    }
  }, [toast.duration, handleClose]);

  return (
    <div
      className={clsx(
        "alert transition-all duration-300 ease-in-out",
        "transform-gpu",
        isLeaving &&
          "-translate-y-full opacity-0 sm:translate-x-full sm:translate-y-0",
        isEntering &&
          "-translate-y-full opacity-0 sm:translate-x-full sm:translate-y-0",
        toastBorders[toast.type],
      )}
    >
      <span
        className={clsx(
          "text-2xl",
          toastColors[toast.type],
          clsx(toastIcons[toast.type]),
        )}
      />
      <div className="">
        <h4 className="font-bold">{toast.title}</h4>
        {toast.message && <p className="text-xs">{toast.message}</p>}
      </div>
      <button
        onClick={handleClose}
        className="btn btn-square btn-sm"
        aria-label="Close notification"
      >
        <span className="icon-[material-symbols--close] text-lg" />
      </button>
    </div>
  );
}
