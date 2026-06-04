import styles from "@/components/web-print/css/printers.module.css";
import themeStyles from "@/components/web-print/css/printers.theme.module.css";
import { DoubleScreenContainer } from "@/components/web-print/DoubleScreenContainer.tsx";
import { ConfigurationScreen } from "@/components/web-print/ConfigurationScreen.tsx";
import { ProcessingScreen } from "@/components/web-print/ProcessingScreen.tsx";
import { JSX, useRef, useState } from "react";
import { Modal } from "@/components/common/Modal.tsx";
import { $printers } from "@/api/printers";
import { ConfigurationSelectionScreen } from "@/components/web-print/ConfigurationSelectionScreen.tsx";
import { useMe } from "@/api/accounts/user.ts";
import { AuthWall } from "@/components/common/AuthWall.tsx";

export function WebPrintPage() {
  const [alert, setAlert] = useState<JSX.Element>();
  function showPopupWithExceptionDetail(prefix: string, exception: any) {
    if (!Object.hasOwn(exception, "detail"))
      exception.detail = "Unknown error. Service is unavailable";
    setAlert(
      <p>
        {prefix}: {exception.detail.toString()}
      </p>,
    );
  }

  const [configurationType, setConfigurationType] = useState<
    boolean | undefined
  >(undefined);
  const [screenSwitch, setScreenSwitch] = useState<boolean>(false); // false is configuration
  const [preparedFile, setPreparedFile] = useState<File>();
  const [fileBlob, setFileBlob] = useState<string | undefined>(undefined);
  const [preparedFileName, setPreparedFileName] = useState<string>();
  const [downloadFileName, setDownloadFileName] = useState<string>();
  const [preparedFilePagesCount, setPreparedFilePagesCount] =
    useState<number>();

  const [oneMoreScanTransfer, setOneMoreScanTransfer] =
    useState<boolean>(false);
  const [scanningInProgressTransfer, setScanningInProgressTransfer] =
    useState<boolean>(false);

  const stopJobsRef = useRef<boolean>(false);

  if (!useMe()) {
    return (
      <div className="flex flex-col gap-64">
        <AuthWall />
      </div>
    );
  }
  const { mutateAsync: prepare, isPending: isFilePreparing } =
    $printers.useMutation("post", "/print/prepare");
  const {
    mutateAsync: removeLastPagePrepare,
    isPending: isFileRemovePreparing,
  } = $printers.useMutation("post", "/scan/manual/remove_last_page");
  async function prepareFile(file: File, scan: boolean = false) {
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
    } catch (exception: any) {
      showPopupWithExceptionDetail("Documents processing problem", exception);
      throw exception;
    }
  }
  const {
    mutateAsync: getPreparedPrintFile,
    isPending: isPrintFileDownloading,
  } = $printers.useMutation("get", "/print/get_file");
  const { mutateAsync: getPreparedScanFile, isPending: isScanFileDownloading } =
    $printers.useMutation("get", "/scan/get_file");
  const isFileDownloading = isPrintFileDownloading || isScanFileDownloading;
  async function getFile(filename: string, scan: boolean = false) {
    try {
      // @ts-expect-error - response type mismatch with API
      const getResponse: Blob = await (
        scan ? getPreparedScanFile : getPreparedPrintFile
      )({
        params: { query: { filename: filename } },
        parseAs: "blob",
      });
      setDownloadFileName(filename);
      const newFile = new File([getResponse], filename, {
        type: "application/pdf",
      });
      setPreparedFile(newFile);
      setFileBlob(URL.createObjectURL(newFile));
    } catch (exception: any) {
      showPopupWithExceptionDetail("Documents processing problem", exception);
      throw exception;
    }
  }

  return (
    <>
      <div
        className={`${themeStyles.webPrintPage} ${styles.noXOverflowFrame_full}`}
      >
        <DoubleScreenContainer
          className={screenSwitch && styles.doubleScreenContainer_moved}
        >
          {configurationType === undefined ? (
            <ConfigurationSelectionScreen
              setConfigurationType={setConfigurationType}
            />
          ) : (
            <>
              <ConfigurationScreen
                screenSwitch={screenSwitch}
                setScreenSwitch={setScreenSwitch}
                prepareFile={prepareFile}
                getFile={getFile}
                preparedFile={preparedFile}
                fileBlob={fileBlob}
                preparedFileName={preparedFileName}
                isFilePreparing={isFilePreparing || isFileRemovePreparing}
                isFileDownloading={isFileDownloading}
                showPopupWithExceptionDetail={showPopupWithExceptionDetail}
                preparedFilePagesCount={preparedFilePagesCount}
                stopJobsRef={stopJobsRef}
                setPreparedFilePagesCount={setPreparedFilePagesCount}
                setPreparedFileName={setPreparedFileName}
                configurationType={configurationType}
                setConfigurationType={setConfigurationType}
                setScannerInProgressTransfer={setScanningInProgressTransfer}
                oneMoreScanTransfer={oneMoreScanTransfer}
                setOneMoreScanTransfer={setOneMoreScanTransfer}
                downloadFileName={downloadFileName}
              />
              <ProcessingScreen
                setScreenSwitch={setScreenSwitch}
                preparedFile={preparedFile}
                fileBlob={fileBlob}
                downloadFileName={downloadFileName}
                setDownloadFileName={setDownloadFileName}
                stopJobsRef={stopJobsRef}
                configurationType={configurationType}
                scanningInProgressTransfer={scanningInProgressTransfer}
                setOneMoreScanTransfer={setOneMoreScanTransfer}
                prepareFile={prepareFile}
                getFile={getFile}
              />
            </>
          )}
        </DoubleScreenContainer>
      </div>
      <Modal
        open={alert as unknown as boolean}
        onOpenChange={() => setAlert(undefined)}
        title={"Warning"}
      >
        {alert}
      </Modal>
    </>
  );
}
