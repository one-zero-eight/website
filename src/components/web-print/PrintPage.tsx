import { msg, plural } from "@lingui/core/macro";
import { formatApiErrorDescriptor } from "@/api/helpers/create-query-client";
import { Trans, useLingui } from "@lingui/react/macro";
import { Trans as LocalizedMessage } from "@lingui/react";
import { type MessageDescriptor } from "@lingui/core";
import { $printers } from "@/api/printers";
import { Modal } from "@/components/common/Modal.tsx";
import {
  DeviceOption,
  DeviceOptionList,
} from "@/components/web-print/DeviceOptionList.tsx";
import { FileDropzone } from "./FileDropzone.tsx";
// import { LayoutSelector } from "@/components/web-print/LayoutSelector.tsx";
import {
  calcPrintJobActualPapersCount,
  formatFileSize,
  resolvePreviewPageRanges,
} from "./print-utils.ts";
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

function resolvePrinterMapLink(cupsName: string, displayName?: string) {
  const haystack = `${cupsName} ${displayName ?? ""}`.toLowerCase();
  if (haystack.includes("319")) {
    return {
      scene: "university-floor-3",
      area: "printer-319",
      label: msg`Show 319 on map`,
    };
  }
  if (
    haystack.includes("vk") ||
    haystack.includes("5f") ||
    haystack.includes("5-f")
  ) {
    return {
      scene: "university-floor-5",
      area: "printer-5f",
      label: msg`Show VK Zone on map`,
    };
  }
  return null;
}

