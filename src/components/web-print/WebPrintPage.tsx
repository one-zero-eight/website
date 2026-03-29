import styles from "@/components/web-print/printers.module.css";
import themeStyles from "@/components/web-print/printers.theme.module.css";
import { DoubleScreenContainer } from "@/components/web-print/DoubleScreenContainer.tsx";
import { ConfigurationScreen } from "@/components/web-print/ConfigurationScreen.tsx";
import { ProcessingScreen } from "@/components/web-print/ProcessingScreen.tsx";

export function WebPrintPage() {
  return (
    <div
      className={`${themeStyles.webPrintPage} ${styles.noXOverflowFrame_full}`}
    >
      <DoubleScreenContainer>
        <ConfigurationScreen />
        <ProcessingScreen />
      </DoubleScreenContainer>
    </div>
  );
}
