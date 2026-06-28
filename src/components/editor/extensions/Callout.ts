import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { CalloutNodeView } from "./CalloutNodeView.tsx";

export type CalloutId = "note" | "tip" | "important" | "caution" | "warning";

export type CalloutType = {
  id: CalloutId;
  label: string;
  menuLabel: string;
  icon: string;
  color: string;
};

export const calloutTypes: CalloutType[] = [
  {
    id: "note",
    label: "NOTE",
    menuLabel: "Note",
    icon: "icon-[material-symbols--info-outline-rounded]",
    color: "border-blue-500 bg-blue-500/10",
  },
  {
    id: "tip",
    label: "TIP",
    menuLabel: "Tip",
    icon: "icon-[material-symbols--lightbulb-outline-rounded]",
    color: "border-green-500 bg-green-500/10",
  },
  {
    id: "important",
    label: "IMPORTANT",
    menuLabel: "Important",
    icon: "icon-[material-symbols--feedback-outline-rounded]",
    color: "border-purple-500 bg-purple-500/10",
  },
  {
    id: "caution",
    label: "CAUTION",
    menuLabel: "Caution",
    icon: "icon-[material-symbols--report-outline-rounded]",
    color: "border-red-500 bg-red-500/10",
  },
  {
    id: "warning",
    label: "WARNING",
    menuLabel: "Warning",
    icon: "icon-[material-symbols--warning-outline-rounded]",
    color: "border-yellow-500 bg-yellow-500/10",
  },
];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      /**
       * Set a callout block with the given attributes.
       */
      setCallout: (attributes: { type?: string }) => ReturnType;
      /**
       * Toggle a callout block with the given attributes.
       */
      toggleCallout: (attributes: { type?: string }) => ReturnType;
      /**
       * Unset a callout block.
       */
      unsetCallout: () => ReturnType;
    };
  }
}

/**
 * GitHub-like alert.
 * https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#alerts
 */
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      type: {
        default: "note",
        parseHTML: (element) => element.getAttribute("data-callout-type"),
        renderHTML: (attributes) => {
          if (!attributes.type) {
            return {};
          }
          return {
            "data-callout-type": attributes.type,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="callout"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "callout" }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutNodeView, {
      update: ({ oldNode, newNode, updateProps }) => {
        if (
          oldNode.attrs.type !== newNode.attrs.type ||
          !oldNode.content.eq(newNode.content)
        ) {
          updateProps();
        }

        return true;
      },
    });
  },

  addCommands() {
    return {
      setCallout:
        (attributes: { type?: string }) =>
        ({ commands, state, tr, dispatch }: any) => {
          const { selection } = state;
          const { from, to } = selection;

          // Check if we're already in a callout
          const $from = state.selection.$from;
          for (let d = $from.depth; d > 0; d--) {
            const node = $from.node(d);
            if (node.type.name === this.name) {
              // Update the callout type attributes
              if (dispatch) {
                const pos = $from.before(d);
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  ...attributes,
                });
              }
              return true;
            }
          }

          // If there's selected text/content, try to wrap it
          if (from !== to) {
            const result = commands.wrapIn(this.name, attributes);
            if (result) return result;
          }

          // Otherwise, insert a new callout block with a paragraph
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
            content: [{ type: "paragraph" }],
          });
        },
      toggleCallout:
        (attributes: { type?: string }) =>
        ({ commands }: any) => {
          return commands.toggleWrap(this.name, attributes);
        },
      unsetCallout:
        () =>
        ({ commands }: any) => {
          return commands.lift(this.name);
        },
    } as any;
  },
});
