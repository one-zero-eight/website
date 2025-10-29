import { useState, useRef } from "react";

export interface Toast {
  id: number;
  message: string;
}

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdCounter = useRef(0);

  const showToast = (message: string) => {
    const id = toastIdCounter.current++;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return { toasts, showToast, removeToast };
};
