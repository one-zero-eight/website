import styles from "@/components/web-print/css/printers.module.css";
import fontStyles from "@/components/web-print/css/printers.fonts.module.css";

export function ConfigurationSelectionScreen({
  setConfigurationType,
}: {
  setConfigurationType: (value: boolean) => void;
}) {
  return (
    <div className={styles.ordinaryScreen}>
      <div className={styles.ordinaryScreen__contentSizeRestrictor}>
        <button
          className={styles.fiftyButton}
          onClick={() => {
            setConfigurationType(false);
          }}
        >
          <span
            className={`icon-[material-symbols--adf-scanner-rounded] ${styles.backgroundIcon}`}
          />
          <span className={`${fontStyles.headFont} font-black!`}>
            {"Scanning"}
          </span>
        </button>
        <button
          className={styles.fiftyButton}
          onClick={() => {
            setConfigurationType(true);
          }}
        >
          <span
            className={`icon-[material-symbols--print-rounded] ${styles.backgroundIcon}`}
          />
          <span className={`${fontStyles.headFont} font-black!`}>
            {"Printing"}
          </span>
        </button>
      </div>
    </div>
  );
}
