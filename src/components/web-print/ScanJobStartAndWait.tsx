import styles from "@/components/web-print/css/printers.module.css";
import fontStyles from "@/components/web-print/css/printers.fonts.module.css";
import marginStyles from "@/components/web-print/css/printers.margins.module.css";
import Tooltip from "@/components/common/Tooltip.tsx";
import {
  ScanningOptionsCrop,
  ScanningOptionsInput_source,
  ScanningOptionsQuality,
  ScanningOptionsSides,
} from "@/api/printers/types.ts";
import { IconValueStatusSelect } from "@/components/web-print/IconValueStatusSelect.tsx";
import { $printers } from "@/api/printers";
import { JSX, useEffect, useRef, useState } from "react";
import { Switch } from "@/components/web-print/Switch.tsx";
import { Modal } from "@/components/common/Modal.tsx";

export function ScanJobStartAndWait({
  rootStyles,
  showPopupWithExceptionDetail,
  setScreenSwitch,
  preparedFileName,
  getFile,
  setPreparedFileName,
  setPreparedFilePagesCount,
  setScannerInProgressTransfer,
  oneMoreScanTransfer,
  setOneMoreScanTransfer,
}: {
  rootStyles: string;
  showPopupWithExceptionDetail: (prefix: string, exception: any) => void;
  setScreenSwitch: (value: boolean) => void;
  preparedFileName: string | undefined;
  getFile: (filename: string, scan?: boolean) => Promise<void>;
  setPreparedFileName: (value: string) => void;
  setPreparedFilePagesCount: (value: number) => void;
  setScannerInProgressTransfer: (value: boolean) => void;
  oneMoreScanTransfer: boolean;
  setOneMoreScanTransfer: (value: boolean) => void;
}) {
  const [alert, setAlert] = useState<JSX.Element>();

  const [scannerName, setScannerName] = useState<string>("");
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

  const newScan = useRef<boolean>(false);

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  async function scanAndWait() {
    let jobId;
    try {
      jobId = await scan({
        params: {
          query: {
            scanner_name: scannerName,
          },
        },
        body: {
          scanning_options: {
            sides: scanSides,
            crop: crop,
            quality: quality,
            input_source: mode,
          },
        },
      });
      setScreenSwitch(true);
    } catch (exception: any) {
      showPopupWithExceptionDetail("Start problem", exception);
      return;
    }
    if (!jobId) return;
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
    while (
      performance.now() - startTime <
      60 * 1000 // 60K milliseconds per batch (either a page or a list of pages from automatic feeder)
    ) {
      if (scanWasResolved) {
        const scan = await promisedScan;
        if (!scan) {
          setAlert(
            <>
              <p className="font-bold!">The scanner returned nothing</p>
              <p>Please, try to scan again</p>
            </>,
          );
          await cancelScan({
            params: {
              query: { scanner_name: scannerName, job_id: jobId },
            },
          });
          return;
        }
        setPreparedFileName(scan.filename);
        setPreparedFilePagesCount(scan.page_count);
        try {
          await cancelScan({
            params: {
              query: { scanner_name: scannerName, job_id: jobId },
            },
          });
        } catch {
          console.log("[web-print] cancellation error");
        }
        await getFile(scan.filename, true);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    setAlert(
      <>
        <p className="font-bold!">The job has been timed out!</p>
        <p>Probably, the scanner is busy, try to reboot it</p>
      </>,
    );
    await cancelScan({
      params: {
        query: { scanner_name: scannerName, job_id: jobId },
      },
    });
  }

  useEffect(() => {
    setScannerInProgressTransfer(isScanStarting || isScanWaiting);
    if (oneMoreScanTransfer) {
      scanAndWait().then(() => {});
      setOneMoreScanTransfer(false);
    }
  }, [
    isScanStarting,
    isScanWaiting,
    oneMoreScanTransfer,
    scanAndWait,
    setScannerInProgressTransfer,
    setOneMoreScanTransfer,
  ]);

  return (
    <>
      <div
        className={`${styles.configurationBox__scrollPart} ${styles.configurationBox__scrollPart_60} ${rootStyles}`}
      >
        <div className={styles.scrollPart__elem}>
          <p className={fontStyles.formPointFont}>Scanner</p>
          <IconValueStatusSelect
            defaultValue={scannerName}
            icons={rawScanners?.map(() => "📰")}
            names={rawScanners?.map((scanner) => scanner.display_name)}
            values={rawScanners?.map((scanner) => scanner.name)}
            statuses={rawStatuses?.map((status) =>
              status.offline ? ", 💀 offline" : ", ✔️ online",
            )}
            onSelected={setScannerName}
          />
        </div>
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
            <p className={fontStyles.formPointFont}>Scan from both sides</p>
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
            icons={Object.values(ScanningOptionsQuality).map(() => "👾")}
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
                  value ? ScanningOptionsCrop.true : ScanningOptionsCrop.false,
                )
              }
            />
          </Tooltip>
        </div>
      </div>
      <div className={rootStyles}>
        <button
          className={`${styles.button} ${fontStyles.buttonFont} ${marginStyles.bottomMargin_doubleMainPadding} ${(isScanWaiting || isScanStarting || isScanCancelling) && styles.button_inactive}`}
          onClick={async () => {
            newScan.current = true;
            await scanAndWait();
          }}
        >
          Start scanning
        </button>
        {(isScanWaiting || isScanStarting || isScanCancelling) && (
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
