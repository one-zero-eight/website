import { FloatingPortal } from "@floating-ui/react";
import { useEffect, useState } from "react";
import { useToast } from "./ToastContext.tsx";
import { ToastItem } from "./ToastItem.tsx";

export function ToastContainer() {
  const { toasts, hideToast } = useToast();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);

    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  if (toasts.length === 0) {
    return null;
  }

  // На мобильных устройствах показываем только один toast (последний)
  const toastsToShow = isMobile ? toasts.slice(-1) : toasts;

  return (
    <FloatingPortal>
      <div className="pointer-events-none fixed left-1/2 top-4 z-50 w-full max-w-sm -translate-x-1/2 space-y-3 overflow-hidden px-4 sm:left-auto sm:right-4 sm:top-4 sm:translate-x-0 sm:px-0">
        {toastsToShow.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onClose={hideToast} />
          </div>
        ))}
      </div>
    </FloatingPortal>
  );
}
