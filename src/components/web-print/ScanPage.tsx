import { $printers } from "@/api/printers";
import { Modal } from "@/components/common/Modal.tsx";
import Tooltip from "@/components/common/Tooltip.tsx";
import { FileDropzone } from "@/components/web-print/FileDropzone.tsx";
import { useWebPrintFiles } from "@/components/web-print/useWebPrintFiles.ts";
import {
  ScanningOptionsCrop,
  ScanningOptionsInput_source,
  ScanningOptionsQuality,
  ScanningOptionsSides,
} from "@/api/printers/types.ts";
import { useEffect, useRef, useState, type ReactNode } from "react";

export function ScanPage() {
  const [alert, setAlert] = useState<ReactNode>();
  const newScan = useRef(false);

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

  const {
    preparedFile,
    fileBlob,
    preparedFileName,
    downloadFileName,
    preparedFilePagesCount,
    isFileProcessing,
    prepareFile,
    getFile,
    setDownloadFileName,
    setPreparedFileName,
    setPreparedFilePagesCount,
  } = useWebPrintFiles(showPopupWithExceptionDetail);

  const [scannerName, setScannerName] = useState("");
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
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanResult, setHasScanResult] = useState(false);
  const [documentName, setDocumentName] = useState("");

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

  useEffect(() => {
    if (rawScanners?.length && !scannerName) {
      setScannerName(rawScanners[0].name);
    }
  }, [rawScanners, scannerName]);

  function getScanDisplayFileName(serverFilename: string) {
    const trimmed = documentName.trim();
    return trimmed ? `${trimmed}.pdf` : serverFilename;
  }

  async function reloadScanPreview(serverFilename: string) {
    await getFile(serverFilename, true, getScanDisplayFileName(serverFilename));
    if (!documentName.trim()) {
      setDocumentName(serverFilename.replace(/\.pdf$/i, ""));
    }
  }

  async function scanAndWait(isNewScan: boolean) {
    if (isNewScan) newScan.current = true;
    setIsScanning(true);
    setHasScanResult(false);

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
      showPopupWithExceptionDetail("Start problem", exception);
      setIsScanning(false);
      return;
    }

    if (!jobId) {
      setIsScanning(false);
      return;
    }

    const startTime = performance.now();
    const promisedScan = waitTillTheEnd({
      params: {
        query: {
          scanner_name: scannerName,
          job_id: jobId,
          prev_filename: newScan.current ? null : preparedFileName,
        },
      },
    });
    newScan.current = false;

    let scanWasResolved = false;
    promisedScan.then(() => {
      scanWasResolved = true;
    });

    while (performance.now() - startTime < 60 * 1000) {
      if (scanWasResolved) {
        const scanResult = await promisedScan;
        if (!scanResult) {
          setAlert(
            <>
              <p className="font-bold">The scanner returned nothing</p>
              <p>Please try to scan again.</p>
            </>,
          );
          await cancelScan({
            params: { query: { scanner_name: scannerName, job_id: jobId } },
          });
          setIsScanning(false);
          return;
        }
        setPreparedFileName(scanResult.filename);
        setPreparedFilePagesCount(scanResult.page_count);
        try {
          await cancelScan({
            params: { query: { scanner_name: scannerName, job_id: jobId } },
          });
        } catch {
          console.log("[web-print] cancellation error");
        }
        await reloadScanPreview(scanResult.filename);
        setHasScanResult(true);
        setIsScanning(false);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    setAlert(
      <>
        <p className="font-bold">The job has timed out!</p>
        <p>Probably, the scanner is busy — try to reboot it.</p>
      </>,
    );
    await cancelScan({
      params: { query: { scanner_name: scannerName, job_id: jobId } },
    });
    setIsScanning(false);
  }

  function handleDocumentNameChange(value: string) {
    setDocumentName(value);
    const trimmed = value.trim();
    if (trimmed && downloadFileName) {
      setDownloadFileName(`${trimmed}.pdf`);
    }
  }

  const previewFileName = documentName.trim()
    ? `${documentName.trim()}.pdf`
    : downloadFileName;

  async function handleFinish() {
    if (preparedFile) {
      try {
        await deleteScanFileFromTheServer({
          params: { query: { filename: preparedFile.name } },
        });
        await prepareFile(preparedFile, false);
      } catch {
        console.log("[web-print] Fail to delete the scan from the servers");
      }
    }
    setHasScanResult(false);
  }

  const scanInProgress =
    isScanning || isScanStarting || isScanWaiting || isScanCancelling;

  return (
    <>
      <div className="@container/content mx-auto w-full max-w-[1200px] px-4 py-6">
        <div className="grid grid-cols-1 gap-6 @lg/content:grid-cols-2 @lg/content:items-stretch">
          <div className="card card-border flex max-h-[calc(100vh-10rem)] flex-col overflow-hidden">
            <div className="card-body flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
              <h2 className="card-title shrink-0 text-base">
                <span className="icon-[material-symbols--picture-as-pdf-rounded]" />
                Preview
                {!fileBlob && !scanInProgress && (
                  <span className="badge badge-ghost badge-sm ml-auto font-normal">
                    Waiting
                  </span>
                )}
              </h2>
              <div className="flex min-h-0 flex-1 flex-col">
                <FileDropzone
                  variant="scan"
                  fileProcess={() => {}}
                  isFileProcessing={isFileProcessing || scanInProgress}
                  loadingLabel={scanInProgress ? "Scanning…" : "Processing…"}
                  blobPreviewURL={fileBlob}
                  downloadFileName={downloadFileName}
                  displayFileName={previewFileName}
                  pageCount={preparedFilePagesCount}
                  fileSize={preparedFile?.size}
                  isFunctional={false}
                />
              </div>
            </div>
          </div>

          <div className="card card-border">
            <div className="card-body gap-4">
              <h2 className="card-title text-base">
                <span className="icon-[material-symbols--adf-scanner-rounded]" />
                {hasScanResult && !scanInProgress
                  ? "Scan result"
                  : "Scan settings"}
              </h2>

              {scanInProgress ? (
                <div className="flex flex-col items-center gap-4 py-8">
                  <span className="loading loading-spinner loading-lg text-primary" />
                  <p className="text-base-content/50">Scanning in progress…</p>
                </div>
              ) : hasScanResult ? (
                <div className="flex flex-col gap-4">
                  <p className="text-base-content/70 text-sm">
                    {previewFileName || "Scan complete"}
                  </p>

                  <button
                    type="button"
                    className="btn btn-outline justify-start gap-3"
                    onClick={() => scanAndWait(false)}
                  >
                    <span className="icon-[material-symbols--text-select-move-forward-word-rounded] text-xl" />
                    Scan one more page
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline justify-start gap-3"
                    disabled={!preparedFile || isFileProcessing}
                    onClick={async () => {
                      await reloadScanPreview(
                        await prepareFile(preparedFile!, true),
                      );
                    }}
                  >
                    <span className="icon-[material-symbols--ink-eraser-rounded] text-xl" />
                    Remove the last page
                  </button>

                  <FormField label="Download file name">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        className="input input-bordered min-w-0 flex-1"
                        placeholder="my-scan"
                        value={documentName}
                        onChange={(e) =>
                          handleDocumentNameChange(e.target.value)
                        }
                      />
                      <span className="text-base-content/50 shrink-0 text-sm">
                        .pdf
                      </span>
                    </div>
                  </FormField>

                  <button
                    type="button"
                    className="btn btn-primary mt-2"
                    onClick={handleFinish}
                  >
                    Finish
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <FormField label="Scanner">
                    {rawScanners ? (
                      <select
                        className="select select-bordered w-full"
                        value={scannerName}
                        onChange={(e) => setScannerName(e.target.value)}
                      >
                        <option value="" disabled>
                          Select a scanner
                        </option>
                        {rawScanners.map((scanner, i) => (
                          <option key={scanner.name} value={scanner.name}>
                            {scanner.display_name}
                            {rawStatuses?.[i]?.offline
                              ? " (offline)"
                              : " (online)"}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="skeleton h-12 w-full" />
                    )}
                  </FormField>

                  <FormField label="Mode">
                    <Tooltip
                      content={
                        mode === ScanningOptionsInput_source.Adf
                          ? "Scan documents from the automatic feeder on top of the printer"
                          : "Scan one page at a time on the glass"
                      }
                    >
                      <select
                        className="select select-bordered w-full"
                        value={mode}
                        onChange={(e) =>
                          setMode(e.target.value as ScanningOptionsInput_source)
                        }
                      >
                        <option value={ScanningOptionsInput_source.Platen}>
                          Manual scanning (glass)
                        </option>
                        <option value={ScanningOptionsInput_source.Adf}>
                          Automatic scanning (feeder)
                        </option>
                      </select>
                    </Tooltip>
                  </FormField>

                  {mode === ScanningOptionsInput_source.Adf && (
                    <FormField label="Scan from both sides">
                      <Tooltip content="Applicable only for automatic mode">
                        <input
                          type="checkbox"
                          className="toggle toggle-primary"
                          checked={scanSides === ScanningOptionsSides.true}
                          onChange={(e) =>
                            setScanSides(
                              e.target.checked
                                ? ScanningOptionsSides.true
                                : ScanningOptionsSides.false,
                            )
                          }
                        />
                      </Tooltip>
                    </FormField>
                  )}

                  <FormField label="Quality">
                    <select
                      className="select select-bordered w-full"
                      value={quality}
                      onChange={(e) =>
                        setQuality(e.target.value as ScanningOptionsQuality)
                      }
                    >
                      {Object.values(ScanningOptionsQuality).map((q) => (
                        <option key={q} value={q}>
                          {q} dpi
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="AI crop">
                    <Tooltip content="Automatically fit the resulting PDF page to the scan">
                      <input
                        type="checkbox"
                        className="toggle toggle-primary"
                        checked={crop === ScanningOptionsCrop.true}
                        onChange={(e) =>
                          setCrop(
                            e.target.checked
                              ? ScanningOptionsCrop.true
                              : ScanningOptionsCrop.false,
                          )
                        }
                      />
                    </Tooltip>
                  </FormField>

                  <FormField label="Download file name">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        className="input input-bordered min-w-0 flex-1"
                        placeholder="my-scan"
                        value={documentName}
                        onChange={(e) =>
                          handleDocumentNameChange(e.target.value)
                        }
                      />
                      <span className="text-base-content/50 shrink-0 text-sm">
                        .pdf
                      </span>
                    </div>
                  </FormField>

                  <button
                    type="button"
                    className="btn btn-primary mt-2"
                    disabled={!scannerName}
                    onClick={() => scanAndWait(true)}
                  >
                    Start scanning
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
