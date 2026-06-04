import inputStyles from "@/components/web-print/css/printers.input.module.css";
import { useEffect, useRef } from "react";

export function ScalableDocumentNameInput({
  defaultValue,
  onTyped,
}: {
  defaultValue: string | undefined;
  onTyped: (value: string) => void;
}) {
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
      const value = input!.value.trim();
      if (value) onTyped(`${value}.pdf`);
      firefoxFieldSizingContent();
    }

    input.value = defaultValue?.split(".pdf")[0] || "";

    input.addEventListener("input", change);
    return () => {
      input.removeEventListener("input", change);
    };
  }, [defaultValue, onTyped]);

  return (
    <>
      <input
        placeholder="Rename"
        type="text"
        ref={inputReference}
        className={`${inputStyles.input} ${inputStyles.input_dropBackground} ${inputStyles.input_rounded}`}
      />
    </>
  );
}
