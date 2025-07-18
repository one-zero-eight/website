import React from "react";
import { useToast } from "./ToastContext";
import { ToastItem } from "./ToastItem";

export function ToastContainer() {
  const { toasts, hideToast } = useToast();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 w-full max-w-sm space-y-3">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onClose={hideToast} />
        </div>
      ))}
    </div>
  );
}
