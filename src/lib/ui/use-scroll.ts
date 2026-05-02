import { useCallback, useEffect, useRef, useState } from "react";

export function useScroll(elRef: React.RefObject<HTMLElement | null>): {
  x: number;
  y: number;
} {
  const [scroll, setScroll] = useState({ x: 0, y: 0 });
  const rafId = useRef<number | null>(null);

  const handleScroll = useCallback(() => {
    if (rafId.current !== null) return;
    rafId.current = requestAnimationFrame(() => {
      const el = elRef.current;
      if (el) {
        setScroll({ x: el.scrollLeft, y: el.scrollTop });
      }
      rafId.current = null;
    });
  }, [elRef]);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    handleScroll();
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    };
  }, [elRef, handleScroll]);

  return scroll;
}
