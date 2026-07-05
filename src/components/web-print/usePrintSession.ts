import { $printers } from "@/api/printers";
import {
  getPrintSessionState,
  setPrintSessionState,
  subscribePrintSession,
  type PrintSessionState,
} from "@/components/web-print/print-session.ts";
import { useCallback, useSyncExternalStore } from "react";

export function usePrintSession(
  showPopupWithExceptionDetail: (prefix: string, exception: unknown) => void,
) {
  const session = useSyncExternalStore(
    subscribePrintSession,
    getPrintSessionState,
    getPrintSessionState,
  );

  const setSession = useCallback((partial: Partial<PrintSessionState>) => {
    setPrintSessionState(partial);
  }, []);

  const { mutateAsync: prepare, isPending: isFilePreparing } =
    $printers.useMutation("post", "/print/prepare");
  const {
    mutateAsync: getPreparedPrintFile,
    isPending: isPrintFileDownloading,
  } = $printers.useMutation("get", "/print/get_file");

  const isFileProcessing = isFilePreparing || isPrintFileDownloading;

  async function prepareFile(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const preparationResponse = await prepare({
        // @ts-expect-error - FormData type mismatch with API
        body: formData,
      });
      setSession({
        preparedFileName: preparationResponse.filename,
        preparedFilePagesCount: preparationResponse.pages,
      });
      return preparationResponse.filename;
    } catch (exception: unknown) {
      showPopupWithExceptionDetail("Documents processing problem", exception);
      throw exception;
    }
  }

  async function getFile(filename: string, displayName?: string) {
    try {
      // @ts-expect-error - response type mismatch with API
      const getResponse: Blob = await getPreparedPrintFile({
        params: { query: { filename } },
        parseAs: "blob",
      });
      const label = displayName ?? filename;
      const newFile = new File([getResponse], label, {
        type: "application/pdf",
      });
      setSession({
        downloadFileName: label,
        preparedFile: newFile,
        fileBlob: URL.createObjectURL(newFile),
      });
    } catch (exception: unknown) {
      showPopupWithExceptionDetail("Documents processing problem", exception);
      throw exception;
    }
  }

  return {
    session,
    setSession,
    prepareFile,
    getFile,
    isFileProcessing,
  };
}
