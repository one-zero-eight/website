import styles from "@/components/web-print/printers.module.css";
import inputStyles from "@/components/web-print/printers.input.module.css";
import themeStyles from "@/components/web-print/printers.theme.module.css";
import { Alert } from "@/components/web-print/Alert.tsx";
import { JSX, useEffect, useRef, useState } from "react";

export function ScalablePageRangesInput({
  onTyped,
}: {
  onTyped: (value: string | null) => void;
}) {
  const [alert, setAlert] = useState<JSX.Element | null>(null);

  const inputReference = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const input = inputReference.current;

    if (!input) return;

    function firefoxFieldSizingContent() {
      if (!CSS.supports("field-sizing: content")) {
        const probeElement = document.createElement("p");
        probeElement.textContent = input!.value || input!.placeholder;
        probeElement.classList.add(`${inputStyles.inputPadding}`);
        input!.parentElement!.appendChild(probeElement);
        input!.style.width = `${probeElement.clientWidth}px`;
        input!.parentElement!.removeChild(probeElement);
      }
    }
    firefoxFieldSizingContent();

    function change() {
      const value = input!.value.replace(/\s/g, "");
      if (!value) {
        onTyped(null);
        input!.value = "";
      } else if (
        !value.match(
          "^((([0-9]+-[0-9]+)|([0-9]+)),)*(([0-9]+)|([0-9]+-[0-9]+))$",
        )
      ) {
        setAlert(
          <>
            <p>Incorrect specification!</p>
            <div className={`${themeStyles.webPrintPage} ${styles.textBoard}`}>
              <p>- Empty field stands for all pages</p>
              <p>- Split page ranges with a comma</p>
              <p>
                - A range can consist of an only page, otherwise, use a short
                dash character to separate the start from the end
              </p>
            </div>
            <p> An example: 1-5,8,16-20</p>
          </>,
        );
        input!.value = " ";
      } else {
        const ranges = value
          .split(",")
          .map((elem) =>
            [
              parseInt(elem.split("-")[0]),
              parseInt(elem.split("-")[1] || elem.split("-")[0]),
            ].toSorted(),
          );
        ranges.sort((elem1, elem2) => (elem1[0] < elem2[0] ? -1 : 1));
        const correctRanges = [[0, 0]];
        for (const [i, elem] of ranges.entries()) {
          if (correctRanges[i][1] >= elem[0] && elem[1] > correctRanges[i][1])
            elem[0] = correctRanges[i][1] + 1;
          else if (elem[1] <= correctRanges[i][1]) {
            setAlert(
              <p>
                The range{" "}
                <span className="font-bold!">
                  {correctRanges[i][0] == correctRanges[i][1]
                    ? correctRanges[i][0]
                    : `${correctRanges[i][0]}-${correctRanges[i][1]}`}
                </span>{" "}
                overlaps with the range{" "}
                <span className="font-bold!">
                  {elem[0] == elem[1] ? elem[0] : `${elem[0]}-${elem[1]}`}
                </span>{" "}
                unresolvably.
              </p>,
            );
            input!.value = "";
            return;
          }
          correctRanges.push(elem);
        }
        correctRanges.shift();
        const correctRangesStringWay = correctRanges.map((elem) =>
          elem[0] == elem[1] ? elem[0] : elem.join("-"),
        );
        onTyped(correctRangesStringWay.join(","));
      }
      firefoxFieldSizingContent();
    }

    input.addEventListener("change", change);
    input.addEventListener("input", firefoxFieldSizingContent);
    return () => {
      input.removeEventListener("change", change);
      input.removeEventListener("input", firefoxFieldSizingContent);
    };
  }, [onTyped]);

  return (
    <>
      <input
        placeholder="e.g. 1-5,8,16-20"
        type="text"
        ref={inputReference}
        className={`${inputStyles.input} ${inputStyles.input_rounded}`}
      />

      <Alert
        isShown={alert as unknown as boolean}
        onClose={() => setAlert(null)}
      >
        {alert}
      </Alert>
    </>
  );
}
