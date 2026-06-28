import {
  Node,
  mergeAttributes,
  findChildren,
  findParentNode,
} from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imageWithCaption: {
      /**
       * Set a ImageWithCaption block with the given attributes.
       */
      setImageWithCaption: (options: {
        src: string;
        alt?: string;
        title?: string;
        caption?: string;
        width?: string | number;
        height?: string | number;
      }) => ReturnType;
      /**
       * Update caption of the ImageWithCaption node.
       */
      updateImageCaption: (caption: string) => ReturnType;
    };
  }
}

export const ImageWithCaption = Node.create({
  name: "imageWithCaption",

  content: "image caption",

  group: "block",

  defining: true,

  isolating: true,

  allowGapCursor: false,

  parseHTML() {
    return [
      {
        tag: "figure[data-type='image']",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "figure",
      mergeAttributes(
        { "data-type": "image", class: "image-with-caption" },
        HTMLAttributes,
      ),
      0,
    ];
  },

  addNodeView() {
    return ({ HTMLAttributes }) => {
      const dom = document.createElement("figure");
      const attributes = mergeAttributes(
        { "data-type": "image", class: "image-with-caption" },
        HTMLAttributes,
      );

      Object.entries(attributes).forEach(([key, value]) =>
        dom.setAttribute(key, String(value)),
      );

      return {
        dom,
        contentDOM: dom,
      };
    };
  },

  addCommands() {
    return {
      setImageWithCaption:
        (options: {
          src: string;
          alt?: string;
          title?: string;
          caption?: string;
          width?: string | number;
          height?: string | number;
        }) =>
        ({ chain }) => {
          const { src, alt, title, width, height, caption = "" } = options;

          return chain()
            .insertContent({
              type: this.name,
              content: [
                {
                  type: "image",
                  attrs: {
                    src,
                    alt: alt || null,
                    title: title || null,
                    width: width || null,
                    height: height || null,
                  },
                },
                {
                  type: "caption",
                  content: caption
                    ? [
                        {
                          type: "text",
                          text: caption,
                        },
                      ]
                    : [],
                },
              ],
            })
            .run();
        },

      updateImageCaption:
        (caption: string) =>
        ({ state, chain }) => {
          const { selection, schema } = state;
          const imageWithCaption = findParentNode(
            (node) => node.type === this.type,
          )(selection);

          if (!imageWithCaption) {
            return false;
          }

          const { pos, node } = imageWithCaption;
          const captions = findChildren(
            node,
            (node) => node.type === schema.nodes.caption,
          );

          if (!captions.length) {
            return false;
          }

          const captionNode = captions[0];
          const captionPos = pos + captionNode.pos + 1;

          return chain()
            .setTextSelection({
              from: captionPos,
              to: captionPos + captionNode.node.nodeSize - 2,
            })
            .deleteSelection()
            .insertContent(caption)
            .run();
        },
    };
  },
});
