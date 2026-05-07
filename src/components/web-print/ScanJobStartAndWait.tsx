import styles from "@/components/web-print/printers.module.css";
import fontStyles from "@/components/web-print/printers.fonts.module.css";
import marginStyles from "@/components/web-print/printers.margins.module.css";
import Tooltip from "@/components/common/Tooltip.tsx";
import {
  ScanningOptionsCrop,
  ScanningOptionsInput_source,
  ScanningOptionsQuality,
  ScanningOptionsSides,
} from "@/api/printers/types.ts";
import { IconValueStatusSelect } from "@/components/web-print/IconValueStatusSelect.tsx";
import { $printers } from "@/api/printers";
import { JSX, useRef, useState } from "react";
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
}: {
  rootStyles: string;
  showPopupWithExceptionDetail: (prefix: string, exception: any) => void;
  setScreenSwitch: (value: boolean) => void;
  preparedFileName: string | undefined;
  getFile: (filename: string, scan?: boolean) => Promise<void>;
  setPreparedFileName: (value: string) => void;
  setPreparedFilePagesCount: (value: number) => void;
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

  const jobId = useRef<string | null>(null);

  const { data: rawScanners } = $printers.useQuery("get", "/scan/get_scanners");
  const { data: rawStatuses } = $printers.useQuery(
    "get",
    "/scan/debug/get_scanners_status",
  );
  const { mutateAsync: scan, isPending: isScanStarting } =
    $printers.useMutation("post", "/scan/manual/start_scan");
  const { mutateAsync: waitTillTheEnd, isPending: isScanWaiting } =
    $printers.useMutation("post", "/scan/manual/wait_and_merge");

  return (
    <>
      <div className={`${styles.configurationBox__scrollPart} ${rootStyles}`}>
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
          className={`${styles.button} ${fontStyles.buttonFont} ${marginStyles.bottomMargin_doubleMainPadding} ${(isScanWaiting || isScanStarting) && styles.button_inactive}`}
          onClick={async () => {
            try {
              jobId.current = await scan({
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
            if (!jobId.current) {
              setAlert(<p className="font-bold!">Failed to start the job</p>);
              return;
            }
            const startTime = performance.now();
            const promisedScan = waitTillTheEnd({
              params: {
                query: {
                  scanner_name: scannerName,
                  job_id: jobId.current,
                  prev_filename: preparedFileName,
                },
              },
            });
            let scanWasResolved = false;
            promisedScan.then(() => {
              scanWasResolved = true;
            });
            while (
              performance.now() - startTime <
              30 * 1000 // 30K milliseconds per page
            ) {
              if (scanWasResolved) {
                const scan = await promisedScan;
                console.log(scan);
                if (!scan) {
                  setAlert(
                    <>
                      <p className="font-bold!">The scanner returned nothing</p>
                      <p>Please, try to scan again</p>
                    </>,
                  );
                  return;
                }
                setPreparedFileName(scan.filename);
                setPreparedFilePagesCount(scan.page_count);
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
          }}
        >
          Start scanning
        </button>
        {(isScanWaiting || isScanStarting) && (
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
