import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { $printers } from "@/api/printers";
import { Modal } from "@/components/common/Modal.tsx";
import {
  DeviceOption,
  DeviceOptionList,
} from "@/components/web-print/DeviceOptionList.tsx";
import {
  FileDropzone,
  formatFileSize,
} from "@/components/web-print/FileDropzone.tsx";
// import { LayoutSelector } from "@/components/web-print/LayoutSelector.tsx";
import {
  calcPrintJobActualPapersCount,
  resolvePreviewPageRanges,
} from "@/components/web-print/print-utils.ts";
import {
  getPrintSessionState,
  requestStopPrintJobPolling,
  resetStopPrintJobPolling,
  shouldStopPrintJobPolling,
} from "@/components/web-print/print-session.ts";
import { usePrintSession } from "@/components/web-print/usePrintSession.ts";
import {
  JobStateEnum,
  PrintingOptionsSidesAnyOf0,
} from "@/api/printers/types.ts";
import { cn } from "@/lib/ui/cn";
import { Link } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

const PRINTER_MAP_LINKS: Record<
  string,
  { scene: string; area: string; label: string }
> = {
  "319": {
    scene: "university-floor-3",
    area: "printer-319",
    label: "Show 319 on map",
  },
  "vk-zone": {
    scene: "university-floor-5",
    area: "printer-5f",
    label: "Show VK Zone on map",
  },
};

function resolvePrinterMapLink(cupsName: string, displayName?: string) {
  const haystack = `${cupsName} ${displayName ?? ""}`.toLowerCase();
  if (haystack.includes("319")) return PRINTER_MAP_LINKS["319"];
  if (
    haystack.includes("vk") ||
    haystack.includes("5f") ||
    haystack.includes("5-f")
  )
    return PRINTER_MAP_LINKS["vk-zone"];
  return null;
}

