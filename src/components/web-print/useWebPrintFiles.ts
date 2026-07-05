import { $printers } from "@/api/printers";
import { useState } from "react";

export function useWebPrintFiles(
  showPopupWithExceptionDetail: (prefix: string, exception: unknown) => void,
) {
  const [preparedFile, setPreparedFile] = useState<File>();
  const [fileBlob, setFileBlob] = useState<string>();
  const [preparedFileName, setPreparedFileName] = useState<string>();
  const [downloadFileName, setDownloadFileName] = useState<string>();
  const [preparedFilePagesCount, setPreparedFilePagesCount] =
    useState<number>();

  const { mutateAsync: prepare, isPending: isFilePreparing } =
    $printers.useMutation("post", "/print/prepare");
  const {
    mutateAsync: removeLastPagePrepare,
    isPending: isFileRemovePreparing,
  } = $printers.useMutation("post", "/scan/manual/remove_last_page");
  const {
    mutateAsync: getPreparedPrintFile,
    isPending: isPrintFileDownloading,
  } = $printers.useMutation("get", "/print/get_file");
  const { mutateAsync: getPreparedScanFile, isPending: isScanFileDownloading } =
    $printers.useMutation("get", "/scan/get_file");

  const isFileDownloading = isPrintFileDownloading || isScanFileDownloading;
  const isFileProcessing =
    isFilePreparing || isFileRemovePreparing || isFileDownloading;

  async function prepareFile(file: File, scan = false) {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const preparationResponse = scan
        ? await removeLastPagePrepare({
            params: { query: { filename: preparedFileName! } },
          })
        : await prepare({
            // @ts-expect-error - FormData type mismatch with API
            body: formData,
          });
      setPreparedFileName(preparationResponse.filename);
      setPreparedFilePagesCount(
        // @ts-expect-error - API fields mismatch
        scan ? preparationResponse.page_count : preparationResponse.pages,
      );
      return preparationResponse.filename;
    } catch (exception: unknown) {
      showPopupWithExceptionDetail("Documents processing problem", exception);
      throw exception;
    }
  }

  async function getFile(filename: string, scan = false, displayName?: string) {
    try {
      // @ts-expect-error - response type mismatch with API
      const getResponse: Blob = await (
        scan ? getPreparedScanFile : getPreparedPrintFile
      )({
        params: { query: { filename } },
        parseAs: "blob",
      });
      const label = displayName ?? filename;
      setDownloadFileName(label);
      const newFile = new File([getResponse], label, {
        type: "application/pdf",
      });
      setPreparedFile(newFile);
      setFileBlob(URL.createObjectURL(newFile));
    } catch (exception: unknown) {
      showPopupWithExceptionDetail("Documents processing problem", exception);
      throw exception;
    }
  }

  return {
    preparedFile,
    fileBlob,
    preparedFileName,
    downloadFileName,
    preparedFilePagesCount,
    isFileProcessing,
    prepareFile,
    getFile,
    setDownloadFileName,
    setPreparedFileName,
    setPreparedFilePagesCount,
  };
}
