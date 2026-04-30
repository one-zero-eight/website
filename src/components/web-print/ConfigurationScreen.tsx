import styles from "@/components/web-print/printers.module.css";
import { ConfigurationHeader } from "@/components/web-print/ConfigurationHeader.tsx";
import { JSX, useState } from "react";
import { FileDrop } from "@/components/web-print/FileDrop.tsx";
import { $printers } from "@/api/printers";
import { IconValueStatusSelect } from "@/components/web-print/IconValueStatusSelect.tsx";
import marginStyles from "@/components/web-print/printers.margins.module.css";
import fontStyles from "@/components/web-print/printers.fonts.module.css";
import { ScalableIntInput } from "@/components/web-print/ScalableIntInput.tsx";
import { Switch } from "@/components/web-print/Switch.tsx";
import { ScalablePageRangesInput } from "@/components/web-print/ScalablePageRangesInput.tsx";
import { Alert } from "@/components/web-print/Alert.tsx";
import {
  PrintingOptionsNumberUp,
  PrintingOptionsSides,
} from "@/api/printers/types.ts";

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

export function ConfigurationScreen({
  setJobState,
  preparedDocumentURL,
  setPreparedDocumentURL,
  setJobId,
  setPrintJobActualPapersCount,
}: {
  setJobState: (value: boolean) => void;
  preparedDocumentURL: string | undefined;
  setPreparedDocumentURL: (value: string) => void;
  setJobId: (value: number) => void;
  setPrintJobActualPapersCount: (value: number) => void;
}) {
  const [alert, setAlert] = useState<JSX.Element | null>(null);

  const [preparedDocumentName, setPreparedDocumentName] = useState<string>("");
  const [configurationType, setConfigurationType] = useState<boolean>(true);
  const [printerCupsName, setPrinterCupsName] = useState<string>("");
  const [copiesCount, setCopiesCount] = useState<number>(1);
  const [pagesCount, setPagesCount] = useState<number>(0);
  const [sides, setSides] = useState<PrintingOptionsSides>(
    PrintingOptionsSides.two_sided_long_edge,
  );
  const [pages, setPages] = useState<string | null>(null);
  const [numberUp, setNumberUp] = useState<PrintingOptionsNumberUp>(
    PrintingOptionsNumberUp.Value1,
  );

  const { data: rawPrinters } = $printers.useQuery(
    "get",
    "/print/get_printers",
  );
  const { data: rawStatuses } = $printers.useQuery(
    "get",
    "/print/get_printers_status",
  );
  const { mutateAsync: prepareFile, isPending: isFilePreparing } =
    $printers.useMutation("post", "/print/prepare");
  const { mutateAsync: print, isPending: isPrintStarting } =
    $printers.useMutation("post", "/print/print");
  const { mutateAsync: getPreparedFile, isPending: isFileDownloading } =
    $printers.useMutation("get", "/print/get_file");

  async function fileProcess(file: File) {
    if (preparedDocumentURL) URL.revokeObjectURL(preparedDocumentURL);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const preparationResponse = await prepareFile({
        // @ts-expect-error - FormData type mismatch with API
        body: formData,
      });
      setPreparedDocumentName(preparationResponse.filename);
      setPagesCount(preparationResponse.pages);
      // @ts-expect-error - response type mismatch with API
      const getResponse: Blob = await getPreparedFile({
        params: { query: { filename: preparationResponse.filename } },
        parseAs: "blob",
      });
      setPreparedDocumentURL(URL.createObjectURL(getResponse));
    } catch (exception: any) {
      if (!Object.hasOwn(exception, "detail"))
        exception.detail = "Unknown error. Service is unavailable";
      setAlert(<p>{exception.detail}</p>);
    }
  }

  async function start() {
    try {
      const printResponse = await print({
        params: {
          query: {
            filename: preparedDocumentName,
            printer_cups_name: printerCupsName,
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
      });
      setPrintJobActualPapersCount(
        calcPrintJobActualPapersCount(
          pages,
          copiesCount,
          numberUp,
          sides,
          pagesCount,
        ),
      );
      setJobId(printResponse);
      setJobState(true);
    } catch (exception: any) {
      if (!Object.hasOwn(exception, "detail"))
        exception.detail = "Unknown error. Service is unavailable";
      setAlert(<p>{exception.detail}</p>);
    }
  }

  return (
    <div className={styles.ordinaryScreen}>
      <div className={styles.ordinaryScreen__contentSizeRestrictor}>
        <div className={styles.configurationBox}>
          <ConfigurationHeader
            configurationType={configurationType}
            onClick={() => setConfigurationType(!configurationType)}
          />
          <div className={styles.configurationBox__scrollPart}>
            <div className={styles.scrollPart__elem}>
              <p className={fontStyles.formPointFont}>Printer</p>
              <IconValueStatusSelect
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
                onSelected={setPrinterCupsName}
              />
            </div>
            <div className={styles.scrollPart__elem}>
              <p className={fontStyles.formPointFont}>Copies</p>
              <ScalableIntInput
                defaultValue={1}
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
              <ScalablePageRangesInput onTyped={setPages} />
            </div>
            <div className={styles.scrollPart__elem}>
              <p className={fontStyles.formPointFont}>Layout</p>
              <IconValueStatusSelect
                icons={undefined}
                names={["1x1", "1x2", "2x2", "2x3", "3x3", "4x4"]}
                values={Object.values(PrintingOptionsNumberUp)}
                statuses={Object.values(PrintingOptionsNumberUp).map(
                  (elem) =>
                    `\xa0(${elem} ${parseInt(elem) > 1 ? "pages" : "page"} per list)`,
                )}
                // @ts-expect-error - String-valued enum is okay to accept a confidently valid string
                onSelected={setNumberUp}
              />
            </div>
          </div>
          <div>
            <button
              className={`${styles.button} ${fontStyles.buttonFont} ${marginStyles.bottomMargin_doubleMainPadding}`}
              onClick={start}
            >
              {configurationType ? "Start printing" : "Start scanning"}
            </button>
            {isPrintStarting && (
              <span
                className={`icon-[material-symbols--progress-activity] ${styles.sideIcon} ${styles.rotationAnimation}`}
              ></span>
            )}
          </div>
        </div>
        <FileDrop
          fileProcess={fileProcess}
          isFileProcessing={isFilePreparing || isFileDownloading}
          blobPreviewURL={preparedDocumentURL}
          isFunctional={true}
        />
      </div>

      <Alert
        isShown={alert as unknown as boolean}
        onClose={() => setAlert(null)}
      >
        {alert}
      </Alert>
    </div>
  );
}
