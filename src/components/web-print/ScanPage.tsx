import { plural } from "@lingui/core/macro";
import { formatApiErrorDescriptor } from "@/api/helpers/create-query-client";
import { Trans, useLingui } from "@lingui/react/macro";
import { Trans as LocalizedMessage } from "@lingui/react";
import { type MessageDescriptor } from "@lingui/core";
import { $printers } from "@/api/printers";
import { Modal } from "@/components/common/Modal.tsx";
import Tooltip from "@/components/common/Tooltip.tsx";
import {
  DeviceOption,
  DeviceOptionList,
} from "@/components/web-print/DeviceOptionList.tsx";
import { FileDropzone } from "./FileDropzone.tsx";
import { formatFileSize } from "./print-utils.ts";
import { getScanSessionState } from "@/components/web-print/scan-session.ts";
import { useScanSession } from "@/components/web-print/useScanSession.ts";
import {
  ScanningOptionsCrop,
  ScanningOptionsInput_source,
  ScanningOptionsQuality,
  ScanningOptionsSides,
} from "@/api/printers/types.ts";
import { cn } from "@/lib/ui/cn";
import { useEffect, useState, type ReactNode } from "react";

/** Fake scan duration: ~6.5s per 100 dpi + optional warmup. */
const SCAN_FAKE_MS_PER_100_DPI = 6500;
const SCAN_FAKE_WARMUP_MS = 5_000;
const SCAN_FAKE_COLD_AFTER_MS = 1 * 60 * 1000;

function estimateScanDurationMs(
  dpi: string | number,
  { needsWarmup }: { needsWarmup: boolean },
) {
  return (
    (Number(dpi) / 100) * SCAN_FAKE_MS_PER_100_DPI +
    (needsWarmup ? SCAN_FAKE_WARMUP_MS : 0)
  );
}

