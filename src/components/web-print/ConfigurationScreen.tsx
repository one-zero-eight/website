import styles from "@/components/web-print/printers.module.css";
import { ConfigurationHeader } from "@/components/web-print/ConfigurationHeader.tsx";
import { useState } from "react";
import { FileDrop } from "@/components/web-print/FileDrop.tsx";
import { $printers } from "@/api/printers";
import { IconValueStatusSelect } from "@/components/web-print/IconValueStatusSelect.tsx";
import marginStyles from "@/components/web-print/printers.margins.module.css";
import fontStyles from "@/components/web-print/printers.fonts.module.css";
import { ScalableIntInput } from "@/components/web-print/ScalableIntInput.tsx";

export function ConfigurationScreen() {
  const [configurationType, setConfigurationType] = useState<boolean>(true);
  const [preparedDocumentURL, setPreparedDocumentURL] = useState<string>();
  const [_printerCupsName, setPrinterCupsName] = useState<string>("");
  const [_copiesCount, setCopiesCount] = useState<number>(1);
  const [_sides, _setSides] = useState<boolean>(true);
  const [_pages, _setPages] = useState<string | null>(null);
  const [_layout, _setLayout] = useState<
    "1x1" | "2x2" | "3x3" | "4x4" | "1x2" | "2x3"
  >("1x1");

  const { data: rawPrinters } = $printers.useQuery(
    "get",
    "/print/get_printers",
  );
  const { data: rawStatuses } = $printers.useQuery(
    "get",
    "/print/get_printers_status",
  );
  const { mutateAsync: prepareFile, isPending: isFilePreparing } =
    $printers.useMutation("post", "/print/prepare");
  const { mutateAsync: getPreparedFile, isPending: isFileDownloading } =
    $printers.useMutation("get", "/print/get_file");

  async function fileProcess(file: File) {
    if (preparedDocumentURL) URL.revokeObjectURL(preparedDocumentURL);
    const formData = new FormData();
    formData.append("file", file);
    const preparationResponse = await prepareFile({
      // @ts-expect-error - FormData type mismatch with API
      body: formData,
    });
    // @ts-expect-error - response type mismatch with API
    const getResponse: Blob = await getPreparedFile({
      params: { query: { filename: preparationResponse.filename } },
      parseAs: "blob",
    });
    setPreparedDocumentURL(URL.createObjectURL(getResponse));
  }

  return (
    <div className={styles.ordinaryScreen}>
      <div className={styles.ordinaryScreen__contentSizeRestrictor}>
        <div className={styles.configurationBox}>
          <ConfigurationHeader
            configurationType={configurationType}
            onClick={() => setConfigurationType(!configurationType)}
          />
          <div className={styles.configurationBox__scrollPart}>
            <div className={styles.scrollPart__elem}>
              <p className={fontStyles.formPointFont}>Printer</p>
              <IconValueStatusSelect
                icons={rawPrinters?.map(() => "🖨️")}
                names={rawPrinters?.map((printer) => printer.display_name)}
                values={rawPrinters?.map((printer) => printer.cups_name)}
                statuses={rawStatuses?.map((status) =>
                  status.offline
                    ? ", 💀 offline"
                    : status.paper_percentage
                      ? ", 📃 has paper"
                      : ", ✂️ no paper",
                )}
                onSelected={setPrinterCupsName}
              />
            </div>
            <div className={styles.scrollPart__elem}>
              <p className={fontStyles.formPointFont}>Copies</p>
              <ScalableIntInput
                defaultValue={1}
                onTyped={setCopiesCount}
                maximum={50}
                minimum={1}
              />
            </div>
          </div>
          <button
            className={`${styles.button} ${fontStyles.buttonFont} ${marginStyles.bottomMargin_doubleMainPadding}`}
            onClick={() => {}}
          >
            {configurationType ? "Start printing" : "Start scanning"}
          </button>
        </div>
        <FileDrop
          fileProcess={fileProcess}
          isFileProcessing={isFilePreparing || isFileDownloading}
          blobPreviewURL={preparedDocumentURL}
        />
      </div>
    </div>
  );
}
