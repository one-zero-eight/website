import styles from "@/components/web-print/printers.module.css";
import { ConfigurationHeader } from "@/components/web-print/ConfigurationHeader.tsx";
import { useState } from "react";
import { FileDrop } from "@/components/web-print/FileDrop.tsx";
import { $printers } from "@/api/printers";

export function ConfigurationScreen() {
  const [configurationType, setConfigurationType] = useState<boolean>(true);
  const [preparedDocumentURL, setPreparedDocumentURL] = useState<string>();

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
        <ConfigurationHeader
          configurationType={configurationType}
          onClick={() => setConfigurationType(!configurationType)}
        />
        <FileDrop
          fileProcess={fileProcess}
          isFileProcessing={isFilePreparing || isFileDownloading}
          blobPreviewURL={preparedDocumentURL}
        />
      </div>
    </div>
  );
}
