import styles from "@/components/web-print/css/printers.module.css";
import fontStyles from "@/components/web-print/css/printers.fonts.module.css";
import marginStyles from "@/components/web-print/css/printers.margins.module.css";
import { ConfigurationHeader } from "@/components/web-print/ConfigurationHeader.tsx";
import { JSX, RefObject, useState } from "react";
import { FileDrop } from "@/components/web-print/FileDrop.tsx";
import { Modal } from "@/components/common/Modal.tsx";
import { PrintJobStartAndWait } from "@/components/web-print/PrintJobStartAndWait.tsx";
import { ScanJobStartAndWait } from "@/components/web-print/ScanJobStartAndWait.tsx";
import { PaperCountIndication } from "@/components/web-print/PaperCountIndication.tsx";

export function ConfigurationScreen({
  screenSwitch,
  setScreenSwitch,
  prepareFile,
  getFile,
  preparedFile,
  preparedFileName,
  isFilePreparing,
  isFileDownloading,
  showPopupWithExceptionDetail,
  preparedFilePagesCount,
  stopJobsRef,
  setPreparedFileName,
  setPreparedFilePagesCount,
  configurationType,
  setConfigurationType,
  setScannerInProgressTransfer,
  oneMoreScanTransfer,
  setOneMoreScanTransfer,
  fileBlob,
  downloadFileName,
  startButtonPosition,
}: {
  screenSwitch: boolean;
  setScreenSwitch: (value: boolean) => void;
  prepareFile: (file: File) => Promise<string>;
  getFile: (filename: string) => Promise<void>;
  preparedFile: File | undefined;
  preparedFileName: string | undefined;
  isFilePreparing: boolean;
  isFileDownloading: boolean;
  showPopupWithExceptionDetail: (prefix: string, exception: any) => void;
  preparedFilePagesCount: number | undefined;
  stopJobsRef: RefObject<boolean>;
  setPreparedFileName: (value: string) => void;
  setPreparedFilePagesCount: (value: number) => void;
  configurationType: boolean;
  setConfigurationType: (value: boolean) => void;
  setScannerInProgressTransfer: (value: boolean) => void;
  oneMoreScanTransfer: boolean;
  setOneMoreScanTransfer: (value: boolean) => void;
  fileBlob: string | undefined;
  downloadFileName: string | undefined;
  startButtonPosition: boolean;
}) {
  const [alert, setAlert] = useState<JSX.Element | null>(null);

  const [printInProgressTransfer, setPrintInProgressTransfer] =
    useState<boolean>(false);
  const [actualPapersCountTransfer, setActualPapersCountTransfer] =
    useState<number>(0);
  const [printStartTrigger, setPrintStartTrigger] = useState<boolean>(false);

  return (
    <div className={styles.ordinaryScreen}>
      <div className={styles.ordinaryScreen__contentSizeRestrictor}>
        <div className={styles.configurationBox}>
          <ConfigurationHeader
            configurationType={configurationType}
            onClick={() => setConfigurationType(!configurationType)}
          />
          <PrintJobStartAndWait
            rootStyles={configurationType ? "" : "hidden!"}
            preparedFileName={preparedFileName}
            showPopupWithExceptionDetail={showPopupWithExceptionDetail}
            isFilePreparing={isFilePreparing}
            setScreenSwitch={setScreenSwitch}
            preparedFilePagesCount={preparedFilePagesCount}
            prepareFile={prepareFile}
            preparedFile={preparedFile}
            screenSwitch={screenSwitch}
            stopJobsRef={stopJobsRef}
            startButtonPosition={startButtonPosition}
            printInProgressTransfer={printInProgressTransfer}
            setPrintInProgressTransfer={setPrintInProgressTransfer}
            startTrigger={printStartTrigger}
            setStartTrigger={setPrintStartTrigger}
            actualPapersCountTransfer={actualPapersCountTransfer}
            setActualPapersCountTransfer={setActualPapersCountTransfer}
          />
          <ScanJobStartAndWait
            rootStyles={configurationType ? "hidden!" : ""}
            showPopupWithExceptionDetail={showPopupWithExceptionDetail}
            setScreenSwitch={setScreenSwitch}
            preparedFileName={preparedFileName}
            getFile={getFile}
            setPreparedFileName={setPreparedFileName}
            setPreparedFilePagesCount={setPreparedFilePagesCount}
            setScannerInProgressTransfer={setScannerInProgressTransfer}
            oneMoreScanTransfer={oneMoreScanTransfer}
            setOneMoreScanTransfer={setOneMoreScanTransfer}
          />
        </div>
        <FileDrop
          fileProcess={async (file: File) => {
            await getFile(await prepareFile(file));
          }}
          isFileProcessing={isFilePreparing || isFileDownloading}
          blobPreviewURL={fileBlob}
          downloadFileName={downloadFileName}
          isFunctional={configurationType}
        />
        {!startButtonPosition && configurationType ? (
          <div
            className={`${printInProgressTransfer ? "block" : styles.buttonWithRightCaptionContainer} ${marginStyles.paddingObject}`}
          >
            <button
              className={`${styles.button} ${fontStyles.buttonFont} ${printInProgressTransfer && styles.button_inactive}`}
              onClick={() => {
                setPrintStartTrigger(true);
              }}
            >
              Start {configurationType ? "printing" : "scanning"}
            </button>
            {printInProgressTransfer ? (
              <span
                className={`icon-[material-symbols--progress-activity] ${styles.sideIcon} ${styles.rotationAnimation}`}
              ></span>
            ) : (
              <PaperCountIndication papersCount={actualPapersCountTransfer} />
            )}
          </div>
        ) : (
          <></>
        )}
      </div>

      <Modal
        open={alert as unknown as boolean}
        onOpenChange={() => setAlert(null)}
        title={"Warning"}
      >
        {alert}
      </Modal>
    </div>
  );
}
