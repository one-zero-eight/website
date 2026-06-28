import { Plugin, PluginKey } from "@tiptap/pm/state";

/**
 * Tiptap ResizableNodeView listens to touchstart/touchmove but only ends
 * resize on mouseup. Forward touchend/touchcancel to mouseup while resizing.
 */
export function createImageResizeTouchFixPlugin() {
  return new Plugin({
    key: new PluginKey("imageResizeTouchFix"),
    view() {
      function finishResize() {
        if (!document.querySelector('[data-resize-state="true"]')) {
          return;
        }

        document.dispatchEvent(
          new MouseEvent("mouseup", { bubbles: true, cancelable: true }),
        );
      }

      document.addEventListener("touchend", finishResize, { capture: true });
      document.addEventListener("touchcancel", finishResize, { capture: true });

      return {
        destroy() {
          document.removeEventListener("touchend", finishResize, {
            capture: true,
          });
          document.removeEventListener("touchcancel", finishResize, {
            capture: true,
          });
        },
      };
    },
  });
}
