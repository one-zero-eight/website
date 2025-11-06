import { RefObject, useCallback, useEffect, useState } from "react";

export function useElementWidth(myRef: RefObject<HTMLElement | null>) {
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

export function useElementHeight(myRef: RefObject<HTMLElement | null>) {
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
