import { Details as BaseDetails } from "@tiptap/extension-details";

// https://tiptap.dev/docs/editor/extensions/nodes/details
/**
 * Custom Details:
 * Sets persist; open by default.
 */
export const Details = BaseDetails.extend({
  addOptions() {
    const parent = this.parent?.();
    return {
      ...parent,
      openClassName: parent?.openClassName ?? "",
      HTMLAttributes: parent?.HTMLAttributes ?? {},
      renderToggleButton:
        parent?.renderToggleButton ??
        (() => {
          /* default no-op */
        }),
      persist: true,
    };
  },
  addAttributes() {
    return {
      ...this.parent?.(),
      open: {
        default: true,
        parseHTML: (element) => element.hasAttribute("open"),
        renderHTML: ({ open }) => {
          if (!open) return {};
          return { open: "" };
        },
      },
    };
  },
});
