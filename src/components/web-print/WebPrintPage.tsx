import styles from "@/components/web-print/printers.module.css";
import themeStyles from "@/components/web-print/printers.theme.module.css";
import { DoubleScreenContainer } from "@/components/web-print/DoubleScreenContainer.tsx";
import { ConfigurationScreen } from "@/components/web-print/ConfigurationScreen.tsx";
import { ProcessingScreen } from "@/components/web-print/ProcessingScreen.tsx";
import { useState } from "react";

export function WebPrintPage() {
  const [jobId, setJobId] = useState<number>();
  const [jobState, setJobState] = useState<boolean>(false);
  const [preparedDocumentURL, setPreparedDocumentURL] = useState<string>();
  const [printJobActualPapersCount, setPrintJobActualPapersCount] =
    useState<number>(0);

  return (
    <div
      className={`${themeStyles.webPrintPage} ${styles.noXOverflowFrame_full}`}
    >
      <DoubleScreenContainer
        className={jobState && styles.doubleScreenContainer_moved}
      >
        <ConfigurationScreen
          setJobState={setJobState}
          preparedDocumentURL={preparedDocumentURL}
          setPreparedDocumentURL={setPreparedDocumentURL}
          setJobId={setJobId}
          setPrintJobActualPapersCount={setPrintJobActualPapersCount}
        />
        <ProcessingScreen
          jobState={jobState}
          setJobState={setJobState}
          preparedDocumentURL={preparedDocumentURL}
          jobId={jobId}
          printJobActualPapersCount={printJobActualPapersCount}
        />
      </DoubleScreenContainer>
    </div>
  );
}