export function PrintPage() {
  const [alert, setAlert] = useState<ReactNode>();
  const [pageRangesError, setPageRangesError] = useState<ReactNode>();
  const [previewToolbarHost, setPreviewToolbarHost] =
    useState<HTMLDivElement | null>(null);
  const filePickerRef = useRef<HTMLInputElement>(null);

  function showPopupWithExceptionDetail(prefix: string, exception: unknown) {
    setAlert(
      <p>
        {prefix}: {formatApiErrorMessage(exception)}
      </p>,
    );
  }

  const { session, setSession, prepareFile, getFile, isFileProcessing } =
    usePrintSession(showPopupWithExceptionDetail);

  const {
    printerName,
    copiesCount,
    sides,
    pages,
    pageRangesInput,
    numberUp,
    jobId,
    isPrinting,
    printResultPrinterName,
    originalFileName,
    preparedFile,
    fileBlob,
    preparedFileName,
    downloadFileName,
    preparedFilePagesCount,
  } = session;

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
  const { mutateAsync: cancelJob } = $printers.useMutation(
    "post",
    "/print/cancel",
  );

  function getPrinterStatus(cupsName: string) {
    return rawStatuses?.find((status) => status.printer.cups_name === cupsName);
  }

  function isPrinterOffline(cupsName: string) {
    return getPrinterStatus(cupsName)?.offline === true;
  }

  useEffect(() => {
    if (!rawPrinters?.length) return;

    const selectedIsUsable =
      !!printerName &&
      rawPrinters.some((printer) => printer.cups_name === printerName) &&
      !isPrinterOffline(printerName);

    if (selectedIsUsable) return;

    const firstOnline = rawPrinters.find(
      (printer) => !isPrinterOffline(printer.cups_name),
    );
    setSession({
      printerName: (firstOnline ?? rawPrinters[0]).cups_name,
    });
  }, [rawPrinters, rawStatuses, printerName, setSession]);

  const actualPapersCount = preparedFilePagesCount
    ? calcPrintJobActualPapersCount(
        pages,
        copiesCount,
        numberUp,
        sides,
        preparedFilePagesCount,
      )
    : 0;

  const handlePageRangesBlur = () => {
    const value = pageRangesInput.replace(/\s/g, "");
    if (!value) {
      setSession({ pages: null, pageRangesInput: "" });
      return;
    }
    if (
      !value.match("^((([0-9]+-[0-9]+)|([0-9]+)),)*(([0-9]+)|([0-9]+-[0-9]+))$")
    ) {
      setPageRangesError(
        <>
          <p>Incorrect page range format.</p>
          <p className="text-base-content/50 mt-2 text-sm">
            Leave empty for all pages. Example: 1-5,8,16-20
          </p>
        </>,
      );
      setSession({ pages: null, pageRangesInput: "" });
      return;
    }
    setSession({ pages: value, pageRangesInput: value });
  };

  const handleStartPrint = useCallback(async () => {
    if (!preparedFileName) {
      setAlert(<p>There is no file to be printed!</p>);
      return;
    }
    try {
      const newJobId = await print({
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
            sides,
            "number-up": numberUp,
          },
        },
      });
      resetStopPrintJobPolling();
      setSession({
        jobId: newJobId,
        isPrinting: true,
        printResultPrinterName: undefined,
      });
    } catch (exception: unknown) {
      showPopupWithExceptionDetail("Start problem", exception);
    }
  }, [
    copiesCount,
    numberUp,
    pages,
    preparedFileName,
    print,
    printerName,
    setSession,
    sides,
  ]);

  const getJobStatusRef = useRef(getJobStatus);
  getJobStatusRef.current = getJobStatus;
  const cancelJobRef = useRef(cancelJob);
  cancelJobRef.current = cancelJob;

  useEffect(() => {
    if (!jobId || !isPrinting) return;

    let cancelled = false;

    async function waitTillThePrintingEnd() {
      const {
        pages: currentPages,
        copiesCount: currentCopies,
        numberUp: currentNumberUp,
        sides: currentSides,
        preparedFilePagesCount: pageCount,
        printerName: currentPrinter,
      } = getPrintSessionState();

      if (!pageCount) return;

      const papersCount = calcPrintJobActualPapersCount(
        currentPages,
        currentCopies,
        currentNumberUp,
        currentSides,
        pageCount,
      );

      const startTime = performance.now();
      while (performance.now() - startTime < papersCount * 30 * 1000) {
        if (cancelled || shouldStopPrintJobPolling()) break;

        let jobStatus;
        try {
          jobStatus = await getJobStatusRef.current({
            params: { query: { job_id: jobId! } },
          });
        } catch (exception: unknown) {
          console.log(
            `[web-print] Error during status retrieval for job ${jobId}`,
            exception,
          );
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }

        if (
          [
            JobStateEnum.Value9,
            JobStateEnum.Value7,
            JobStateEnum.Value8,
          ].includes(jobStatus.job_state)
        ) {
          const completed = jobStatus.job_state === JobStateEnum.Value9;
          setSession({
            jobId: undefined,
            isPrinting: false,
            ...(completed
              ? { printResultPrinterName: currentPrinter }
              : { printResultPrinterName: undefined }),
          });
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      if (cancelled || shouldStopPrintJobPolling()) return;

      try {
        await cancelJobRef.current({ params: { query: { job_id: jobId! } } });
      } catch (exception: unknown) {
        console.log(
          `[web-print] Error during cancellation of job ${jobId}`,
          exception,
        );
      }

      if (!shouldStopPrintJobPolling()) {
        setAlert(
          <>
            <p className="font-bold">The job has timed out!</p>
            <p>Probably, the printer is busy — try to reboot it.</p>
          </>,
        );
      }

      setSession({
        jobId: undefined,
        isPrinting: false,
        printResultPrinterName: undefined,
      });
    }

    void waitTillThePrintingEnd();

    return () => {
      cancelled = true;
    };
  }, [jobId, isPrinting, setSession]);

  function handleCancelPrint() {
    requestStopPrintJobPolling();
    setSession({
      isPrinting: false,
      jobId: undefined,
      printResultPrinterName: undefined,
    });
  }

  function handleResetPrint() {
    setSession({
      originalFileName: undefined,
      preparedFile: undefined,
      fileBlob: undefined,
      preparedFileName: undefined,
      downloadFileName: undefined,
      preparedFilePagesCount: undefined,
      pages: null,
      pageRangesInput: "",
      printResultPrinterName: undefined,
    });
  }

  function handleDismissPrintResult() {
    setSession({ printResultPrinterName: undefined });
  }

  function handleCopiesChange(raw: string) {
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      setSession({ copiesCount: 1 });
      return;
    }
    const value = Math.max(1, Math.min(50, parsed));
    if (value !== parsed) {
      setAlert(
        <p>
          You can print at most <span className="font-bold">50 copies</span>{" "}
          (and not less than 1).
        </p>,
      );
    }
    setSession({ copiesCount: value });
  }

  const jobInProgress = isPrinting || isPrintStarting || isFileProcessing;

  const previewPages = useMemo(() => {
    if (!preparedFilePagesCount) return undefined;
    return resolvePreviewPageRanges(
      pageRangesInput,
      pages,
      preparedFilePagesCount,
    );
  }, [pageRangesInput, pages, preparedFilePagesCount]);

  const previewPageCount = previewPages?.length ?? preparedFilePagesCount;
  const fileLabel = originalFileName ?? downloadFileName;
  const fileMeta = [
    previewPageCount
      ? preparedFilePagesCount && previewPageCount < preparedFilePagesCount
        ? `${previewPageCount} of ${preparedFilePagesCount} pages`
        : `${previewPageCount} page${previewPageCount !== 1 ? "s" : ""}`
      : null,
    preparedFile?.size ? formatFileSize(preparedFile.size) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const selectedPrinterOffline = !!printerName && isPrinterOffline(printerName);

  return (
    <>
      <div className="@container/content mx-auto w-full max-w-[1200px] px-4 py-6">
        <div className="flex flex-col gap-6 @4xl/content:flex-row @4xl/content:items-start">
          <div
            className={cn(
              "card card-border w-full min-w-0 @4xl/content:flex-1",
              !fileBlob && "min-h-80",
            )}
          >
            <div className="card-body flex flex-col gap-4">
              <h2 className="card-title shrink-0 text-base">
                <span className="icon-[material-symbols--picture-as-pdf-rounded]" />
                Preview
                <div
                  ref={setPreviewToolbarHost}
                  className="ml-auto flex items-center"
                >
                  {!fileBlob && !isFileProcessing && (
                    <span className="badge badge-ghost badge-sm font-normal">
                      Required
                    </span>
                  )}
                </div>
              </h2>
              <FileDropzone
                variant="print"
                filePickerRef={filePickerRef}
                fileProcess={async (file) => {
                  setSession({ originalFileName: file.name });
                  await getFile(await prepareFile(file), file.name);
                }}
                isFileProcessing={isFileProcessing}
                blobPreviewURL={fileBlob}
                downloadFileName={downloadFileName}
                previewPages={previewPages}
                previewToolbarHost={previewToolbarHost}
                isFunctional={!isPrinting}
              />
            </div>
          </div>

          <div className="card card-border w-full shrink-0 @4xl/content:w-[26rem]">
            <div className="card-body gap-4">
              <h2 className="card-title text-base">
                <span className="icon-[material-symbols--print-rounded]" />
                {printResultPrinterName
                  ? "Print result"
                  : isPrinting
                    ? "Printing"
                    : "Print settings"}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm ml-auto"
                  disabled={
                    isPrinting ||
                    isFileProcessing ||
                    (!fileBlob && !printResultPrinterName)
                  }
                  onClick={
                    printResultPrinterName
                      ? handleDismissPrintResult
                      : handleResetPrint
                  }
                >
                  {printResultPrinterName ? "Done" : "Cancel"}
                </button>
              </h2>

              {isPrinting ? (
                <div className="flex flex-col items-center gap-4 py-8">
                  <span className="loading loading-spinner loading-lg text-primary" />
                  <p className="text-base-content/50">Printing in progress…</p>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={handleCancelPrint}
                  >
                    Cancel
                  </button>
                </div>
              ) : printResultPrinterName ? (
                <PrintResultPanel
                  printerCupsName={printResultPrinterName}
                  printerDisplayName={
                    rawPrinters?.find(
                      (printer) => printer.cups_name === printResultPrinterName,
                    )?.display_name
                  }
                  fileLabel={fileLabel}
                  onPrintAnother={handleDismissPrintResult}
                />
              ) : (
                <div className="flex flex-col gap-4">
                  {fileBlob && (
                    <div className="bg-base-200 rounded-box flex items-center gap-3 px-3 py-2.5">
                      <span className="icon-[material-symbols--picture-as-pdf-rounded] text-primary shrink-0 text-4xl" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base">
                          {fileLabel || "Document"}
                        </p>
                        {fileMeta && (
                          <p className="text-base-content/50 text-xs">
                            {fileMeta}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost btn-square shrink-0"
                        disabled={isFileProcessing}
                        title="Replace file"
                        onClick={() => filePickerRef.current?.click()}
                      >
                        <span className="icon-[material-symbols--cached-rounded] text-2xl" />
                      </button>
                    </div>
                  )}

                  <DeviceOptionList label="Printer">
                    {rawPrinters ? (
                      rawPrinters.map((printer) => {
                        const status = getPrinterStatus(printer.cups_name);
                        const offline = status?.offline === true;
                        const selected = printerName === printer.cups_name;

                        return (
                          <DeviceOption
                            key={printer.cups_name}
                            title={printer.display_name}
                            selected={selected}
                            disabled={offline}
                            onClick={() =>
                              setSession({ printerName: printer.cups_name })
                            }
                            meta={
                              status ? (
                                <span className="text-base-content/50">
                                  <span
                                    className={cn(
                                      offline ? "text-error" : "text-success",
                                    )}
                                  >
                                    {offline ? "Offline" : "Online"}
                                  </span>
                                  {!offline && (
                                    <>
                                      {" · "}
                                      {status.paper_percentage != null
                                        ? `Paper ${status.paper_percentage}%`
                                        : "Paper unknown"}
                                      {status.toner_percentage != null &&
                                        ` · Toner ${status.toner_percentage}%`}
                                    </>
                                  )}
                                </span>
                              ) : (
                                <span className="text-base-content/50">
                                  Status unknown
                                </span>
                              )
                            }
                          />
                        );
                      })
                    ) : (
                      <>
                        <div className="skeleton h-14 w-full" />
                        <div className="skeleton h-14 w-full" />
                      </>
                    )}
                  </DeviceOptionList>

                  <FormField label="Copies">
                    <input
                      type="number"
                      className="input input-bordered w-full"
                      min={1}
                      max={50}
                      value={copiesCount}
                      onChange={(e) => handleCopiesChange(e.target.value)}
                    />
                  </FormField>

                  <FormField label="Print on both sides">
                    <input
                      type="checkbox"
                      className="toggle toggle-primary"
                      checked={
                        sides === PrintingOptionsSidesAnyOf0.two_sided_long_edge
                      }
                      onChange={(e) =>
                        setSession({
                          sides: e.target.checked
                            ? PrintingOptionsSidesAnyOf0.two_sided_long_edge
                            : PrintingOptionsSidesAnyOf0.one_sided,
                        })
                      }
                    />
                  </FormField>

                  <FormField label="Specific pages">
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      placeholder="e.g. 1-5,8,16-20 (empty = all)"
                      value={pageRangesInput}
                      onChange={(e) =>
                        setSession({ pageRangesInput: e.target.value })
                      }
                      onBlur={handlePageRangesBlur}
                    />
                  </FormField>

                  {/* Layout selector is hidden for now: number-up currently works
                      unintuitively / doesn't work reliably for users.
                  <FormField label="Layout">
                    <LayoutSelector
                      value={numberUp}
                      onChange={(value) => setSession({ numberUp: value })}
                    />
                  </FormField>
                  */}

                  <button
                    type="button"
                    className="btn btn-primary mt-2 w-full"
                    disabled={
                      jobInProgress ||
                      !preparedFileName ||
                      selectedPrinterOffline
                    }
                    onClick={handleStartPrint}
                  >
                    {isPrintStarting ? (
                      <span className="loading loading-spinner loading-sm" />
                    ) : (
                      `Print ${actualPapersCount || 1} sheet${(actualPapersCount || 1) === 1 ? "" : "s"}`
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={!!alert}
        onOpenChange={() => setAlert(undefined)}
        title="Warning"
      >
        {alert}
      </Modal>

      <Modal
        open={!!pageRangesError}
        onOpenChange={() => setPageRangesError(undefined)}
        title="Warning"
      >
        {pageRangesError}
      </Modal>
    </>
  );
}

function PrintResultPanel({
  printerCupsName,
  printerDisplayName,
  fileLabel,
  onPrintAnother,
}: {
  printerCupsName: string;
  printerDisplayName?: string;
  fileLabel?: string;
  onPrintAnother: () => void;
}) {
  const mapLink = resolvePrinterMapLink(printerCupsName, printerDisplayName);
  const printerLabel = printerDisplayName || printerCupsName;

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-success/10 text-success rounded-box flex items-start gap-3 px-3 py-3">
        <span className="icon-[material-symbols--check-circle-rounded] shrink-0 text-3xl" />
        <div className="min-w-0">
          <p className="text-base">Printed successfully</p>
          <p className="text-success/80 mt-0.5 text-sm">
            {fileLabel
              ? `${fileLabel} was sent to the printer`
              : "Your document was sent to the printer"}
          </p>
        </div>
      </div>

      <div className="bg-base-200 rounded-box flex flex-col gap-1 px-3 py-2.5">
        <p className="text-base-content/50 text-sm">Printer</p>
        <p className="text-base">{printerLabel}</p>
        {mapLink && (
          <Link
            to="/maps"
            search={{ scene: mapLink.scene, area: mapLink.area }}
            className="text-primary mt-1 inline-flex items-center gap-1 text-sm hover:underline"
          >
            <span className="icon-[material-symbols--map-rounded] text-base" />
            {mapLink.label}
          </Link>
        )}
      </div>

      <button
        type="button"
        className="btn btn-primary w-full"
        onClick={onPrintAnother}
      >
        Print another
      </button>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-base-content/70 text-sm">{label}</span>
      {children}
    </div>
  );
}
