import styles from "@/components/web-print/printers.module.css";
import fontStyles from "@/components/web-print/printers.fonts.module.css";
import marginStyles from "@/components/web-print/printers.margins.module.css";
import { ScalableIntInput } from "@/components/web-print/ScalableIntInput.tsx";
import { $printers } from "@/api/printers";
import { Switch } from "@/components/web-print/Switch.tsx";
import {
  JobStateEnum,
  PrintingOptionsNumberUp,
  PrintingOptionsSides,
} from "@/api/printers/types.ts";
import { ScalablePageRangesInput } from "@/components/web-print/ScalablePageRangesInput.tsx";
import { IconValueStatusSelect } from "@/components/web-print/IconValueStatusSelect.tsx";
import { JSX, RefObject, useEffect, useState } from "react";
import { Modal } from "@/components/common/Modal.tsx";

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

export function PrintJobStartAndWait({
  rootStyles,
  preparedFileName,
  showPopupWithExceptionDetail,
  isFilePreparing,
  setScreenSwitch,
  preparedFilePagesCount,
  prepareFile,
  preparedFile,
  screenSwitch,
  stopJobsRef,
}: {
  rootStyles: string;
  preparedFileName: string | undefined;
  showPopupWithExceptionDetail: (prefix: string, exception: any) => void;
  isFilePreparing: boolean;
  setScreenSwitch: (value: boolean) => void;
  preparedFilePagesCount: number | undefined;
  prepareFile: (file: File) => Promise<string>;
  preparedFile: File | undefined;
  screenSwitch: boolean;
  stopJobsRef: RefObject<boolean>;
}) {
  const [alert, setAlert] = useState<JSX.Element>();

  const [printerName, setPrinterName] = useState<string>("");
  const [copiesCount, setCopiesCount] = useState<number>(1);
  const [sides, setSides] = useState<PrintingOptionsSides>(
    PrintingOptionsSides.two_sided_long_edge,
  );
  const [pages, setPages] = useState<string | null>(null);
  const [numberUp, setNumberUp] = useState<PrintingOptionsNumberUp>(
    PrintingOptionsNumberUp.Value1,
  );
  const [jobId, setJobId] = useState<number>();

  const { data: rawPrinters } = $printers.useQuery(
    "get",
    "/print/get_printers",
  );
  const { data: rawStatuses } = $printers.useQuery(
    "get",
    "/print/get_printers_status",
  );
  const { mutateAsync: print, isPending: isPrintStarting } =
    $printers.useMutation("post", "/print/print");
  const { mutateAsync: getJobStatus } = $printers.useMutation(
    "get",
    "/print/job_status",
  );
  const { mutateAsync: cancelJob, isPending: isCancelling } =
    $printers.useMutation("post", "/print/cancel");

  useEffect(() => {
    if (!preparedFilePagesCount || !jobId) return;
    const actualPapersCount = calcPrintJobActualPapersCount(
      pages,
      copiesCount,
      numberUp,
      sides,
      preparedFilePagesCount,
    );
    async function waitTillThePrintingEnd() {
      const startTime = performance.now();
      while (
        performance.now() - startTime <
        actualPapersCount * 30 * 1000 // 30K milliseconds per page
      ) {
        if (stopJobsRef.current) break;
        let jobStatus;
        try {
          jobStatus = await getJobStatus({
            params: { query: { job_id: jobId! } },
          });
        } catch (exception: any) {
          console.log(
            `[web-print] Error during status retrieval for a job by id ${jobId}\n${exception}`,
          );
          continue;
        }
        console.log(jobStatus);
        if (
          [
            JobStateEnum.Value9 /* completed */,
            JobStateEnum.Value7 /* cancelled */,
            JobStateEnum.Value8 /* aborted */,
          ].includes(jobStatus.job_state)
        ) {
          setJobId(undefined);
          setScreenSwitch(false);
          await prepareFile(preparedFile!);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      try {
        await cancelJob({
          params: { query: { job_id: jobId! } },
        });
      } catch (exception: any) {
        console.log(
          `[web-print] Error during cancellation of a job by id ${jobId}\n${exception}`,
        );
      }
      if (!stopJobsRef.current)
        setAlert(
          <>
            <p className="font-bold!">The job has been timed out!</p>
            <p>Probably, the printer is busy, try to reboot it</p>
          </>,
        );
      setJobId(undefined);
      setScreenSwitch(false);
      await prepareFile(preparedFile!);
    }
    waitTillThePrintingEnd().then(() => {});
  }, [
    cancelJob,
    copiesCount,
    getJobStatus,
    jobId,
    numberUp,
    pages,
    prepareFile,
    preparedFile,
    preparedFilePagesCount,
    screenSwitch,
    setScreenSwitch,
    sides,
    stopJobsRef,
  ]);

  return (
    <>
      <div className={`${styles.configurationBox__scrollPart} ${rootStyles}`}>
        <div className={styles.scrollPart__elem}>
          <p className={fontStyles.formPointFont}>Printer</p>
          <IconValueStatusSelect
            defaultValue={printerName}
            icons={rawPrinters?.map(() => "🖨️")}
            names={rawPrinters?.map((printer) => printer.display_name)}
            values={rawPrinters?.map((printer) => printer.cups_name)}
            statuses={rawStatuses?.map((status) =>
              status.offline
                ? ", 💀 offline"
                : status.paper_percentage
                  ? ", 📃\xa0has\xa0paper"
                  : ", ✂️\xa0no\xa0paper",
            )}
            onSelected={setPrinterName}
          />
        </div>
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
          <p className={fontStyles.formPointFont}>Printing on both sides</p>
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
          <ScalablePageRangesInput defaultValue={pages} onTyped={setPages} />
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
      </div>
      <div className={rootStyles}>
        <button
          className={`${styles.button} ${fontStyles.buttonFont} ${marginStyles.bottomMargin_doubleMainPadding} ${(isPrintStarting || isCancelling || isFilePreparing) && styles.button_inactive}`}
          onClick={async () => {
            if (!preparedFileName) {
              setAlert(<p>There is no file to be printed!</p>);
              return;
            }
            try {
              setJobId(
                await print({
                  params: {
                    query: {
                      filename: preparedFileName,
                      printer_cups_name: printerName,
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
              setScreenSwitch(true);
              stopJobsRef.current = false;
            } catch (exception: any) {
              showPopupWithExceptionDetail("Start problem", exception);
            }
          }}
        >
          Start printing
        </button>
        {(isPrintStarting || isCancelling || isFilePreparing) && (
          <span
            className={`icon-[material-symbols--progress-activity] ${styles.sideIcon} ${styles.rotationAnimation}`}
          ></span>
        )}
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
