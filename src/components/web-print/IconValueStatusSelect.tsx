import selectStyles from "@/components/web-print/printers.select.module.css";
import styles from "@/components/web-print/printers.module.css";

export function IconValueStatusSelect({
  id,
  icons,
  names,
  values,
  statuses,
}: {
  id: string;
  icons: string[] | undefined;
  names: string[] | undefined;
  values: string[] | undefined;
  statuses: string[] | undefined;
}) {
  return (
    <div className={selectStyles.selectWrapper}>
      <select id={id} className={selectStyles.select}>
        {names?.map((printerDisplayName, i) => {
          if (!values) return <></>;
          else
            return (
              <option value={values[i]} key={i}>
                {<span aria-hidden="true">{icons && icons[i]}</span>}
                {<span>&nbsp;{printerDisplayName}</span>}
                {statuses ? (
                  <span className={selectStyles.option__status}>
                    {statuses[i]}
                  </span>
                ) : (
                  <span
                    className={`${selectStyles.option__icon} ${styles.rotationAnimation}`}
                  >
                    ⏳
                  </span>
                )}
              </option>
            );
        })}
      </select>
    </div>
  );
}
