import { useLingui } from "@lingui/react/macro";
import { useEffect, useState, type RefObject } from "react";

const QUOTE_MAX_LENGTH = 2000;

// The selected text as a markdown quote that the message can start with, so the assistant sees what it refers to
export function asQuote(selected: string): string {
  const text = selected.replace(/\n{3,}/g, "\n\n").trim();
  if (!text) return "";
  const shown =
    text.length > QUOTE_MAX_LENGTH
      ? `${text.slice(0, QUOTE_MAX_LENGTH)}…`
      : text;
  return shown
    .split("\n")
    .map((line) => (line ? `> ${line}` : ">"))
    .join("\n");
}

// A right click on selected text in the chat offers to quote it in the message box
export function AskQuoteMenu({
  containerRef,
  onQuote,
}: {
  containerRef: RefObject<HTMLElement | null>;
  onQuote: (quote: string) => void;
}) {
  const { t } = useLingui();
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const open = (event: MouseEvent) => {
      const selection = window.getSelection();
      const text = selection?.toString() ?? "";
      const inside =
        selection?.anchorNode && container.contains(selection.anchorNode);
      if (!asQuote(text) || !inside) return setMenu(null);
      event.preventDefault();
      setMenu({ x: event.clientX, y: event.clientY, text });
    };
    container.addEventListener("contextmenu", open);
    return () => container.removeEventListener("contextmenu", open);
  }, [containerRef]);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  if (!menu) return null;
  return (
    <ul
      role="menu"
      className="menu bg-base-100 rounded-box border-base-300 fixed z-50 border p-1 shadow-lg"
      style={{ left: menu.x, top: menu.y }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <li role="none">
        <button
          type="button"
          role="menuitem"
          // Keeps the selection while the button is pressed
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            onQuote(asQuote(menu.text));
            setMenu(null);
          }}
        >
          <span className="icon-[material-symbols--format-quote-rounded] text-lg" />
          {t`Quote`}
        </button>
      </li>
      <li role="none">
        <button
          type="button"
          role="menuitem"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            void navigator.clipboard?.writeText(menu.text).catch(() => {});
            setMenu(null);
          }}
        >
          <span className="icon-[material-symbols--content-copy-outline-rounded] text-lg" />
          {t`Copy`}
        </button>
      </li>
      <li role="none">
        <button
          type="button"
          role="menuitem"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            const all = containerRef.current;
            if (all) window.getSelection()?.selectAllChildren(all);
            setMenu(null);
          }}
        >
          <span className="icon-[material-symbols--select-all-rounded] text-lg" />
          {t`Select all`}
        </button>
      </li>
    </ul>
  );
}
