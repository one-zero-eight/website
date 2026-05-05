import styles from "@/components/web-print/printers.module.css";
import themeStyles from "@/components/web-print/printers.theme.module.css";
import { DoubleScreenContainer } from "@/components/web-print/DoubleScreenContainer.tsx";
import { ConfigurationScreen } from "@/components/web-print/ConfigurationScreen.tsx";
import { ProcessingScreen } from "@/components/web-print/ProcessingScreen.tsx";
import { JSX, useRef, useState } from "react";
import { Modal } from "@/components/common/Modal.tsx";
import { $printers } from "@/api/printers";

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

  const [screenSwitch, setScreenSwitch] = useState<boolean>(false); // false is configuration
  const [preparedFile, setPreparedFile] = useState<File>();
  const [preparedFileName, setPreparedFileName] = useState<string>();
  const [preparedFilePagesCount, setPreparedFilePagesCount] =
    useState<number>();

  const stopJobsRef = useRef<boolean>(false);

  const { mutateAsync: prepare, isPending: isFilePreparing } =
    $printers.useMutation("post", "/print/prepare");
  async function prepareFile(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const preparationResponse = await prepare({
        // @ts-expect-error - FormData type mismatch with API
        body: formData,
      });
      setPreparedFileName(preparationResponse.filename);
      setPreparedFilePagesCount(preparationResponse.pages);
      return preparationResponse.filename;
    } catch (exception: any) {
      showPopupWithExceptionDetail("Documents processing problem", exception);
      throw exception;
    }
  }
  const { mutateAsync: getPreparedFile, isPending: isFileDownloading } =
    $printers.useMutation("get", "/print/get_file");
  async function getFile(filename: string) {
    try {
      // @ts-expect-error - response type mismatch with API
      const getResponse: Blob = await getPreparedFile({
        params: { query: { filename: filename } },
        parseAs: "blob",
      });
      setPreparedFile(
        new File([getResponse], filename, { type: "application/pdf" }),
      );
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
          <ConfigurationScreen
            screenSwitch={screenSwitch}
            setScreenSwitch={setScreenSwitch}
            prepareFile={prepareFile}
            getFile={getFile}
            preparedFile={preparedFile}
            preparedFileName={preparedFileName}
            isFilePreparing={isFilePreparing}
            isFileDownloading={isFileDownloading}
            showPopupWithExceptionDetail={showPopupWithExceptionDetail}
            preparedFilePagesCount={preparedFilePagesCount}
            stopJobsRef={stopJobsRef}
          />
          <ProcessingScreen
            setScreenSwitch={setScreenSwitch}
            preparedFile={preparedFile}
            stopJobsRef={stopJobsRef}
          />
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
