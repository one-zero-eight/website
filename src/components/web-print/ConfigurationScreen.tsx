import styles from "@/components/web-print/printers.module.css";
import { ConfigurationHeader } from "@/components/web-print/ConfigurationHeader.tsx";
import { JSX, useCallback, useEffect, useRef, useState } from "react";
import { FileDrop } from "@/components/web-print/FileDrop.tsx";
import { $printers } from "@/api/printers";
import { IconValueStatusSelect } from "@/components/web-print/IconValueStatusSelect.tsx";
import marginStyles from "@/components/web-print/printers.margins.module.css";
import fontStyles from "@/components/web-print/printers.fonts.module.css";
import { ScalableIntInput } from "@/components/web-print/ScalableIntInput.tsx";
import { Switch } from "@/components/web-print/Switch.tsx";
import { ScalablePageRangesInput } from "@/components/web-print/ScalablePageRangesInput.tsx";
import {
  JobStateEnum,
  PrintingOptionsNumberUp,
  PrintingOptionsSides,
  ScanningOptionsCrop,
  ScanningOptionsInput_source,
  ScanningOptionsQuality,
  ScanningOptionsSides,
} from "@/api/printers/types.ts";
import { Modal } from "@/components/common/Modal.tsx";
import { DeviceChoicePoint } from "@/components/web-print/DeviceChoicePoint.tsx";
import Tooltip from "@/components/common/Tooltip.tsx";

function calcNumberOfPagesInRanges(ranges: string, until: number) {
  let count = 0;
  for (const elem of ranges.split(","))
    if (elem.includes("-")) {
      if (parseInt(elem.split("-")[0]) > until) break;
      if (parseInt(elem.split("-")[0]) === until) {
        count++;
        break;
      }
      if (parseInt(elem.split("-")[1]) > until)
        count += until - parseInt(elem.split("-")[0]) + 1;
      else
        count +=
          parseInt(elem.split("-")[1]) - parseInt(elem.split("-")[0]) + 1;
    } else {
      if (parseInt(elem) > until) break;
      count++;
    }
  return count;
}

function calcPrintJobActualPapersCount(
  ranges: string | null,
  copiesCount: number,
  numberUp: PrintingOptionsNumberUp,
  sides: PrintingOptionsSides,
  pagesCount: number,
) {
  const sideFactor =
    sides === PrintingOptionsSides.two_sided_long_edge ? 1 / 2 : 1;
  const numberUpFactor = 1 / parseInt(numberUp);
  if (!ranges)
    return Math.ceil(pagesCount * numberUpFactor * sideFactor * copiesCount);
  pagesCount = Math.ceil(pagesCount * numberUpFactor);
  pagesCount = calcNumberOfPagesInRanges(ranges, pagesCount);
  return Math.ceil(pagesCount * sideFactor * copiesCount);
}

