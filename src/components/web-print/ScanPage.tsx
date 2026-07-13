import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { $printers } from "@/api/printers";
import { Modal } from "@/components/common/Modal.tsx";
import Tooltip from "@/components/common/Tooltip.tsx";
import {
  DeviceOption,
  DeviceOptionList,
} from "@/components/web-print/DeviceOptionList.tsx";
import {
  FileDropzone,
  formatFileSize,
} from "@/components/web-print/FileDropzone.tsx";
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

export function ScanPage() {
  const [alert, setAlert] = useState<ReactNode>();
  const [scanError, setScanError] = useState<string>();
  const [discardModalOpen, setDiscardModalOpen] = useState(false);

  function showPopupWithExceptionDetail(prefix: string, exception: unknown) {
    setAlert(
      <p>
        {prefix}: {formatApiErrorMessage(exception)}
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
      setScanError("Selected scanner is offline");
      return;
    }

    if (startNewScan) setSession({ isNewScan: true });
    setScanError(undefined);
    setSession({
      isScanning: true,
      hasScanResult: false,
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
      setScanError(formatApiErrorMessage(exception));
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
          setScanError(formatApiErrorMessage(waitError));
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
            "The scanner returned nothing. Please try to scan again.",
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
        setSession({ hasScanResult: true, isScanning: false });
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    setScanError(
      "The job has timed out. Probably, the scanner is busy — try to reboot it.",
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

  const previewFileName = documentName.trim()
    ? `${documentName.trim()}.pdf`
    : "document.pdf";

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
      isNewScan: true,
      preparedFile: undefined,
      fileBlob: undefined,
      preparedFileName: undefined,
      downloadFileName: undefined,
      preparedFilePagesCount: undefined,
      documentName: "",
    });
    setScanError(undefined);
    setDiscardModalOpen(false);
  }

  function handleDownloadAndDiscard() {
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

  const fileMeta = [
    preparedFilePagesCount
      ? `${preparedFilePagesCount} page${preparedFilePagesCount !== 1 ? "s" : ""}`
      : null,
    preparedFile?.size ? formatFileSize(preparedFile.size) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <div className="@container/content mx-auto w-full max-w-[1200px] px-4 py-6">
        <div className="flex flex-col gap-6 @4xl/content:flex-row @4xl/content:items-start">
          <div
            className={cn(
              "card card-border w-full min-w-0 @4xl/content:flex-1",
              !(fileBlob && !scanInProgress) && "min-h-80",
            )}
          >
            <div className="card-body flex flex-col gap-4">
              <h2 className="card-title shrink-0 text-base">
                <span className="icon-[material-symbols--picture-as-pdf-rounded]" />
                Preview
                {!fileBlob && !scanInProgress && (
                  <span className="badge badge-ghost badge-sm ml-auto font-normal">
                    Waiting
                  </span>
                )}
              </h2>
              <FileDropzone
                variant="scan"
                fileProcess={() => {}}
                isFileProcessing={isFileProcessing || scanInProgress}
                loadingLabel={scanInProgress ? "Scanning…" : "Processing…"}
                blobPreviewURL={
                  scanInProgress && !hasScanResult ? undefined : fileBlob
                }
                downloadFileName={downloadFileName}
                isFunctional={false}
              />
            </div>
          </div>

          <div className="card card-border w-full shrink-0 @4xl/content:w-[26rem]">
            <div className="card-body gap-4">
              <h2 className="card-title text-base">
                <span className="icon-[material-symbols--adf-scanner-rounded]" />
                {hasScanResult && !scanInProgress
                  ? "Scan result"
                  : "Scan settings"}
              </h2>

              {hasScanResult && !scanInProgress ? (
                <div className="flex flex-col gap-4">
                  <div className="bg-base-200 rounded-box flex items-center gap-3 px-3 py-2.5">
                    <span className="icon-[material-symbols--picture-as-pdf-rounded] text-primary shrink-0 text-4xl" />
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          className="input input-bordered input-sm min-w-0 flex-1"
                          placeholder="document"
                          value={documentName}
                          onChange={(e) =>
                            handleDocumentNameChange(e.target.value)
                          }
                        />
                        <span className="text-base-content/50 shrink-0 text-sm">
                          .pdf
                        </span>
                      </div>
                      {fileMeta && (
                        <p className="text-base-content/50 text-xs">
                          {fileMeta}
                        </p>
                      )}
                    </div>
                    {fileBlob && (
                      <a
                        href={fileBlob}
                        download={previewFileName ?? downloadFileName}
                        className="btn btn-ghost btn-square shrink-0"
                        title="Download PDF"
                      >
                        <span className="icon-[material-symbols--download-rounded] text-4xl" />
                      </a>
                    )}
                  </div>

                  {scanError && (
                    <div className="alert alert-error alert-soft text-sm">
                      {scanError}
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn btn-primary w-full"
                    disabled={selectedScannerOffline}
                    onClick={() => scanAndWait(false)}
                  >
                    Scan next page
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={
                        !preparedFile ||
                        isFileProcessing ||
                        !preparedFilePagesCount
                      }
                      onClick={async () => {
                        await reloadScanPreview(await removeLastPage());
                      }}
                    >
                      Remove last page
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setDiscardModalOpen(true)}
                    >
                      Scan new document
                    </button>
                  </div>
                </div>
              ) : (
                <fieldset
                  className="flex flex-col gap-4"
                  disabled={scanInProgress}
                >
                  <DeviceOptionList label="Scanner">
                    {rawScanners ? (
                      rawScanners.map((scanner) => {
                        const offline = isScannerOffline(scanner.name);
                        return (
                          <DeviceOption
                            key={scanner.name}
                            title={scanner.display_name}
                            selected={scannerName === scanner.name}
                            disabled={offline}
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
                                  {offline ? "Offline" : "Online"}
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

                  {selectedScannerOffline && (
                    <div className="alert alert-warning alert-soft text-sm">
                      Selected scanner is offline. Choose another one.
                    </div>
                  )}

                  <FormField label="Mode">
                    <div className="grid grid-cols-2 gap-2">
                      <Tooltip content="Scan one page at a time on the glass">
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
                          Manual
                          <span className="text-base-content/50 mt-0.5 block text-xs">
                            Glass
                          </span>
                        </button>
                      </Tooltip>
                      <Tooltip content="Scan documents from the automatic feeder on top of the printer">
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
                          Automatic
                          <span className="text-base-content/50 mt-0.5 block text-xs">
                            Feeder
                          </span>
                        </button>
                      </Tooltip>
                    </div>
                  </FormField>

                  {mode === ScanningOptionsInput_source.Adf && (
                    <FormField label="Scan from both sides">
                      <Tooltip content="Applicable only for automatic mode">
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

                  <FormField label={`Quality · ${quality} dpi`}>
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
                        Smart crop
                        <Tooltip content="Automatically detects the document edges and crops the PDF to match.">
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

                  <button
                    type="button"
                    className="btn btn-primary mt-2"
                    disabled={
                      !scannerName || selectedScannerOffline || scanInProgress
                    }
                    onClick={() => scanAndWait(true)}
                  >
                    Scan
                  </button>

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
        title="Warning"
      >
        {alert}
      </Modal>

      <Modal
        open={discardModalOpen}
        onOpenChange={setDiscardModalOpen}
        title={
          <div className="flex items-center gap-3">
            <span className="icon-[material-symbols--warning-rounded] text-warning text-2xl" />
            Discard current document?
          </div>
        }
      >
        <p className="text-base-content/75 mb-6 leading-relaxed">
          Starting a new scan will discard the current document. Download it
          first if you want to keep a copy.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="btn"
            onClick={() => setDiscardModalOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-outline btn-warning"
            onClick={() => void discardCurrentDocument()}
          >
            Discard
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!fileBlob}
            onClick={handleDownloadAndDiscard}
          >
            Download and discard
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
