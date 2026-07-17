import { Link as BaseLink, type LinkOptions } from "@tiptap/extension-link";
import type { Editor } from "@tiptap/core";
import type { MarkType } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";

// https://tiptap.dev/docs/editor/extensions/marks/link
/**
 * Custom Link:
 * Use good settings; do not open on click in editor mode.
 */
export const Link = BaseLink.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      openOnClick: false,
      autolink: true,
      defaultProtocol: "https",
      protocols: ["http", "https", "mailto", "tel"],
      linkOnPaste: true,
      enableClickSelection: true,
    } as LinkOptions;
  },
  addProseMirrorPlugins() {
    return [
      ...(this.parent?.() || []),
      clickHandler({
        type: this.type,
        editor: this.editor,
        enableClickSelection: this.options.enableClickSelection,
      }),
    ];
  },
});

type ClickHandlerOptions = {
  type: MarkType;
  editor: Editor;
  enableClickSelection?: boolean;
};

export function clickHandler(options: ClickHandlerOptions): Plugin {
  return new Plugin({
    key: new PluginKey("handleClickLink"),
    props: {
      handleClick: (view, pos, event) => {
        if (event.button !== 0) {
          return false;
        }

        if (!view.editable) {
          return false;
        }

        let link: HTMLAnchorElement | null = null;

        if (event.target instanceof HTMLAnchorElement) {
          link = event.target;
        } else {
          let a = event.target as HTMLElement;
          const els = [];

          while (a.nodeName !== "DIV") {
            els.push(a);
            a = a.parentNode as HTMLElement;
          }
          link = els.find(
            (value) => value.nodeName === "A",
          ) as HTMLAnchorElement;
        }

        if (!link) {
          return false;
        }

        if (options.enableClickSelection) {
          options.editor.commands.extendMarkRange(options.type.name);
          return true;
        }

        // if (link && href) {
        // window.open(href, target)

        // return true
        // }

        return false;
      },
    },
  });
}
