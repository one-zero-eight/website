import styles from "@/components/web-print/printers.module.css";

export function DoubleScreenContainer({ children }: { children: any }) {
  return <div className={styles.doubleScreenContainer}>{children}</div>;
}
