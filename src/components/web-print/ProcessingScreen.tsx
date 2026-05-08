import styles from "@/components/web-print/printers.module.css";
import { FileDrop } from "@/components/web-print/FileDrop.tsx";
import fontStyles from "@/components/web-print/printers.fonts.module.css";
import marginStyles from "@/components/web-print/printers.margins.module.css";
import { RefObject } from "react";
import { ScalableDocumentNameInput } from "@/components/web-print/ScalableDocumentNameInput.tsx";
import { $printers } from "@/api/printers";

export function ProcessingScreen({
  setScreenSwitch,
  preparedFile,
  meaningfulFileName,
  setMeaningfulFileName,
  stopJobsRef,
  configurationType,
  scanningInProgressTransfer,
  _setOneMoreScanTransfer,
}: {
  setScreenSwitch: (value: boolean) => void;
  preparedFile: File | undefined;
  meaningfulFileName: string | undefined;
  setMeaningfulFileName: (value: string) => void;
  stopJobsRef: RefObject<boolean>;
  configurationType: boolean;
  scanningInProgressTransfer: boolean;
  _setOneMoreScanTransfer: (value: boolean) => void;
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
          blobPreviewURL={
            preparedFile
              ? URL.createObjectURL(preparedFile) +
                `#filename=${preparedFile.name}`
              : undefined
          }
          isFunctional={false}
        />
        <div
          className={`${styles.configurationBox} ${styles.configurationBox_loading}`}
        >
          <p className={`${fontStyles.headFont} ${fontStyles.color}`}>
            {meaningfulFileName || "{InternalName}.pdf"}
          </p>
          {(configurationType || scanningInProgressTransfer) && (
            <span
              className={`icon-[material-symbols--progress-activity] ${styles.backgroundIcon} ${styles.rotationAnimation}`}
            ></span>
          )}
          {!configurationType && !scanningInProgressTransfer && (
            <div className={`${styles.configurationBox__scrollPart}`}>
              <button className={styles.scanButton} onClick={() => {}}>
                <div className={styles.iconSquare}>
                  <span
                    className={`icon-[material-symbols--text-select-move-forward-word-rounded] ${styles.backgroundIcon}`}
                  ></span>
                </div>
                <p className={fontStyles.formPointFont}>Scan one more page</p>
              </button>
              <button className={styles.scanButton}>
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
                  defaultValue={meaningfulFileName}
                  onTyped={setMeaningfulFileName}
                />
              </div>
            </div>
          )}
          <button
            className={`${styles.button} ${fontStyles.buttonFont} ${marginStyles.bottomMargin_doubleMainPadding} ${scanningInProgressTransfer && styles.button_inactive}`}
            onClick={async () => {
              if (!configurationType)
                try {
                  await deleteScanFileFromTheServer({
                    params: { query: { filename: preparedFile!.name } },
                  });
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
  );
}
