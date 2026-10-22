import { Highlight as BaseHighlight } from "@tiptap/extension-highlight";
import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";

export type HighlightColor =
  | "none"
  | "yellow"
  | "green"
  | "blue"
  | "pink"
  | "orange"
  | "purple"
  | "red";

export type HighlightColorType = {
  id: HighlightColor;
  label: MessageDescriptor;
  color: string | undefined;
  darkColor: string | undefined;
};

export const highlightColors: Record<HighlightColor, HighlightColorType> = {
  none: {
    id: "none",
    label: msg`Remove highlight`,
    color: undefined,
    darkColor: undefined,
  },
  yellow: {
    id: "yellow",
    label: msg`Yellow`,
    color: "#ffd66c",
    darkColor: "#bb9634",
  },
  green: {
    id: "green",
    label: msg`Green`,
    color: "#6bf5a3",
    darkColor: "#42b772",
  },
  blue: {
    id: "blue",
    label: msg`Blue`,
    color: "#bfdbfe",
    darkColor: "#002451",
  },
  pink: {
    id: "pink",
    label: msg`Pink`,
    color: "#fbcfe8",
    darkColor: "#590e3d",
  },
  orange: {
    id: "orange",
    label: msg`Orange`,
    color: "#f4c48e",
    darkColor: "#582e02",
  },
  purple: {
    id: "purple",
    label: msg`Purple`,
    color: "#e9d5ff",
    darkColor: "#381e56",
  },
  red: {
    id: "red",
    label: msg`Red`,
    color: "#fecaca",
    darkColor: "#521919",
  },
};

// https://tiptap.dev/docs/editor/extensions/marks/highlight
/**
 * Modified Highlight:
 * Choose color from a limited set. Adjusted colors for dark/light themes.
 */
export const Highlight = BaseHighlight.extend({
  addOptions() {
    const parent = this.parent?.();
    return {
      ...parent,
      HTMLAttributes: parent?.HTMLAttributes ?? {},
      multicolor: true,
    };
  },
  addAttributes() {
    return {
      ...this.parent?.(),
      color: {
        default: null,
        // Parse HTML to get the color and match it to the available colors
        parseHTML: (element) => {
          const color = element.getAttribute("data-color");
          if (!color) {
            return null;
          }
          return highlightColors[color as HighlightColor]?.id || "none";
        },
        renderHTML: (attributes) => {
          if (!attributes.color || attributes.color === "none") {
            return {};
          }
          const colorType = highlightColors[attributes.color as HighlightColor];
          return {
            "data-color": colorType.id,
            style: `--mark-color: ${colorType.color}; --mark-color-dark: ${colorType.darkColor}`,
          };
        },
      },
    };
  },
});
