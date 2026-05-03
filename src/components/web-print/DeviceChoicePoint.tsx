import { $printers } from "@/api/printers";
import styles from "@/components/web-print/printers.module.css";
import fontStyles from "@/components/web-print/printers.fonts.module.css";
import { IconValueStatusSelect } from "@/components/web-print/IconValueStatusSelect.tsx";

export function DeviceChoicePoint({
  defaultValue,
  setDeviceName,
  configurationType, // false for scanning
}: {
  defaultValue: string;
  setDeviceName: (value: string) => void;
  configurationType: boolean;
}) {
  const { data: rawDevices } = configurationType
    ? $printers.useQuery("get", "/print/get_printers")
    : $printers.useQuery("get", "/scan/get_scanners");
  const { data: rawStatuses } = configurationType
    ? $printers.useQuery("get", "/print/get_printers_status")
    : $printers.useQuery("get", "/scan/debug/get_scanners_status");

  return (
    <div className={styles.scrollPart__elem}>
      <p className={fontStyles.formPointFont}>
        {configurationType ? "Printer" : "Scanner"}
      </p>
      <IconValueStatusSelect
        defaultValue={defaultValue}
        icons={rawDevices?.map(() => (configurationType ? "🖨️" : "📰"))}
        names={rawDevices?.map((device) => device.display_name)}
        values={rawDevices?.map((device) =>
          // @ts-expect-error - dynamic object changing
          configurationType ? device.cups_name : device.name,
        )}
        statuses={rawStatuses?.map((status) =>
          status.offline
            ? ", 💀 offline"
            : configurationType
              ? // @ts-expect-error - dynamic object changing
                status.paper_percentage
                ? ", 📃\xa0has\xa0paper"
                : ", ✂️\xa0no\xa0paper"
              : ", ✔️ online",
        )}
        onSelected={setDeviceName}
      />
    </div>
  );
}
