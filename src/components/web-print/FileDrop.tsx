import styles from "@/components/web-print/printers.module.css";
import { useEffect, useRef, useState, JSX } from "react";
import fontStyles from "@/components/web-print/printers.fonts.module.css";
import marginStyles from "@/components/web-print/printers.margins.module.css";
import themeStyles from "@/components/web-print/printers.theme.module.css";
import { Alert } from "@/components/web-print/Alert.tsx";

export function FileDrop({
  fileProcess,
  isFileProcessing,
  blobPreviewURL,
  isFunctional,
}: {
  fileProcess: (file: File) => void;
  isFileProcessing: boolean;
  blobPreviewURL: string | undefined;
  isFunctional: boolean;
}) {
  const [alert, setAlert] = useState<JSX.Element | null>(null);

  const acceptableFileExtensions =
    ".pdf,.doc,.xls,.docx,.xlsx,.png,.txt,.md,.jpg," + ".jpeg,.bmp,.odt,.ods";
  const acceptableFileTypes =
    "application/pdf,application/msword,application/vnd.ms-excel," +
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet," +
    "image/png,text/plain,text/markdown,image/jpeg,image/bmp," +
    "application/vnd.oasis.opendocument.text," +
    "application/vnd.oasis.opendocument.spreadsheet";

  const dropAreaReference = useRef<HTMLDivElement>(null);
  const fileInputReference = useRef<HTMLLabelElement>(null);
  const previewReference = useRef<HTMLEmbedElement>(null);

  useEffect(() => {
    if (!isFunctional) return;

    const fileInput = fileInputReference.current;
    const dropArea = dropAreaReference.current;
    const preview = previewReference.current;

    const acceptableFileSignatures = [
      [0x25, 0x50, 0x44, 0x46, 0x2d],
      [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
      [0x50, 0x4b, 0x03, 0x04],
      [0x50, 0x4b, 0x03, 0x04],
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      [0xef, 0xbb, 0xbf],
      [0xff, 0xfe],
      [0xfe, 0xff],
      [0xff, 0xfe, 0x00, 0x00],
      [0x00, 0x00, 0xfe, 0xff],
      [0xff, 0xd8, 0xff],
      [0xff, 0xd8, 0xff],
      [0x42, 0x4d],
      [0x50, 0x4b, 0x03, 0x04],
    ];
    async function fileIsBad(file: File) {
      if (file.size > 20 * 1024 * 1024) {
        setAlert(
          <>
            <p>File is too large!</p>
            <p>
              Max file size is <span className="font-bold!">20MB</span>
            </p>
          </>,
        );
        return true;
      }
      const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
      if (
        !acceptableFileTypes.includes(file.type) ||
        !acceptableFileSignatures.some((signature) =>
          signature.reduce(
            (answer, currentByte, i) =>
              answer && (currentByte === bytes[i] ? 1 : 0),
            1,
          ),
        )
      ) {
        setAlert(
          <>
            <p>Such file is not supported!</p>
            <div className={`${styles.textGrid} ${themeStyles.webPrintPage}`}>
              {acceptableFileExtensions.split(",").map((elem, i) => (
                <p className={styles.textGrid__elem} key={i}>
                  {elem}
                </p>
              ))}
            </div>
          </>,
        );
        return true;
      }
      return false;
    }

    // the main drop handler
    // size check works only after drop
    async function areaDrop(event: DragEvent) {
      const file = event.dataTransfer!.items[0].getAsFile()!;
      if (await fileIsBad(file)) {
        counter = 0;
        preview?.classList.remove(styles.insensible);
        return;
      }
      if (!isFileProcessing) fileProcess(file);
    }
    // cancel default browser drag-n-drop behavior
    // if a file was dropped at the wrong place
    function windowDrop(event: DragEvent) {
      if ([...event.dataTransfer!.items].some((item) => item.kind === "file"))
        event.preventDefault();
    }
    // a dragover event must be canceled for the drop event firing
    // also dragover event's dataTransfer.dropEffect must be set to copy
    function areaDragover(event: DragEvent) {
      event.preventDefault();
      const fileItem = event.dataTransfer!.items[0];
      event.dataTransfer!.dropEffect =
        fileItem.kind === "file" ? "copy" : "none";
    }
    // none dropEffect shows a corresponding hint about drop inability
    function windowDragover(event: DragEvent) {
      event.preventDefault();
      if (event.target instanceof Element)
        if (!dropArea!.contains(event.target)) {
          event.dataTransfer!.dropEffect = "none";
        }
    }
    // counter == 0 -> user firstly enters any element within the window or
    // leaves each of them, therefore, leaves the window
    let counter = 0;
    function dragEnter() {
      if (!counter) preview?.classList.add(styles.insensible);
      counter++;
    }
    function dragLeave() {
      counter--;
      if (!counter) preview?.classList.remove(styles.insensible);
    }

    async function fileSet(event: Event) {
      if (event.target instanceof HTMLInputElement) {
        const file = event.target.files![0];
        if (await fileIsBad(file)) return;
        if (!isFileProcessing) fileProcess(file);
      }
    }

    if (dropArea) {
      dropArea.addEventListener("drop", areaDrop);
      dropArea.addEventListener("dragover", areaDragover);
      window.addEventListener("drop", windowDrop);
      window.addEventListener("dragover", windowDragover);
      window.addEventListener("dragenter", dragEnter);
      window.addEventListener("dragleave", dragLeave);
    }
    if (fileInput) fileInput.addEventListener("input", fileSet);

    return () => {
      if (dropArea) {
        dropArea.removeEventListener("drop", areaDrop);
        dropArea.removeEventListener("dragover", areaDragover);
        window.removeEventListener("drop", windowDrop);
        window.removeEventListener("dragover", windowDragover);
        window.removeEventListener("dragenter", dragEnter);
        window.removeEventListener("dragleave", dragLeave);
      }
      if (fileInput) fileInput.removeEventListener("input", fileSet);
    };
  }, [
    fileProcess,
    isFileProcessing,
    acceptableFileExtensions,
    acceptableFileTypes,
    isFunctional,
  ]);

  return (
    <>
      <div
        className={`${styles.dropContainer} ${marginStyles.leftMargin_buttonHorizontalPadding}`}
      >
        <div
          ref={dropAreaReference}
          className={`${styles.dropArea} ${blobPreviewURL && styles.dropArea_squared}`}
        >
          {isFileProcessing ? (
            <span
              className={`icon-[material-symbols--progress-activity] ${styles.backgroundIcon} ${styles.rotationAnimation}`}
            />
          ) : (
            <>
              <span
                className={`icon-[material-symbols--docs-rounded] ${styles.backgroundIcon}`}
              />
              <span className={`${fontStyles.headFont} font-black!`}>
                {isFunctional ? "Drag&Drop" : "Preview"}
              </span>
              {blobPreviewURL && (
                <embed
                  className={styles.pdfPreview}
                  ref={previewReference}
                  src={blobPreviewURL}
                  type={"application/pdf"}
                />
              )}
            </>
          )}
        </div>

        {isFunctional && (
          <label
            ref={fileInputReference}
            className={`${styles.button} ${fontStyles.buttonFont} ${marginStyles.bottomMargin_doubleMainPadding}`}
          >
            Attach file
            <input
              type="file"
              id="fileToBePrinted"
              accept={acceptableFileExtensions}
            />
          </label>
        )}
      </div>

      <Alert
        isShown={alert as unknown as boolean}
        onClose={() => setAlert(null)}
      >
        {alert}
      </Alert>
    </>
  );
}
