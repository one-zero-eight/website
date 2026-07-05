import { $printers } from "@/api/printers";
import { Modal } from "@/components/common/Modal.tsx";
import { FileDropzone } from "@/components/web-print/FileDropzone.tsx";
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
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export function PrintPage() {
  const [alert, setAlert] = useState<ReactNode>();
  const [pageRangesError, setPageRangesError] = useState<ReactNode>();

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

  useEffect(() => {
    if (rawPrinters?.length && !printerName) {
      setSession({ printerName: rawPrinters[0].cups_name });
    }
  }, [rawPrinters, printerName, setSession]);

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

  function handleCopiesDecrease() {
    if (copiesCount <= 1) return;
    setSession({ copiesCount: copiesCount - 1 });
  }

  function handleCopiesIncrease() {
    if (copiesCount >= 50) {
      setAlert(
        <p>
          You can print at most <span className="font-bold">50 copies</span>{" "}
          (and not less than 1).
        </p>,
      );
      return;
    }
    setSession({ copiesCount: copiesCount + 1 });
  }

  function handleCopiesChange(raw: string) {
    const value = Math.max(1, Math.min(50, parseInt(raw) || 1));
    if (value !== parseInt(raw)) {
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

  return (
    <>
      <div className="@container/content mx-auto w-full max-w-[1200px] px-4 py-6">
        <div className="grid grid-cols-1 gap-6 @lg/content:grid-cols-2 @lg/content:items-stretch">
          <div className="card card-border flex max-h-[calc(100vh-10rem)] flex-col overflow-hidden">
            <div className="card-body flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
              <h2 className="card-title shrink-0 text-base">
                <span className="icon-[material-symbols--upload-file-rounded]" />
                Document
                {!fileBlob && !isFileProcessing && (
                  <span className="badge badge-ghost badge-sm ml-auto font-normal">
                    Required
                  </span>
                )}
              </h2>
              <div className="flex min-h-0 flex-1 flex-col">
                <FileDropzone
                  variant="print"
                  fileProcess={async (file) => {
                    setSession({ originalFileName: file.name });
                    await getFile(await prepareFile(file), file.name);
                  }}
                  isFileProcessing={isFileProcessing}
                  blobPreviewURL={fileBlob}
                  downloadFileName={downloadFileName}
                  displayFileName={originalFileName ?? downloadFileName}
                  pageCount={previewPageCount}
                  totalPageCount={preparedFilePagesCount}
                  previewPages={previewPages}
                  fileSize={preparedFile?.size}
                  isFunctional={!isPrinting}
                />
              </div>
            </div>
          </div>

          <div className="card card-border">
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
                  <FormField label="Printer">
                    {rawPrinters ? (
                      <select
                        className="select select-bordered w-full"
                        value={printerName}
                        onChange={(e) =>
                          setSession({ printerName: e.target.value })
                        }
                      >
                        <option value="" disabled>
                          Select a printer
                        </option>
                        {rawPrinters.map((printer, i) => (
                          <option
                            key={printer.cups_name}
                            value={printer.cups_name}
                          >
                            {printer.display_name}
                            {rawStatuses?.[i]?.offline
                              ? " (offline)"
                              : rawStatuses?.[i]?.paper_percentage
                                ? " (has paper)"
                                : " (no paper)"}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="skeleton h-12 w-full" />
                    )}
                  </FormField>

                  <FormField label="Copies">
                    <div className="border-base-300 bg-base-100 rounded-field flex h-12 w-full items-stretch overflow-hidden border">
                      <button
                        type="button"
                        className="btn btn-ghost hover:bg-base-200 h-full min-h-0 w-12 shrink-0 rounded-none"
                        disabled={copiesCount <= 1}
                        onClick={handleCopiesDecrease}
                      >
                        <span className="icon-[material-symbols--remove-rounded] text-xl" />
                      </button>
                      <div className="bg-base-300 w-px shrink-0 self-stretch" />
                      <input
                        type="number"
                        className="min-w-0 flex-1 [appearance:textfield] bg-transparent px-2 text-center text-base font-medium tabular-nums outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        min={1}
                        max={50}
                        value={copiesCount}
                        onChange={(e) => handleCopiesChange(e.target.value)}
                      />
                      <div className="bg-base-300 w-px shrink-0 self-stretch" />
                      <button
                        type="button"
                        className="btn btn-ghost hover:bg-base-200 h-full min-h-0 w-12 shrink-0 rounded-none"
                        disabled={copiesCount >= 50}
                        onClick={handleCopiesIncrease}
                      >
                        <span className="icon-[material-symbols--add-rounded] text-xl" />
                      </button>
                    </div>
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

                  <div className="mt-2 flex flex-col gap-2">
                    <button
                      type="button"
                      className="btn btn-primary w-full"
                      disabled={jobInProgress || !preparedFileName}
                      onClick={handleStartPrint}
                    >
                      {isPrintStarting ? (
                        <span className="loading loading-spinner loading-sm" />
                      ) : (
                        "Start printing"
                      )}
                    </button>
                    {actualPapersCount > 0 && (
                      <p className="text-base-content/50 text-center text-sm">
                        ~{actualPapersCount} sheets
                      </p>
                    )}
                  </div>
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
      <span className="text-base-content/70 text-sm font-medium">{label}</span>
      {children}
    </div>
  );
}
