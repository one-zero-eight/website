import styles from "@/components/web-print/printers.module.css";
import { ConfigurationHeader } from "@/components/web-print/ConfigurationHeader.tsx";
import { JSX, RefObject, useState } from "react";
import { FileDrop } from "@/components/web-print/FileDrop.tsx";
import { Modal } from "@/components/common/Modal.tsx";
import { PrintJobStartAndWait } from "@/components/web-print/PrintJobStartAndWait.tsx";
import { ScanJobStartAndWait } from "@/components/web-print/ScanJobStartAndWait.tsx";

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
  meaningfulFileName,
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
  meaningfulFileName: string | undefined;
}) {
  const [alert, setAlert] = useState<JSX.Element | null>(null);

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
          blobPreviewURL={
            preparedFile
              ? URL.createObjectURL(preparedFile) +
                `#filename=${meaningfulFileName || preparedFile.name}`
              : undefined
          }
          isFunctional={configurationType}
        />
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
