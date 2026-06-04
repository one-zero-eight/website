import styles from "@/components/web-print/css/printers.module.css";

export function DoubleScreenContainer({
  className,
  children,
}: {
  className: string | boolean;
  children: any;
}) {
  return (
    <div className={`${styles.doubleScreenContainer} ${className}`}>
      {children}
    </div>
  );
}
