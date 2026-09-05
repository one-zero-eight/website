import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
} from "@floating-ui/react";
import { useCallback, useEffect, useState } from "react";

import { cn } from "@/lib/ui/cn";

// The 23 CSS3Color presets used by Events, stored as canonical HEX values.
export const CSS3_COLOR_PRESETS = [
  { name: "brown", hex: "#A52A2A" },
  { name: "cadetblue", hex: "#5F9EA0" },
  { name: "chocolate", hex: "#D2691E" },
  { name: "darkcyan", hex: "#008B8B" },
  { name: "darkgreen", hex: "#006400" },
  { name: "darkmagenta", hex: "#8B008B" },
  { name: "darkolivegreen", hex: "#556B2F" },
  { name: "darkred", hex: "#8B0000" },
  { name: "darkslateblue", hex: "#483D8B" },
  { name: "darkslategray", hex: "#2F4F4F" },
  { name: "dimgray", hex: "#696969" },
  { name: "firebrick", hex: "#B22222" },
  { name: "forestgreen", hex: "#228B22" },
  { name: "gray", hex: "#808080" },
  { name: "indianred", hex: "#CD5C5C" },
  { name: "lightslategray", hex: "#778899" },
  { name: "maroon", hex: "#800000" },
  { name: "mediumvioletred", hex: "#C71585" },
  { name: "midnightblue", hex: "#191970" },
  { name: "indigo", hex: "#4B0082" },
  { name: "rebeccapurple", hex: "#663399" },
  { name: "seagreen", hex: "#2E8B57" },
  { name: "teal", hex: "#008080" },
] as const;

const HEX_COLOR_PATTERN = /^#[0-9A-F]{6}$/;
const DEFAULT_NATIVE_COLOR = CSS3_COLOR_PRESETS[0].hex;

export function normalizeHexColor(value: string): string | null {
  const normalized = value.trim().toUpperCase();
  const withHash = normalized.startsWith("#") ? normalized : `#${normalized}`;
  return HEX_COLOR_PATTERN.test(withHash) ? withHash : null;
}

export function colorSwatchStyle(color: string, borderColor = color) {
  return {
    backgroundColor: `color-mix(in srgb, ${color} 40%, transparent)`,
    borderColor,
  };
}

export function CompactColorPicker({
  value,
  automaticColor,
  onChange,
  className,
  triggerClassName,
}: {
  value: string | null | undefined;
  automaticColor?: string;
  onChange: (value: string | null) => void;
  className?: string;
  triggerClassName?: string;
}) {
  const canonicalValue = value ? normalizeHexColor(value) : null;
  const displayColor = canonicalValue ?? automaticColor;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(canonicalValue ?? "");
  const [nativeDraft, setNativeDraft] = useState(
    canonicalValue ?? DEFAULT_NATIVE_COLOR,
  );
  useEffect(() => {
    setDraft(canonicalValue ?? "");
    setNativeDraft(canonicalValue ?? DEFAULT_NATIVE_COLOR);
  }, [canonicalValue]);

  const handleNativeInputRef = useCallback(
    (input: HTMLInputElement | null) => {
      if (!input) return;

      // React onChange also handles live input events. Only the native change
      // event signals that the user has committed the color picker selection.
      function handleNativeChange(event: Event) {
        const normalized = normalizeHexColor(
          (event.currentTarget as HTMLInputElement).value,
        );
        if (!normalized) return;
        setDraft(normalized);
        if (normalized !== canonicalValue) onChange(normalized);
      }

      input.addEventListener("change", handleNativeChange);
      return () => input.removeEventListener("change", handleNativeChange);
    },
    [canonicalValue, onChange],
  );

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: "bottom-start",
    middleware: [offset(4), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });
  const click = useClick(context);
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
  ]);

  function commitColor(nextValue: string) {
    const normalized = normalizeHexColor(nextValue);
    if (!normalized) return;
    setDraft(normalized);
    onChange(normalized);
  }

  return (
    <div className={cn("w-fit", className)}>
      <button
        ref={refs.setReference}
        type="button"
        className={cn(
          "btn btn-sm border-base-content/20 bg-base-100 hover:border-base-content/30 min-h-8 gap-2 px-2 font-normal shadow-none transition-none focus:not-focus-visible:outline-none",
          triggerClassName,
        )}
        {...getReferenceProps()}
      >
        <span
          className="border-base-300 h-4 w-4 shrink-0 rounded border"
          style={displayColor ? colorSwatchStyle(displayColor) : undefined}
        />
        <span>{canonicalValue ?? "Автоматически"}</span>
        <span className="icon-[mdi--chevron-down] text-base-content/60" />
      </button>

      {open ? (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              className="border-base-300 bg-base-100 rounded-box z-50 flex w-[min(18rem,calc(100vw-1rem))] flex-col gap-3 border p-3 shadow-xl"
              {...getFloatingProps()}
            >
              <div className="grid grid-cols-8 gap-1.5">
                {CSS3_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    className={cn(
                      "border-base-300 ring-primary h-7 w-7 rounded border transition-shadow hover:ring",
                      canonicalValue === preset.hex && "ring-2",
                    )}
                    style={colorSwatchStyle(preset.hex)}
                    title={`${preset.name} (${preset.hex})`}
                    onClick={() => {
                      commitColor(preset.hex);
                      setOpen(false);
                    }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <label className="flex shrink-0 flex-col gap-1">
                  <span className="text-base-content/60 text-[0.625rem]">
                    Другой
                  </span>
                  <span className="relative block h-8 w-10">
                    <span
                      className="pointer-events-none absolute inset-0 rounded border"
                      style={colorSwatchStyle(nativeDraft)}
                    />
                    <input
                      ref={handleNativeInputRef}
                      type="color"
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      value={nativeDraft}
                      onChange={(event) => setNativeDraft(event.target.value)}
                    />
                  </span>
                </label>
                <label className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-base-content/60 text-[0.625rem]">
                    HEX
                  </span>
                  <input
                    className={cn(
                      "input input-bordered input-sm w-full min-w-0 font-mono uppercase",
                      draft !== "" &&
                        !normalizeHexColor(draft) &&
                        "input-error",
                    )}
                    value={draft}
                    placeholder="#RRGGBB"
                    maxLength={7}
                    onChange={(event) => setDraft(event.target.value)}
                    onBlur={() => {
                      if (draft === "") {
                        setDraft(canonicalValue ?? "");
                        return;
                      }
                      const normalized = normalizeHexColor(draft);
                      if (!normalized) return;
                      commitColor(normalized);
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") return;
                      event.preventDefault();
                      const normalized = normalizeHexColor(draft);
                      if (!normalized) return;
                      commitColor(normalized);
                      setOpen(false);
                    }}
                  />
                </label>
              </div>

              <button
                type="button"
                className="btn btn-ghost btn-sm justify-start"
                onClick={() => {
                  setDraft("");
                  onChange(null);
                  setOpen(false);
                }}
              >
                {automaticColor ? (
                  <span
                    className="border-base-300 h-4 w-4 shrink-0 rounded border"
                    style={colorSwatchStyle(automaticColor)}
                  />
                ) : null}
                Автоматически
              </button>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      ) : null}
    </div>
  );
}
