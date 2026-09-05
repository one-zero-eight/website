import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

import {
  CSS3_COLOR_PRESETS,
  CompactColorPicker,
  normalizeHexColor,
} from "./CompactColorPicker.tsx";

describe("CSS3 color presets", () => {
  it("provides 23 distinct colors with matching CSS names and HEX values", () => {
    expect(CSS3_COLOR_PRESETS).toHaveLength(23);
    expect(new Set(CSS3_COLOR_PRESETS.map((preset) => preset.hex)).size).toBe(
      23,
    );
    const swatch = document.createElement("span");
    document.body.append(swatch);
    try {
      for (const preset of CSS3_COLOR_PRESETS) {
        expect(normalizeHexColor(preset.hex)).toBe(preset.hex);
        swatch.style.backgroundColor = preset.name;
        const namedColor = getComputedStyle(swatch).backgroundColor;
        swatch.style.backgroundColor = preset.hex;
        expect(getComputedStyle(swatch).backgroundColor).toBe(namedColor);
      }
    } finally {
      swatch.remove();
    }
  });
});

describe("native color selection", () => {
  it("previews input events and saves only the committed change", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const onChange = vi.fn();
    try {
      await act(async () => {
        root.render(
          createElement(CompactColorPicker, { value: "#804242", onChange }),
        );
      });
      await act(async () => container.querySelector("button")!.click());
      const input = document.querySelector<HTMLInputElement>(
        'input[type="color"]',
      )!;
      expect(input).not.toBeNull();
      const setValue = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!;
      for (const color of ["#123456", "#abcdef"]) {
        await act(async () => {
          setValue.call(input, color);
          input.dispatchEvent(new Event("input", { bubbles: true }));
        });
      }
      expect(onChange).not.toHaveBeenCalled();
      expect(input.value).toBe("#abcdef");
      await act(async () => {
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
      expect(onChange).toHaveBeenCalledExactlyOnceWith("#ABCDEF");
    } finally {
      await act(async () => root.unmount());
      container.remove();
      vi.unstubAllGlobals();
    }
  });
});

describe("normalizeHexColor", () => {
  it("normalizes valid six-digit hex colors", () => {
    expect(normalizeHexColor(" abcdef ")).toBe("#ABCDEF");
    expect(normalizeHexColor("#12aBcD")).toBe("#12ABCD");
  });

  it("rejects incomplete or malformed colors", () => {
    expect(normalizeHexColor("#123")).toBeNull();
    expect(normalizeHexColor("#GGGGGG")).toBeNull();
    expect(normalizeHexColor("")).toBeNull();
  });
});
