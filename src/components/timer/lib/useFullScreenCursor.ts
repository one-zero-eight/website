import { useEffect, useRef } from "react";

export const useFullscreenCursor = (
  containerRef: React.RefObject<HTMLDivElement | null>,
  hideDelay = 12000,
) => {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        document.body.classList.add("fullscreen-mode");
        startHideTimer();
      } else {
        document.body.classList.remove("fullscreen-mode", "cursor-hidden");
      }
    };

    const handleMouseMove = () => {
      if (!document.fullscreenElement) return;

      document.body.classList.remove("cursor-hidden");

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        if (document.fullscreenElement) {
          document.body.classList.add("cursor-hidden");
        }
      }, hideDelay);
    };

    const startHideTimer = () => {
      timeoutRef.current = setTimeout(() => {
        if (document.fullscreenElement) {
          document.body.classList.add("cursor-hidden");
        }
      }, hideDelay);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("mousemove", handleMouseMove);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [hideDelay]);
};
