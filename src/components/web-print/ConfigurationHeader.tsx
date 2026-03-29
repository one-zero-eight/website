import styles from "@/components/web-print/printers.module.css";
import fontStyles from "@/components/web-print/printers.fonts.module.css";
import marginStyles from "@/components/web-print/printers.margins.module.css";
import Tooltip from "@/components/common/Tooltip.tsx";

export function ConfigurationHeader({
  configurationType,
  onClick,
}: {
  configurationType: boolean;
  onClick: () => void;
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
      <p className={marginStyles.leftMargin_buttonHorizontalPadding}>
        Job Configuration
      </p>
    </div>
  );
}
