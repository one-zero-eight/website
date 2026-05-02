import { Modal } from "@/components/common/Modal.tsx";
import { cn } from "@/lib/ui/cn";

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
  if (!isOpen) {
    return null;
  }

  const getTypeStyles = () => {
    switch (type) {
      case "error":
        return {
          iconColor: "text-red-500",
          buttonColor: "btn-error",
        };
      case "info":
        return {
          iconColor: "text-blue-500",
          buttonColor: "btn-info",
        };
      case "warning":
      default:
        return {
          iconColor: "text-yellow-500",
          buttonColor: "btn-warning",
        };
    }
  };

  const typeStyles = getTypeStyles();

  const getIcon = () => {
    switch (type) {
      case "error":
        return (
          <svg
            className={cn("h-6 w-6", typeStyles.iconColor)}
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
            className={cn("h-6 w-6", typeStyles.iconColor)}
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
            className={cn("h-6 w-6", typeStyles.iconColor)}
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
    <Modal
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      title={
        <div className="flex items-center gap-3">
          {getIcon()}
          {title}
        </div>
      }
    >
      <p className="text-base-content/75 mb-6 leading-relaxed">{message}</p>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="btn">
          {cancelText}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={cn("btn", typeStyles.buttonColor)}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
