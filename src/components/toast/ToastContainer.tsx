import { FloatingPortal } from "@floating-ui/react";
import { useMediaQuery } from "usehooks-ts";
import { useToast } from "./ToastContext.tsx";
import { ToastItem } from "./ToastItem.tsx";

export function ToastContainer() {
  const { toasts, hideToast } = useToast();
  const isMobile = useMediaQuery("(max-width: 767px)");

  if (toasts.length === 0) {
    return null;
  }

  // Show only one toast on mobile (the most recent)
  const toastsToShow = isMobile ? toasts.slice(-1) : toasts;

  return (
    <FloatingPortal>
      <div className="pointer-events-none fixed top-4 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 space-y-3 overflow-hidden px-4 sm:top-4 sm:right-4 sm:left-auto sm:translate-x-0 sm:px-0">
        {toastsToShow.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onClose={hideToast} />
          </div>
        ))}
      </div>
    </FloatingPortal>
  );
}