export function ScanPage() {
  const { t } = useLingui();
  const [alert, setAlert] = useState<ReactNode>();
  const [scanError, setScanError] = useState<ReactNode>();
  const [showResultPanel, setShowResultPanel] = useState(true);
  const [scanProgress, setScanProgress] = useState(0);
  const [previewToolbarHost, setPreviewToolbarHost] =
    useState<HTMLDivElement | null>(null);
  const [removeLastPageModalOpen, setRemoveLastPageModalOpen] = useState(false);

  function renderApiError(error: unknown) {
    const message = formatApiErrorDescriptor(error);
    if (typeof message === "string") return message;

    return (
      <LocalizedMessage
        id={message.id}
        message={message.message}
        values={message.values}
      />
    );
  }

  function showPopupWithExceptionDetail(
    prefix: MessageDescriptor,
    exception: unknown,
  ) {
    setAlert(
      <p>
        <LocalizedMessage
          id={prefix.id}
          message={prefix.message}
          values={prefix.values}
        />
        : {renderApiError(exception)}
      </p>,
    );
  }

  const { session, setSession, removeLastPage, getFile, isFileProcessing } =
    useScanSession(showPopupWithExceptionDetail);

  const {
    scannerName,
    mode,
    scanSides,
    quality,
    crop,
    documentName,
    hasScanResult,
    isScanning,
    preparedFile,
    fileBlob,
    downloadFileName,
    preparedFilePagesCount,
  } = session;

  const { data: rawScanners } = $printers.useQuery("get", "/scan/get_scanners");
  const { data: rawStatuses } = $printers.useQuery(
    "get",
    "/scan/debug/get_scanners_status",
  );
  const { mutateAsync: scan, isPending: isScanStarting } =
    $printers.useMutation("post", "/scan/manual/start_scan");
  const { mutateAsync: waitTillTheEnd, isPending: isScanWaiting } =
    $printers.useMutation("post", "/scan/manual/wait_and_merge");
  const { mutateAsync: cancelScan, isPending: isScanCancelling } =
    $printers.useMutation("post", "/scan/manual/cancel_scan");
  const { mutateAsync: deleteScanFileFromTheServer } = $printers.useMutation(
    "post",
    "/scan/manual/delete_file",
  );

  function isScannerOffline(name: string) {
    return (
      rawStatuses?.find((status) => status.scanner.name === name)?.offline ===
      true
    );
  }

  useEffect(() => {
    if (!rawScanners?.length) return;

    const selectedIsUsable =
      !!scannerName &&
      rawScanners.some((scanner) => scanner.name === scannerName) &&
      !isScannerOffline(scannerName);

    if (selectedIsUsable) return;

    const firstOnline = rawScanners.find(
      (scanner) => !isScannerOffline(scanner.name),
    );
    setSession({ scannerName: (firstOnline ?? rawScanners[0]).name });
  }, [rawScanners, rawStatuses, scannerName, setSession]);

  const selectedScannerOffline = !!scannerName && isScannerOffline(scannerName);

  function getScanDisplayFileName() {
    const trimmed = documentName.trim();
    return trimmed ? `${trimmed}.pdf` : "document.pdf";
  }

  async function reloadScanPreview(serverFilename: string) {
    await getFile(serverFilename, getScanDisplayFileName());
    if (!documentName.trim()) {
      setSession({
        documentName: "document",
        downloadFileName: "document.pdf",
      });
    }
  }

  async function scanAndWait(startNewScan: boolean) {
    if (isScannerOffline(scannerName)) {
      setScanError(<Trans>Selected scanner is offline</Trans>);
      return;
    }

    if (startNewScan) setSession({ isNewScan: true });
    setScanError(undefined);
    setSession({
      isScanning: true,
      ...(startNewScan
        ? { hasScanResult: false }
        : { hasDownloadedScan: false }),
    });

    let jobId;
    try {
      jobId = await scan({
        params: { query: { scanner_name: scannerName } },
        body: {
          scanning_options: {
            sides: scanSides,
            crop,
            quality,
            input_source: mode,
          },
        },
      });
    } catch (exception: unknown) {
      setScanError(renderApiError(exception));
      setSession({ isScanning: false });
      return;
    }

    if (!jobId) {
      setSession({ isScanning: false });
      return;
    }

    const startTime = performance.now();
    const { isNewScan: isNewScanJob, preparedFileName: prevFilename } =
      getScanSessionState();
    const promisedScan = waitTillTheEnd({
      params: {
        query: {
          scanner_name: scannerName,
          job_id: jobId,
          prev_filename: isNewScanJob ? null : prevFilename,
        },
      },
    });
    setSession({ isNewScan: false });

    let scanWasResolved = false;
    let waitError: unknown;
    promisedScan.then(
      () => {
        scanWasResolved = true;
      },
      (error: unknown) => {
        scanWasResolved = true;
        waitError = error;
      },
    );

    while (performance.now() - startTime < 60 * 1000) {
      if (scanWasResolved) {
        if (waitError) {
          setScanError(renderApiError(waitError));
          try {
            await cancelScan({
              params: { query: { scanner_name: scannerName, job_id: jobId } },
            });
          } catch {
            console.log("[web-print] cancellation error");
          }
          setSession({ isScanning: false });
          return;
        }

        const scanResult = await promisedScan;
        if (!scanResult) {
          setScanError(
            <Trans>
              The scanner returned nothing. Please try to scan again.
            </Trans>,
          );
          await cancelScan({
            params: { query: { scanner_name: scannerName, job_id: jobId } },
          });
          setSession({ isScanning: false });
          return;
        }
        setSession({
          preparedFileName: scanResult.filename,
          preparedFilePagesCount: scanResult.page_count,
        });
        try {
          await cancelScan({
            params: { query: { scanner_name: scannerName, job_id: jobId } },
          });
        } catch {
          console.log("[web-print] cancellation error");
        }
        await reloadScanPreview(scanResult.filename);
        setShowResultPanel(true);
        setSession({
          hasScanResult: true,
          isScanning: false,
          lastScanCompletedAt: Date.now(),
        });
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    setScanError(
      <Trans>
        The job has timed out. Probably, the scanner is busy — try to reboot it.
      </Trans>,
    );
    await cancelScan({
      params: { query: { scanner_name: scannerName, job_id: jobId } },
    });
    setSession({ isScanning: false });
  }

  function handleDocumentNameChange(value: string) {
    const trimmed = value.trim();
    setSession({
      documentName: value,
      ...(trimmed ? { downloadFileName: `${trimmed}.pdf` } : {}),
    });
  }

  async function discardCurrentDocument() {
    const { preparedFileName } = getScanSessionState();
    if (preparedFileName) {
      try {
        await deleteScanFileFromTheServer({
          params: { query: { filename: preparedFileName } },
        });
      } catch {
        console.log("[web-print] Fail to delete the scan from the servers");
      }
    }
    setSession({
      hasScanResult: false,
      hasDownloadedScan: false,
      isNewScan: true,
      preparedFile: undefined,
      fileBlob: undefined,
      preparedFileName: undefined,
      downloadFileName: undefined,
      preparedFilePagesCount: undefined,
      documentName: "",
    });
    setScanError(undefined);
    setShowResultPanel(true);
  }

  function handleDownloadAndFinish() {
    const { fileBlob: blob } = getScanSessionState();
    const fileName = documentName.trim()
      ? `${documentName.trim()}.pdf`
      : "document.pdf";

    if (blob) {
      const link = document.createElement("a");
      link.href = blob;
      link.download = fileName;
      link.click();
    }

    void discardCurrentDocument();
  }

  const scanInProgress =
    isScanning || isScanStarting || isScanWaiting || isScanCancelling;

  useEffect(() => {
    if (!scanInProgress) {
      setScanProgress(0);
      return;
    }

    const {
      isNewScan: startingNewDocument,
      preparedFilePagesCount: existingPages,
      lastScanCompletedAt: lastCompletedAt,
    } = getScanSessionState();

    const isFirstPage = startingNewDocument || !existingPages;
    const isCold =
      lastCompletedAt == null ||
      Date.now() - lastCompletedAt > SCAN_FAKE_COLD_AFTER_MS;
    const needsWarmup = isFirstPage || isCold;

    const durationMs = estimateScanDurationMs(quality, { needsWarmup });
    const startedAt = performance.now();
    let frameId = 0;

    function tick(now: number) {
      const elapsed = now - startedAt;
      const t = Math.min(1, elapsed / durationMs);
      // Ease-out toward 95% so the bar never finishes before the real scan.
      const eased = 1 - (1 - t) * (1 - t);
      setScanProgress(Math.min(95, eased * 95));
      if (t < 1) frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [scanInProgress, quality]);

  const pageCount = preparedFilePagesCount ?? 0;
  const fileMeta = [
    pageCount
      ? t`${plural(pageCount, { one: "# page", other: "# pages" })}`
      : null,
    preparedFile?.size ? formatFileSize(preparedFile.size) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const showResultView = hasScanResult && !scanInProgress && showResultPanel;
  // Mobile stepped flow: settings → preview (scanning) → result + preview.
  // Desktop (@4xl) always shows both columns.
  const hidePreviewOnMobile = !scanInProgress && !showResultView;
  const hideSettingsOnMobile = scanInProgress;

  return (
    <>
      <div className="@container/content mx-auto w-full max-w-[1200px] px-4 py-6">
        <div className="flex flex-col gap-6 @4xl/content:flex-row @4xl/content:items-start">
          <div
            className={cn(
              "card card-border w-full min-w-0 @4xl/content:flex-1",
              !(fileBlob && !scanInProgress) && "min-h-80",
              hidePreviewOnMobile && "hidden @4xl/content:block",
              showResultView && "order-2 @4xl/content:order-none",
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
                  {!fileBlob && !scanInProgress && (
                    <span className="badge badge-ghost badge-sm font-normal">
                      <Trans>Waiting</Trans>
                    </span>
                  )}
                </div>
              </h2>
              <FileDropzone
                variant="scan"
                fileProcess={() => {}}
                isFileProcessing={isFileProcessing || scanInProgress}
                loadingLabel={scanInProgress ? t`Scanning…` : t`Processing…`}
                loadingProgress={scanInProgress ? scanProgress : undefined}
                blobPreviewURL={fileBlob}
                downloadFileName={downloadFileName}
                previewToolbarHost={previewToolbarHost}
                isFunctional={false}
              />
            </div>
          </div>

          <div
            className={cn(
              "card card-border w-full shrink-0 @4xl/content:w-[26rem]",
              hideSettingsOnMobile && "hidden @4xl/content:block",
              showResultView && "order-1 @4xl/content:order-none",
            )}
          >
            <div className="card-body gap-4">
              <h2 className="card-title text-base">
                <span className="icon-[material-symbols--adf-scanner-rounded]" />
                {showResultView ? t`Scan result` : t`Scan settings`}
              </h2>

              {showResultView ? (
                <div className="flex flex-col gap-4">
                  <div className="bg-base-200 rounded-box flex items-center gap-3 px-3 py-2.5">
                    <span className="icon-[material-symbols--picture-as-pdf-rounded] text-primary shrink-0 text-4xl" />
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-baseline">
                        <input
                          type="text"
                          className="text-base-content placeholder:text-base-content/40 field-sizing-content max-w-full min-w-0 bg-transparent p-0 text-base outline-none"
                          placeholder={t`document`}
                          value={documentName}
                          size={Math.max(documentName.length, 1)}
                          onChange={(e) =>
                            handleDocumentNameChange(e.target.value)
                          }
                        />
                        <span className="text-base-content/50 shrink-0 text-base">
                          .pdf
                        </span>
                      </div>
                      {fileMeta && (
                        <p className="text-base-content/50 text-xs">
                          {fileMeta}
                        </p>
                      )}
                    </div>
                  </div>

                  {scanError && (
                    <div className="alert alert-error alert-soft text-sm">
                      {scanError}
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn btn-primary w-full"
                    disabled={!fileBlob}
                    onClick={handleDownloadAndFinish}
                  >
                    <Trans>Download & Finish</Trans>
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline w-full"
                    disabled={selectedScannerOffline}
                    onClick={() => setShowResultPanel(false)}
                  >
                    <Trans>Scan next page</Trans>
                  </button>

                  {(preparedFilePagesCount ?? 0) > 1 && (
                    <button
                      type="button"
                      className="btn btn-ghost w-full"
                      disabled={!preparedFile || isFileProcessing}
                      onClick={() => setRemoveLastPageModalOpen(true)}
                    >
                      <Trans>Remove last page</Trans>
                    </button>
                  )}
                </div>
              ) : (
                <fieldset
                  className="flex flex-col gap-4"
                  disabled={scanInProgress}
                >
                  <DeviceOptionList label={t`Scanner`}>
                    {rawScanners ? (
                      rawScanners.map((scanner) => {
                        const offline = isScannerOffline(scanner.name);
                        return (
                          <DeviceOption
                            key={scanner.name}
                            title={scanner.display_name}
                            selected={scannerName === scanner.name}
                            disabled={offline || hasScanResult}
                            onClick={() => {
                              setSession({ scannerName: scanner.name });
                              setScanError(undefined);
                            }}
                            meta={
                              rawStatuses ? (
                                <span
                                  className={cn(
                                    offline ? "text-error" : "text-success",
                                  )}
                                >
                                  {offline ? t`Offline` : t`Online`}
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

                  {selectedScannerOffline && (
                    <div className="alert alert-warning alert-soft text-sm">
                      <Trans>
                        Selected scanner is offline. Choose another one.
                      </Trans>
                    </div>
                  )}

                  <FormField label={t`Mode`}>
                    <div className="grid grid-cols-2 gap-2">
                      <Tooltip
                        content={t`Scan one page at a time on the glass`}
                      >
                        <button
                          type="button"
                          className={cn(
                            "rounded-field border-base-content/20 w-full border-2 px-3 py-2.5 text-left text-sm transition-colors",
                            mode === ScanningOptionsInput_source.Platen
                              ? "border-primary bg-primary/5"
                              : "hover:border-base-content/40",
                          )}
                          onClick={() =>
                            setSession({
                              mode: ScanningOptionsInput_source.Platen,
                            })
                          }
                        >
                          <Trans>Manual</Trans>
                          <span className="text-base-content/50 mt-0.5 block text-xs">
                            <Trans>Glass</Trans>
                          </span>
                        </button>
                      </Tooltip>
                      <Tooltip
                        content={t`Scan documents from the automatic feeder on top of the printer`}
                      >
                        <button
                          type="button"
                          className={cn(
                            "rounded-field border-base-content/20 w-full border-2 px-3 py-2.5 text-left text-sm transition-colors",
                            mode === ScanningOptionsInput_source.Adf
                              ? "border-primary bg-primary/5"
                              : "hover:border-base-content/40",
                          )}
                          onClick={() =>
                            setSession({
                              mode: ScanningOptionsInput_source.Adf,
                            })
                          }
                        >
                          <Trans>Automatic</Trans>
                          <span className="text-base-content/50 mt-0.5 block text-xs">
                            <Trans>Feeder</Trans>
                          </span>
                        </button>
                      </Tooltip>
                    </div>
                  </FormField>

                  {mode === ScanningOptionsInput_source.Adf && (
                    <FormField label={t`Scan from both sides`}>
                      <Tooltip content={t`Applicable only for automatic mode`}>
                        <input
                          type="checkbox"
                          className="toggle toggle-primary"
                          checked={scanSides === ScanningOptionsSides.true}
                          onChange={(e) =>
                            setSession({
                              scanSides: e.target.checked
                                ? ScanningOptionsSides.true
                                : ScanningOptionsSides.false,
                            })
                          }
                        />
                      </Tooltip>
                    </FormField>
                  )}

                  <FormField label={t`Quality · ${quality} dpi`}>
                    <input
                      type="range"
                      className="range range-primary w-full"
                      min={0}
                      max={Object.values(ScanningOptionsQuality).length - 1}
                      step={1}
                      value={Object.values(ScanningOptionsQuality).indexOf(
                        quality,
                      )}
                      onChange={(e) => {
                        const qualities = Object.values(ScanningOptionsQuality);
                        setSession({
                          quality: qualities[Number(e.target.value)],
                        });
                      }}
                    />
                    <div className="text-base-content/50 mt-1 flex justify-between px-0.5 text-xs">
                      {Object.values(ScanningOptionsQuality).map((q) => (
                        <span key={q}>{q}</span>
                      ))}
                    </div>
                  </FormField>

                  <FormField
                    label={
                      <>
                        <Trans>Smart crop</Trans>
                        <Tooltip
                          content={t`Automatically detects the document edges and crops the PDF to match.`}
                        >
                          <span className="icon-[material-symbols--help-outline] text-base-content/40 hover:text-base-content/70 size-[1em]" />
                        </Tooltip>
                      </>
                    }
                  >
                    <input
                      type="checkbox"
                      className="toggle toggle-primary"
                      checked={crop === ScanningOptionsCrop.true}
                      onChange={(e) =>
                        setSession({
                          crop: e.target.checked
                            ? ScanningOptionsCrop.true
                            : ScanningOptionsCrop.false,
                        })
                      }
                    />
                  </FormField>

                  <div
                    className={cn(
                      "mt-2 flex gap-2",
                      hasScanResult ? "flex-row" : "flex-col",
                    )}
                  >
                    {hasScanResult && (
                      <button
                        type="button"
                        className="btn btn-ghost flex-1"
                        disabled={scanInProgress}
                        onClick={() => setShowResultPanel(true)}
                      >
                        <Trans>Cancel</Trans>
                      </button>
                    )}
                    <button
                      type="button"
                      className={cn(
                        "btn btn-primary",
                        hasScanResult ? "flex-1" : "w-full",
                      )}
                      disabled={
                        !scannerName || selectedScannerOffline || scanInProgress
                      }
                      onClick={() => scanAndWait(!hasScanResult)}
                    >
                      {hasScanResult ? (
                        <Trans>Scan next page</Trans>
                      ) : (
                        <Trans>Scan</Trans>
                      )}
                    </button>
                  </div>

                  {scanError && (
                    <div className="alert alert-error alert-soft text-sm">
                      {scanError}
                    </div>
                  )}
                </fieldset>
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
        open={removeLastPageModalOpen}
        onOpenChange={setRemoveLastPageModalOpen}
        title={
          <div className="flex items-center gap-3">
            <span className="icon-[material-symbols--warning-rounded] text-warning text-2xl" />
            <Trans>Remove last page?</Trans>
          </div>
        }
      >
        <p className="text-base-content/75 mb-6 leading-relaxed">
          <Trans>
            This will permanently remove the last scanned page from the
            document. Are you sure?
          </Trans>
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="btn"
            onClick={() => setRemoveLastPageModalOpen(false)}
          >
            <Trans>Cancel</Trans>
          </button>
          <button
            type="button"
            className="btn btn-outline btn-warning"
            disabled={isFileProcessing}
            onClick={async () => {
              setRemoveLastPageModalOpen(false);
              if (preparedFilePagesCount === 1) {
                await discardCurrentDocument();
                return;
              }
              await reloadScanPreview(await removeLastPage());
            }}
          >
            <Trans>Remove</Trans>
          </button>
        </div>
      </Modal>
    </>
  );
}

function FormField({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-base-content/70 flex items-center gap-1 text-sm">
        {label}
      </span>
      {children}
    </div>
  );
}
