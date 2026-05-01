import styles from "@/components/web-print/printers.module.css";
import { FileDrop } from "@/components/web-print/FileDrop.tsx";
import fontStyles from "@/components/web-print/printers.fonts.module.css";
import marginStyles from "@/components/web-print/printers.margins.module.css";

export function ProcessingScreen({
  setScreenSwitch,
  preparedDocumentURL,
}: {
  setScreenSwitch: (value: boolean) => void;
  preparedDocumentURL: string | undefined;
}) {
  return (
    <div className={styles.ordinaryScreen}>
      <div className={styles.ordinaryScreen__contentSizeRestrictor}>
        <FileDrop
          fileProcess={() => {}}
          isFileProcessing={false}
          blobPreviewURL={preparedDocumentURL}
          isFunctional={false}
        />
        <div
          className={`${styles.configurationBox} ${styles.configurationBox_loading}`}
        >
          <div></div>
          <span
            className={`icon-[material-symbols--progress-activity] ${styles.backgroundIcon} ${styles.rotationAnimation}`}
          ></span>
          <button
            className={`${styles.button} ${fontStyles.buttonFont} ${marginStyles.bottomMargin_doubleMainPadding}`}
            onClick={() => setScreenSwitch(false)}
          >
            {"Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
