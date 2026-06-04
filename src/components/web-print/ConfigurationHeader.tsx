import styles from "@/components/web-print/css/printers.module.css";
import fontStyles from "@/components/web-print/css/printers.fonts.module.css";
import marginStyles from "@/components/web-print/css/printers.margins.module.css";
import Tooltip from "@/components/common/Tooltip.tsx";

export function ConfigurationHeader({
  configurationType,
  onClick,
  miniHeader,
}: {
  configurationType: boolean;
  onClick: () => void;
  miniHeader: boolean;
}) {
  return (
    <div className={`${styles.headline} ${fontStyles.headFont}`}>
      <span
        className={
          configurationType
            ? "icon-[material-symbols--print-rounded]"
            : "icon-[material-symbols--adf-scanner-rounded]"
        }
      />
      <Tooltip content="Switch Job type">
        <button
          className={`${marginStyles.leftMargin_8} ${styles.button}`}
          onClick={onClick}
        >
          {configurationType ? " Print" : "Scan"}
        </button>
      </Tooltip>
      {miniHeader ? (
        <p className={marginStyles.leftMargin_buttonHorizontalPadding}>Job</p>
      ) : (
        <p className={marginStyles.leftMargin_buttonHorizontalPadding}>
          Job&nbsp;Configuration
        </p>
      )}
    </div>
  );
}
