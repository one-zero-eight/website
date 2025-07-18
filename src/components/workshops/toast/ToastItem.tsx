import React, { useEffect, useState, useCallback } from "react";
import { Toast as ToastType } from "./types";

interface ToastItemProps {
  toast: ToastType;
  onClose: (id: string) => void;
}

export function ToastItem({ toast, onClose }: ToastItemProps) {
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

  const getToastStyles = () => {
    const baseStyles =
      "flex items-start gap-3 p-4 rounded-lg shadow-lg border-l-4 transition-all duration-300 ease-in-out transform bg-primary text-contrast";

    if (isLeaving) {
      return `${baseStyles} translate-y-[-100%] opacity-0 sm:translate-y-0 sm:translate-x-full`;
    }

    if (isEntering) {
      return `${baseStyles} translate-y-[-100%] opacity-0 sm:translate-y-0 sm:translate-x-full`;
    }

    switch (toast.type) {
      case "success":
        return `${baseStyles} border-green-500`;
      case "error":
        return `${baseStyles} border-red-500`;
      case "warning":
        return `${baseStyles} border-yellow-500`;
      case "info":
        return `${baseStyles} border-blue-500`;
      default:
        return `${baseStyles} border-gray-500`;
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return (
          <svg
            className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "error":
        return (
          <svg
            className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "warning":
        return (
          <svg
            className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "info":
        return (
          <svg
            className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  return (
    <div className={getToastStyles()}>
      {getIcon()}
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-semibold">{toast.title}</h4>
        {toast.message && (
          <p className="mt-1 text-sm opacity-90">{toast.message}</p>
        )}
      </div>
      <button
        onClick={handleClose}
        className="ml-2 flex-shrink-0 rounded p-1 transition-colors hover:bg-gray-200 dark:hover:bg-gray-600"
        aria-label="Close notification"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}