export function PrintPage() {
  const [alert, setAlert] = useState<ReactNode>();
  const [pageRangesError, setPageRangesError] = useState<ReactNode>();
  const [previewToolbarHost, setPreviewToolbarHost] =
    useState<HTMLDivElement | null>(null);
  const filePickerRef = useRef<HTMLInputElement>(null);

  const { t } = useLingui();

  function showPopupWithExceptionDetail(
    prefix: MessageDescriptor,
    exception: unknown,
  ) {
    const errorMessage = formatApiErrorDescriptor(exception);
    setAlert(
      <p>
        <LocalizedMessage
          id={prefix.id}
          message={prefix.message}
          values={prefix.values}
        />
        :{" "}
        {typeof errorMessage === "string" ? (
          errorMessage
        ) : (
          <LocalizedMessage
            id={errorMessage.id}
            message={errorMessage.message}
            values={errorMessage.values}
          />
        )}
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
          <p>
            <Trans>Incorrect page range format.</Trans>
          </p>
          <p className="text-base-content/50 mt-2 text-sm">
            <Trans>Leave empty for all pages. Example: 1-5,8,16-20</Trans>
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
      setAlert(
        <p>
          <Trans>There is no file to be printed!</Trans>
        </p>,
      );
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
      showPopupWithExceptionDetail(msg`Start problem`, exception);
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
            <p className="font-bold">
              <Trans>The job has timed out!</Trans>
            </p>
            <p>
              <Trans>Probably, the printer is busy — try to reboot it.</Trans>
            </p>
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
          <Trans>
            You can print at most <span className="font-bold">50 copies</span>{" "}
            (and not less than 1).
          </Trans>
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
        ? t`${previewPageCount} of ${preparedFilePagesCount} pages`
        : t`${plural(previewPageCount, { one: "# page", other: "# pages" })}`
      : null,
    preparedFile?.size ? formatFileSize(preparedFile.size) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const selectedPrinterOffline = !!printerName && isPrinterOffline(printerName);

  const printSheetsCount = actualPapersCount || 1;
  const printButtonLabel = t`${plural(printSheetsCount, {
    one: "Print # sheet",
    other: "Print # sheets",
  })}`;

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
                <Trans>Preview</Trans>
                <div
                  ref={setPreviewToolbarHost}
                  className="ml-auto flex items-center"
                >
                  {!fileBlob && !isFileProcessing && (
                    <span className="badge badge-ghost badge-sm font-normal">
                      <Trans>Required</Trans>
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
                  ? t`Print result`
                  : isPrinting
                    ? t`Printing`
                    : t`Print settings`}
                {printResultPrinterName && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm ml-auto"
                    onClick={handleDismissPrintResult}
                  >
                    <Trans>Done</Trans>
                  </button>
                )}
              </h2>

              {isPrinting ? (
                <div className="flex flex-col items-center gap-4 py-8">
                  <span className="loading loading-spinner loading-lg text-primary" />
                  <p className="text-base-content/50">
                    <Trans>Printing in progress…</Trans>
                  </p>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={handleCancelPrint}
                  >
                    <Trans>Cancel</Trans>
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
                          {fileLabel || t`Document`}
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
                        title={t`Remove file`}
                        onClick={handleResetPrint}
                      >
                        <span className="icon-[material-symbols--close-rounded] text-2xl" />
                      </button>
                    </div>
                  )}

                  <DeviceOptionList label={t`Printer`}>
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
                                    {offline ? t`Offline` : t`Online`}
                                  </span>
                                  {!offline && (
                                    <>
                                      {" · "}
                                      {status.paper_percentage != null
                                        ? t`Paper ${status.paper_percentage}%`
                                        : t`Paper unknown`}
                                      {status.toner_percentage != null &&
                                        t` · Toner ${status.toner_percentage}%`}
                                    </>
                                  )}
                                </span>
                              ) : (
                                <span className="text-base-content/50">
                                  <Trans>Status unknown</Trans>
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

                  <FormField label={t`Copies`}>
                    <input
                      type="number"
                      className="input input-bordered w-full"
                      min={1}
                      max={50}
                      value={copiesCount}
                      onChange={(e) => handleCopiesChange(e.target.value)}
                    />
                  </FormField>

                  <FormField label={t`Print on both sides`}>
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

                  <FormField label={t`Specific pages`}>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      placeholder={t`e.g. 1-5,8,16-20 (empty = all)`}
                      value={pageRangesInput}
                      onChange={(e) =>
                        setSession({ pageRangesInput: e.target.value })
                      }
                      onBlur={handlePageRangesBlur}
                    />
                  </FormField>

                  {/* Layout selector is hidden for now: number-up currently works
                      unintuitively / doesn't work reliably for users.
                  <FormField label={t`Layout`}>
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
                      printButtonLabel
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
        title={t`Warning`}
      >
        {alert}
      </Modal>

      <Modal
        open={!!pageRangesError}
        onOpenChange={() => setPageRangesError(undefined)}
        title={t`Warning`}
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
  const { t, i18n } = useLingui();
  const mapLink = resolvePrinterMapLink(printerCupsName, printerDisplayName);
  const printerLabel = printerDisplayName || printerCupsName;

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-success/10 text-success rounded-box flex items-start gap-3 px-3 py-3">
        <span className="icon-[material-symbols--check-circle-rounded] shrink-0 text-3xl" />
        <div className="min-w-0">
          <p className="text-base">
            <Trans>Printed successfully</Trans>
          </p>
          <p className="text-success/80 mt-0.5 text-sm">
            {fileLabel
              ? t`${fileLabel} was sent to the printer`
              : t`Your document was sent to the printer`}
          </p>
        </div>
      </div>

      <div className="bg-base-200 rounded-box flex flex-col gap-1 px-3 py-2.5">
        <p className="text-base-content/50 text-sm">
          <Trans>Printer</Trans>
        </p>
        <p className="text-base">{printerLabel}</p>
        {mapLink && (
          <Link
            to="/maps"
            search={{ scene: mapLink.scene, area: mapLink.area }}
            className="text-primary mt-1 inline-flex items-center gap-1 text-sm hover:underline"
          >
            <span className="icon-[material-symbols--map-rounded] text-base" />
            {i18n._(mapLink.label)}
          </Link>
        )}
      </div>

      <button
        type="button"
        className="btn btn-primary w-full"
        onClick={onPrintAnother}
      >
        <Trans>Print another</Trans>
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
