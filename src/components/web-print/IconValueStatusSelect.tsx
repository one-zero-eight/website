import selectStyles from "@/components/web-print/printers.select.module.css";
import styles from "@/components/web-print/printers.module.css";
import { useEffect, useRef } from "react";

export function IconValueStatusSelect({
  icons,
  names,
  values,
  statuses,
  onSelected,
}: {
  icons: string[] | undefined;
  names: string[] | undefined;
  values: string[] | undefined;
  statuses: string[] | undefined;
  onSelected: (value: string) => void;
}) {
  const inputReference = useRef<HTMLSelectElement | null>(null);

  useEffect(() => {
    const input = inputReference.current;
    if (!input) return;

    function pass(event: Event) {
      onSelected((event.target as HTMLInputElement).value);
    }

    input.addEventListener("change", pass);
    onSelected(input.value);

    return () => {
      if (input) input.removeEventListener("change", pass);
    };
  }, [onSelected, values]);

  return (
    <div className={selectStyles.selectWrapper}>
      <select ref={inputReference} className={selectStyles.select}>
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
