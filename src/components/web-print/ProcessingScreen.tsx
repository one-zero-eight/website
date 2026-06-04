import styles from "@/components/web-print/css/printers.module.css";
import { FileDrop } from "@/components/web-print/FileDrop.tsx";
import fontStyles from "@/components/web-print/css/printers.fonts.module.css";
import marginStyles from "@/components/web-print/css/printers.margins.module.css";
import { RefObject } from "react";
import { ScalableDocumentNameInput } from "@/components/web-print/ScalableDocumentNameInput.tsx";
import { $printers } from "@/api/printers";

export function ProcessingScreen({
  screenSwitch,
  setScreenSwitch,
  preparedFile,
  downloadFileName,
  setDownloadFileName,
  stopJobsRef,
  configurationType,
  scanningInProgressTransfer,
  setOneMoreScanTransfer,
  prepareFile,
  getFile,
  fileBlob,
}: {
  screenSwitch: boolean;
  setScreenSwitch: (value: boolean) => void;
  preparedFile: File | undefined;
  downloadFileName: string | undefined;
  setDownloadFileName: (value: string) => void;
  stopJobsRef: RefObject<boolean>;
  configurationType: boolean;
  scanningInProgressTransfer: boolean;
  setOneMoreScanTransfer: (value: boolean) => void;
  prepareFile: (file: File, scan: boolean) => Promise<string>;
  getFile: (filename: string, scan: boolean) => Promise<void>;
  fileBlob: string | undefined;
}) {
  const { mutateAsync: deleteScanFileFromTheServer } = $printers.useMutation(
    "post",
    "/scan/manual/delete_file",
  );

  return (
    <div className={styles.ordinaryScreen}>
      <div className={styles.ordinaryScreen__contentSizeRestrictor}>
        <FileDrop
          fileProcess={() => {}}
          isFileProcessing={false}
          blobPreviewURL={fileBlob}
          downloadFileName={downloadFileName}
          isFunctional={false}
        />
        <div
          className={`${styles.configurationBox} ${styles.configurationBox_loading}`}
        >
          <p className={`${fontStyles.headFont} ${fontStyles.color}`}>
            {downloadFileName || "Waiting for scan"}
          </p>
          {((configurationType && screenSwitch) ||
            scanningInProgressTransfer) && (
            <span
              className={`icon-[material-symbols--progress-activity] ${styles.backgroundIcon} ${styles.rotationAnimation}`}
            ></span>
          )}
          {!configurationType && !scanningInProgressTransfer && (
            <div className={`${styles.scanButtonsBox}`}>
              <button
                className={styles.scanButton}
                onClick={() => {
                  setOneMoreScanTransfer(true);
                }}
              >
                <div className={styles.iconSquare}>
                  <span
                    className={`icon-[material-symbols--text-select-move-forward-word-rounded] ${styles.backgroundIcon}`}
                  ></span>
                </div>
                <p className={fontStyles.formPointFont}>Scan one more page</p>
              </button>
              <button
                className={styles.scanButton}
                onClick={async () => {
                  await getFile(await prepareFile(preparedFile!, true), true);
                }}
              >
                <div className={styles.iconSquare}>
                  <span
                    className={`icon-[material-symbols--ink-eraser-rounded] ${styles.backgroundIcon}`}
                  ></span>
                </div>
                <p className={fontStyles.formPointFont}>Remove the last page</p>
              </button>
              <div className={styles.scanButton}>
                <div className={styles.iconSquare}>
                  <span
                    className={`icon-[material-symbols--label-rounded] ${styles.backgroundIcon}`}
                  ></span>
                </div>
                <ScalableDocumentNameInput
                  defaultValue={downloadFileName}
                  onTyped={setDownloadFileName}
                />
              </div>
            </div>
          )}
          <div className={marginStyles.paddingObject}>
            <button
              className={`${styles.button} ${fontStyles.buttonFont} ${marginStyles.bottomMargin_doubleMainPadding} ${scanningInProgressTransfer && styles.button_inactive}`}
              onClick={async () => {
                if (!configurationType)
                  try {
                    await deleteScanFileFromTheServer({
                      params: { query: { filename: preparedFile!.name } },
                    });
                    // for instant print
                    await prepareFile(preparedFile!, false);
                  } catch {
                    console.log(
                      "[web-print] Fail to delete the scan from the servers",
                    );
                  }
                setScreenSwitch(false);
                stopJobsRef.current = true;
              }}
            >
              {configurationType ? "Cancel" : "Finish"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
