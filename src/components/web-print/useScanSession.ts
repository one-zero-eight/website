import { $printers } from "@/api/printers";
import {
  getScanSessionState,
  setScanSessionState,
  subscribeScanSession,
  type ScanSessionState,
} from "@/components/web-print/scan-session.ts";
import { useCallback, useSyncExternalStore } from "react";

export function useScanSession(
  showPopupWithExceptionDetail: (prefix: string, exception: unknown) => void,
) {
  const session = useSyncExternalStore(
    subscribeScanSession,
    getScanSessionState,
    getScanSessionState,
  );

  const setSession = useCallback((partial: Partial<ScanSessionState>) => {
    setScanSessionState(partial);
  }, []);

  const {
    mutateAsync: removeLastPagePrepare,
    isPending: isFileRemovePreparing,
  } = $printers.useMutation("post", "/scan/manual/remove_last_page");
  const { mutateAsync: getPreparedScanFile, isPending: isScanFileDownloading } =
    $printers.useMutation("get", "/scan/get_file");

  const isFileProcessing = isFileRemovePreparing || isScanFileDownloading;

  async function removeLastPage() {
    const { preparedFileName } = getScanSessionState();
    try {
      const preparationResponse = await removeLastPagePrepare({
        params: { query: { filename: preparedFileName! } },
      });
      setSession({
        preparedFileName: preparationResponse.filename,
        preparedFilePagesCount: preparationResponse.page_count,
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
      const getResponse: Blob = await getPreparedScanFile({
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
    removeLastPage,
    getFile,
    isFileProcessing,
  };
}
