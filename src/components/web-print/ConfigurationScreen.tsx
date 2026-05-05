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
}) {
  const [alert, setAlert] = useState<JSX.Element | null>(null);

  const [configurationType, setConfigurationType] = useState<boolean>(true);

  return (
    <div className={styles.ordinaryScreen}>
      <div className={styles.ordinaryScreen__contentSizeRestrictor}>
        <div className={styles.configurationBox}>
          <ConfigurationHeader
            configurationType={configurationType}
            onClick={() => setConfigurationType(!configurationType)}
          />
          <PrintJobStartAndWait
            rootStyles={configurationType ? "" : "hidden"}
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
            rootStyles={configurationType ? "hidden" : ""}
            isFilePreparing={isFilePreparing}
          />
        </div>
        <FileDrop
          fileProcess={async (file: File) => {
            await getFile(await prepareFile(file));
          }}
          isFileProcessing={isFilePreparing || isFileDownloading}
          blobPreviewURL={
            preparedFile ? URL.createObjectURL(preparedFile) : undefined
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
