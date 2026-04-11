import styles from "@/components/web-print/printers.module.css";
import { useEffect, useRef } from "react";

export function Switch({
  state,
  onSwitched,
}: {
  state: boolean;
  onSwitched: (state: boolean) => void;
}) {
  const buttonReference = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const button = buttonReference.current;
    if (!button) return;
    function click() {
      onSwitched(!state);
    }
    button.addEventListener("click", click);
    return () => {
      button.removeEventListener("click", click);
    };
  }, [onSwitched, state]);

  return (
    <div
      ref={buttonReference}
      className={`${styles.switch} ${state && styles.switch_on}`}
    >
      <div className={styles.switchPoint}></div>
    </div>
  );
}
