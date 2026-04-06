import styles from "@/components/web-print/printers.module.css";
import { ConfigurationHeader } from "@/components/web-print/ConfigurationHeader.tsx";
import { useState } from "react";
import { FileDrop } from "@/components/web-print/FileDrop.tsx";
import { $printers } from "@/api/printers";
import { IconValueStatusSelect } from "@/components/web-print/IconValueStatusSelect.tsx";

export function ConfigurationScreen() {
  const [configurationType, setConfigurationType] = useState<boolean>(true);
  const [preparedDocumentURL, setPreparedDocumentURL] = useState<string>();

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
          <IconValueStatusSelect
            id="printerCupsName"
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
          />
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
