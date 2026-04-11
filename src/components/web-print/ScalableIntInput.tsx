import inputStyles from "@/components/web-print/printers.input.module.css";
import styles from "@/components/web-print/printers.module.css";
import fontStyles from "@/components/web-print/printers.fonts.module.css";
import { useEffect, useRef } from "react";

export function ScalableIntInput({
  defaultValue,
  onTyped,
  maximum,
  minimum,
}: {
  defaultValue: number;
  onTyped: (value: number) => void;
  maximum: number;
  minimum: number;
}) {
  const inputReference = useRef<HTMLInputElement | null>(null);
  const plusButtonReference = useRef<HTMLButtonElement | null>(null);
  const minusButtonReference = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const input = inputReference.current;
    const plusButton = plusButtonReference.current;
    const minusButton = minusButtonReference.current;

    if (!input) return;

    function firefoxFieldSizingContent() {
      if (!CSS.supports("field-sizing: content")) {
        const probeElement = document.createElement("p");
        probeElement.textContent = input!.value;
        probeElement.classList.add(`${inputStyles.inputPadding}`);
        input!.parentElement!.appendChild(probeElement);
        input!.style.width = `${probeElement.clientWidth}px`;
        input!.parentElement!.removeChild(probeElement);
      }
    }
    firefoxFieldSizingContent();

    function change(event: Event) {
      const rawValue = parseInt(
        (event.target as HTMLInputElement).value
          ? (event.target as HTMLInputElement).value
          : "0",
      );
      const value = Math.max(minimum, Math.min(maximum, rawValue));
      if (value != rawValue) {
        input!.value = value.toString();
      }
      onTyped(value);
      firefoxFieldSizingContent();
    }
    function inc() {
      const value = Math.max(
        minimum,
        Math.min(maximum, parseInt(input!.value) + 1),
      );
      input!.value = value.toString();
      onTyped(value);
      firefoxFieldSizingContent();
    }
    function dec() {
      const value = Math.max(
        minimum,
        Math.min(maximum, parseInt(input!.value) - 1),
      );
      input!.value = value.toString();
      onTyped(value);
      firefoxFieldSizingContent();
    }

    input.addEventListener("change", change);
    input.addEventListener("input", firefoxFieldSizingContent);
    if (plusButton) {
      plusButton.addEventListener("click", inc);
      plusButton.style.height = `${input.clientHeight}px`;
      plusButton.style.width = `${input.clientHeight}px`;
    }
    if (minusButton) {
      minusButton.addEventListener("click", dec);
      minusButton.style.height = `${input.clientHeight}px`;
      minusButton.style.width = `${input.clientHeight}px`;
    }

    return () => {
      if (input) {
        input.removeEventListener("change", change);
        input.removeEventListener("input", firefoxFieldSizingContent);
      }
      if (plusButton) plusButton.removeEventListener("click", inc);
      if (minusButton) minusButton.removeEventListener("click", dec);
    };
  }, [defaultValue, maximum, minimum, onTyped]);

  return (
    <>
      <button
        ref={minusButtonReference}
        className={`${styles.button} ${fontStyles.buttonFont} ${inputStyles.button_inline}`}
      >
        -
      </button>
      <input
        defaultValue={defaultValue}
        type="number"
        min={minimum}
        max={maximum}
        ref={inputReference}
        className={`${inputStyles.input}`}
      />
      <button
        ref={plusButtonReference}
        className={`${styles.button} ${fontStyles.buttonFont} ${inputStyles.button_inline}`}
      >
        +
      </button>
    </>
  );
}
