import React from "react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: "warning" | "error" | "info";
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  type = "warning",
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case "error":
        return {
          iconColor: "text-red-500",
          buttonColor: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
        };
      case "info":
        return {
          iconColor: "text-blue-500",
          buttonColor: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
        };
      case "warning":
      default:
        return {
          iconColor: "text-yellow-500",
          buttonColor:
            "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500",
        };
    }
  };

  const typeStyles = getTypeStyles();

  const getIcon = () => {
    switch (type) {
      case "error":
        return (
          <svg
            className={`h-6 w-6 ${typeStyles.iconColor}`}
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
      case "info":
        return (
          <svg
            className={`h-6 w-6 ${typeStyles.iconColor}`}
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
      case "warning":
      default:
        return (
          <svg
            className={`h-6 w-6 ${typeStyles.iconColor}`}
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
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative mx-4 w-full max-w-md transform rounded-lg bg-white shadow-xl transition-all">
        <div className="p-6">
          {/* Icon and Title */}
          <div className="mb-4 flex items-center gap-3">
            {getIcon()}
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>

          {/* Message */}
          <p className="mb-6 leading-relaxed text-gray-600">{message}</p>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`rounded-md px-4 py-2 text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${typeStyles.buttonColor}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
