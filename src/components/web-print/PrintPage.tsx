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
import { LayoutSelector } from "@/components/web-print/LayoutSelector.tsx";
import {
  calcPrintJobActualPapersCount,
  resolvePreviewPageRanges,
} from "@/components/web-print/print-utils.ts";
import {
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
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export function PrintPage() {
  const [alert, setAlert] = useState<ReactNode>();
  const [pageRangesError, setPageRangesError] = useState<ReactNode>();
  const filePickerRef = useRef<HTMLInputElement>(null);

  function showPopupWithExceptionDetail(prefix: string, exception: unknown) {
    const detail =
      exception &&
      typeof exception === "object" &&
      "detail" in exception &&
      exception.detail
        ? String(exception.detail)
        : "Unknown error. Service is unavailable";
    setAlert(
      <p>
        {prefix}: {detail}
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
      setSession({ jobId: newJobId, isPrinting: true });
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

  useEffect(() => {
    if (!preparedFilePagesCount || !jobId || !isPrinting) return;

    const papersCount = calcPrintJobActualPapersCount(
      pages,
      copiesCount,
      numberUp,
      sides,
      preparedFilePagesCount,
    );

    let cancelled = false;

    async function waitTillThePrintingEnd() {
      const startTime = performance.now();
      while (performance.now() - startTime < papersCount * 30 * 1000) {
        if (cancelled || shouldStopPrintJobPolling()) break;
        let jobStatus;
        try {
          jobStatus = await getJobStatus({
            params: { query: { job_id: jobId! } },
          });
        } catch (exception: unknown) {
          console.log(
            `[web-print] Error during status retrieval for job ${jobId}`,
            exception,
          );
          continue;
        }
        if (
          [
            JobStateEnum.Value9,
            JobStateEnum.Value7,
            JobStateEnum.Value8,
          ].includes(jobStatus.job_state)
        ) {
          setSession({ jobId: undefined, isPrinting: false });
          if (preparedFile) await prepareFile(preparedFile);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      if (cancelled || shouldStopPrintJobPolling()) return;

      try {
        await cancelJob({ params: { query: { job_id: jobId! } } });
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
      setSession({ jobId: undefined, isPrinting: false });
      if (preparedFile) await prepareFile(preparedFile);
    }

    waitTillThePrintingEnd();

    return () => {
      cancelled = true;
    };
  }, [
    cancelJob,
    copiesCount,
    getJobStatus,
    isPrinting,
    jobId,
    numberUp,
    pages,
    prepareFile,
    preparedFile,
    preparedFilePagesCount,
    setSession,
    sides,
  ]);

  function handleCancelPrint() {
    requestStopPrintJobPolling();
    setSession({ isPrinting: false, jobId: undefined });
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
                {!fileBlob && !isFileProcessing && (
                  <span className="badge badge-ghost badge-sm ml-auto font-normal">
                    Required
                  </span>
                )}
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
                isFunctional={!isPrinting}
              />
            </div>
          </div>

          <div className="card card-border w-full shrink-0 @4xl/content:w-[26rem]">
            <div className="card-body gap-4">
              <h2 className="card-title text-base">
                <span className="icon-[material-symbols--print-rounded]" />
                Print settings
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
              ) : (
                <div className="flex flex-col gap-4">
                  {fileBlob && (
                    <div className="bg-base-200 rounded-box flex items-center gap-3 px-3 py-2.5">
                      <span className="icon-[material-symbols--picture-as-pdf-rounded] text-primary shrink-0 text-4xl" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">
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
                        <span className="icon-[material-symbols--upload-file-rounded] text-3xl" />
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

                  <FormField label="Layout">
                    <LayoutSelector
                      value={numberUp}
                      onChange={(value) => setSession({ numberUp: value })}
                    />
                  </FormField>

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