export function ConfigurationScreen({
  screenSwitch,
  setScreenSwitch,
  preparedDocumentURL,
  setPreparedDocumentURL,
}: {
  screenSwitch: boolean;
  setScreenSwitch: (value: boolean) => void;
  preparedDocumentURL: string | undefined;
  setPreparedDocumentURL: (value: string) => void;
}) {
  const [alert, setAlert] = useState<JSX.Element | null>(null);

  const startButtonReference = useRef<HTMLButtonElement>(null);

  const [deviceName, setDeviceName] = useState<string>("");

  const [unpreparedFile, setUnpreparedFile] = useState<File>();
  const [preparedDocumentName, setPreparedDocumentName] = useState<string>("");
  const [configurationType, setConfigurationType] = useState<boolean>(true);
  const [copiesCount, setCopiesCount] = useState<number>(1);
  const [pagesCount, setPagesCount] = useState<number>(0);
  const [sides, setSides] = useState<PrintingOptionsSides>(
    PrintingOptionsSides.two_sided_long_edge,
  );
  const [pages, setPages] = useState<string | null>(null);
  const [numberUp, setNumberUp] = useState<PrintingOptionsNumberUp>(
    PrintingOptionsNumberUp.Value1,
  );

  const [mode, setMode] = useState<ScanningOptionsInput_source>(
    ScanningOptionsInput_source.Platen,
  );
  const [scanSides, setScanSides] = useState<ScanningOptionsSides>(
    ScanningOptionsSides.false,
  );
  const [quality, setQuality] = useState<ScanningOptionsQuality>(
    ScanningOptionsQuality.Value200,
  );
  const [crop, setCrop] = useState<ScanningOptionsCrop>(
    ScanningOptionsCrop.false,
  );

  const { mutateAsync: prepareFile, isPending: isFilePreparing } =
    $printers.useMutation("post", "/print/prepare");
  const { mutateAsync: print, isPending: isPrintStarting } =
    $printers.useMutation("post", "/print/print");
  const { mutateAsync: getPreparedFile, isPending: isFileDownloading } =
    $printers.useMutation("get", "/print/get_file");
  const { mutateAsync: getJobStatus } = $printers.useMutation(
    "get",
    "/print/job_status",
  );
  const { mutateAsync: cancelJob, isPending: isCancelling } =
    $printers.useMutation("post", "/print/cancel");

  const showExceptionDetail = useCallback((prefix: string, exception: any) => {
    if (!Object.hasOwn(exception, "detail"))
      exception.detail = "Unknown error. Service is unavailable";
    setAlert(
      <p>
        {prefix}: {exception.detail}
      </p>,
    );
  }, []);

  async function fileProcess(file: File, justPrepare: boolean = false) {
    if (!justPrepare)
      if (preparedDocumentURL) URL.revokeObjectURL(preparedDocumentURL);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const preparationResponse = await prepareFile({
        // @ts-expect-error - FormData type mismatch with API
        body: formData,
      });
      setUnpreparedFile(file);
      setPreparedDocumentName(preparationResponse.filename);
      setPagesCount(preparationResponse.pages);
      if (justPrepare) return;
      // @ts-expect-error - response type mismatch with API
      const getResponse: Blob = await getPreparedFile({
        params: { query: { filename: preparationResponse.filename } },
        parseAs: "blob",
      });
      setPreparedDocumentURL(URL.createObjectURL(getResponse));
    } catch (exception: any) {
      showExceptionDetail("Documents processing problem", exception);
    }
  }

  const [jobId, setJobId] = useState<number>();
  async function startAndWait() {
    try {
      setJobId(
        await print({
          params: {
            query: {
              filename: preparedDocumentName,
              printer_cups_name: deviceName,
            },
          },
          body: {
            printing_options: {
              copies: copiesCount.toString(),
              "page-ranges": pages,
              sides: sides,
              "number-up": numberUp,
            },
          },
        }),
      );
    } catch (exception: any) {
      showExceptionDetail("Start problem", exception);
      return;
    }
    setScreenSwitch(true);
  }

  useEffect(
    () => {
      async function waitTillThePrintingEnd() {
        if (!jobId) return;
        const startTime = performance.now();
        while (
          performance.now() - startTime <
          calcPrintJobActualPapersCount(
            pages,
            copiesCount,
            numberUp,
            sides,
            pagesCount,
          ) *
            60 *
            1000 // 60K milliseconds per page
        ) {
          if (!screenSwitch) break;
          let jobStatus;
          try {
            jobStatus = await getJobStatus({
              params: { query: { job_id: jobId } },
            });
          } catch (exception: any) {
            console.log(
              `[web-print] Error during status retrieval for a job by id ${jobId}\n${exception}`,
            );
            continue;
          }
          if (
            [
              JobStateEnum.Value9 /* completed */,
              JobStateEnum.Value7 /* cancelled */,
              JobStateEnum.Value8 /* aborted */,
            ].includes(jobStatus.job_state)
          ) {
            fileProcess(unpreparedFile!, true);
            setScreenSwitch(false);
            return;
          }
          if (jobStatus.printer_state_message?.includes("Replace the toner")) {
            setAlert(
              <>
                <p className="font-bold!">No toner</p>
                <p>The job cannot be completed</p>
              </>,
            );
            fileProcess(unpreparedFile!, true);
            setScreenSwitch(false);
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        try {
          await cancelJob({
            params: { query: { job_id: jobId } },
          });
        } catch (exception: any) {
          console.log(
            `[web-print] Error during cancellation of a job by id ${jobId}\n${exception}`,
          );
        }
        if (screenSwitch) {
          setAlert(
            <>
              <p className="font-bold!">The job has been timed out!</p>
              <p>Probably, the printer is busy, try to reboot it</p>
            </>,
          );
          fileProcess(unpreparedFile!, true);
        }
        setScreenSwitch(false);
      }
      waitTillThePrintingEnd();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      cancelJob,
      copiesCount,
      getJobStatus,
      jobId,
      numberUp,
      pages,
      pagesCount,
      screenSwitch,
      setScreenSwitch,
      sides,
      unpreparedFile,
    ],
  );

  return (
    <div className={styles.ordinaryScreen}>
      <div className={styles.ordinaryScreen__contentSizeRestrictor}>
        <div className={styles.configurationBox}>
          <ConfigurationHeader
            configurationType={configurationType}
            onClick={() => setConfigurationType(!configurationType)}
          />
          <div className={styles.configurationBox__scrollPart}>
            <DeviceChoicePoint
              defaultValue={deviceName}
              configurationType={configurationType}
              setDeviceName={setDeviceName}
            />
            {configurationType ? (
              <>
                <div className={styles.scrollPart__elem}>
                  <p className={fontStyles.formPointFont}>Copies</p>
                  <ScalableIntInput
                    defaultValue={copiesCount}
                    onTyped={setCopiesCount}
                    maximum={50}
                    minimum={1}
                    outOfRangeAlert={
                      <p>
                        You can do not more than{" "}
                        <span className="font-bold!">50&nbsp;copies</span>
                        <br />
                        (and not less than 1)
                      </p>
                    }
                  />
                </div>
                <div className={styles.scrollPart__elem}>
                  <p className={fontStyles.formPointFont}>
                    Printing on both sides
                  </p>
                  <Switch
                    state={sides === PrintingOptionsSides.two_sided_long_edge}
                    onSwitched={(value: boolean) =>
                      setSides(
                        value
                          ? PrintingOptionsSides.two_sided_long_edge
                          : PrintingOptionsSides.one_sided,
                      )
                    }
                  />
                </div>
                <div className={styles.scrollPart__elem}>
                  <p className={fontStyles.formPointFont}>Specific pages</p>
                  <ScalablePageRangesInput
                    defaultValue={pages}
                    onTyped={setPages}
                  />
                </div>
                <div className={styles.scrollPart__elem}>
                  <p className={fontStyles.formPointFont}>Layout</p>
                  <IconValueStatusSelect
                    icons={undefined}
                    names={["1x1", "1x2", "2x2", "2x3", "3x3", "4x4"]}
                    values={Object.values(PrintingOptionsNumberUp)}
                    defaultValue={numberUp}
                    statuses={Object.values(PrintingOptionsNumberUp).map(
                      (elem) =>
                        `\xa0(${elem} ${parseInt(elem) > 1 ? "pages" : "page"} per list)`,
                    )}
                    // @ts-expect-error - String-valued enum is okay to accept a confidently valid string
                    onSelected={setNumberUp}
                  />
                </div>
              </>
            ) : (
              <>
                <div className={styles.scrollPart__elem}>
                  <p className={fontStyles.formPointFont}>Mode</p>
                  <Tooltip
                    content={
                      mode === ScanningOptionsInput_source.Adf
                        ? "Scan placed on top of the printer A4 paper documents automatically"
                        : "Scan one page at a time, placing it on the glass"
                    }
                  >
                    <IconValueStatusSelect
                      icons={undefined}
                      names={["Manual Scanning", "Automatic Scanning"]}
                      values={Object.values(ScanningOptionsInput_source)}
                      defaultValue={mode}
                      statuses={["", ""]}
                      // @ts-expect-error - String-valued enum is okay to accept a confidently valid string
                      onSelected={setMode}
                    />
                  </Tooltip>
                </div>
                {mode === ScanningOptionsInput_source.Adf && (
                  <div className={styles.scrollPart__elem}>
                    <p className={fontStyles.formPointFont}>
                      Scan from both sides
                    </p>
                    <Tooltip content="Applicable only for Automatic mode">
                      <Switch
                        state={scanSides === ScanningOptionsSides.true}
                        onSwitched={(value: boolean) =>
                          setScanSides(
                            value
                              ? ScanningOptionsSides.true
                              : ScanningOptionsSides.false,
                          )
                        }
                      />
                    </Tooltip>
                  </div>
                )}
                <div className={styles.scrollPart__elem}>
                  <p className={fontStyles.formPointFont}>Quality</p>
                  <IconValueStatusSelect
                    icons={Object.values(ScanningOptionsQuality).map(
                      () => "👾",
                    )}
                    names={Object.values(ScanningOptionsQuality)}
                    values={Object.values(ScanningOptionsQuality)}
                    defaultValue={quality}
                    statuses={Object.values(ScanningOptionsQuality).map(
                      () => "\xa0dpi",
                    )}
                    // @ts-expect-error - String-valued enum is okay to accept a confidently valid string
                    onSelected={setQuality}
                  />
                </div>
                <div className={styles.scrollPart__elem}>
                  <p className={fontStyles.formPointFont}>AI Crop</p>
                  <Tooltip content="Automatically fit the resulting PDF page to the scan">
                    <Switch
                      state={crop === ScanningOptionsCrop.true}
                      onSwitched={(value: boolean) =>
                        setCrop(
                          value
                            ? ScanningOptionsCrop.true
                            : ScanningOptionsCrop.false,
                        )
                      }
                    />
                  </Tooltip>
                </div>
              </>
            )}
          </div>
          <div>
            <button
              ref={startButtonReference}
              className={`${styles.button} ${fontStyles.buttonFont} ${marginStyles.bottomMargin_doubleMainPadding} ${(isPrintStarting || isCancelling || isFilePreparing) && styles.button_inactive}`}
              onClick={startAndWait}
            >
              {configurationType ? "Start printing" : "Start scanning"}
            </button>
            {(isPrintStarting || isCancelling || isFilePreparing) && (
              <span
                className={`icon-[material-symbols--progress-activity] ${styles.sideIcon} ${styles.rotationAnimation}`}
              ></span>
            )}
          </div>
        </div>
        <FileDrop
          fileProcess={fileProcess}
          isFileProcessing={isFilePreparing || isFileDownloading}
          blobPreviewURL={preparedDocumentURL}
          isFunctional={configurationType}
        />
      </div>

      <Modal
        open={alert as unknown as boolean}
        onOpenChange={() => setAlert(null)}
        title={"Warning"}
      >
        {alert}
      </Modal>
    </div>
  );
}
