import type { MessageDescriptor } from "@lingui/core";

export type ToastText = string | MessageDescriptor;

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  title: ToastText;
  message?: ToastText;
  duration?: number;
  isVisible?: boolean;
}

export interface ConfirmOptions {
  title: ToastText;
  message: ToastText;
  confirmText?: ToastText;
  cancelText?: ToastText;
  type?: "warning" | "error" | "info";
}

export interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, "id">) => void;
  hideToast: (id: string) => void;
  showSuccess: (title: ToastText, message?: ToastText) => void;
  showError: (title: ToastText, message?: ToastText) => void;
  showWarning: (title: ToastText, message?: ToastText) => void;
  showInfo: (title: ToastText, message?: ToastText) => void;
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
}
