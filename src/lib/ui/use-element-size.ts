import { useCallback, useEffect, useRef, useState } from "react";

export function useElementSize(elRef: React.RefObject<HTMLElement | null>): {
  width: number;
  height: number;
} {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const observerRef = useRef<ResizeObserver | null>(null);

  const handleResize = useCallback(() => {
    setSize({
      width: elRef.current?.offsetWidth ?? 0,
      height: elRef.current?.offsetHeight ?? 0,
    });
  }, [elRef]);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    handleResize();

    observerRef.current = new ResizeObserver(handleResize);
    observerRef.current.observe(el);

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [elRef, handleResize]);

  return size;
}

export function useElementWidth(myRef: React.RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(0);

  const handleResize = useCallback(() => {
    setWidth(myRef.current?.offsetWidth ?? 0);
  }, [myRef]);

  useEffect(() => {
    handleResize();

    window.addEventListener("load", handleResize);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("load", handleResize);
      window.removeEventListener("resize", handleResize);
    };
  }, [myRef, handleResize]);

  return width;
}

export function useElementHeight(myRef: React.RefObject<HTMLElement | null>) {
  const [height, setHeight] = useState(0);

  const handleResize = useCallback(() => {
    setHeight(myRef.current?.offsetHeight ?? 0);
  }, [myRef]);

  useEffect(() => {
    handleResize();

    window.addEventListener("load", handleResize);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("load", handleResize);
      window.removeEventListener("resize", handleResize);
    };
  }, [myRef, handleResize]);

  return height;
}
