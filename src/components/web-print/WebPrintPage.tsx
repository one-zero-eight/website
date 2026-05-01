import styles from "@/components/web-print/printers.module.css";
import themeStyles from "@/components/web-print/printers.theme.module.css";
import { DoubleScreenContainer } from "@/components/web-print/DoubleScreenContainer.tsx";
import { ConfigurationScreen } from "@/components/web-print/ConfigurationScreen.tsx";
import { ProcessingScreen } from "@/components/web-print/ProcessingScreen.tsx";
import { useState } from "react";

export function WebPrintPage() {
  const [screenSwitch, setScreenSwitch] = useState<boolean>(false);
  const [preparedDocumentURL, setPreparedDocumentURL] = useState<string>();

  return (
    <div
      className={`${themeStyles.webPrintPage} ${styles.noXOverflowFrame_full}`}
    >
      <DoubleScreenContainer
        className={screenSwitch && styles.doubleScreenContainer_moved}
      >
        <ConfigurationScreen
          screenSwitch={screenSwitch}
          setScreenSwitch={setScreenSwitch}
          preparedDocumentURL={preparedDocumentURL}
          setPreparedDocumentURL={setPreparedDocumentURL}
        />
        <ProcessingScreen
          setScreenSwitch={setScreenSwitch}
          preparedDocumentURL={preparedDocumentURL}
        />
      </DoubleScreenContainer>
    </div>
  );
}
