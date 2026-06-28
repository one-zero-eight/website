import { Node } from "@tiptap/core";

export const Caption = Node.create({
  name: "caption",

  group: "image-with-caption-group",

  content: "inline*",

  parseHTML() {
    return [
      {
        tag: "figcaption",
      },
    ];
  },

  renderHTML() {
    return ["figcaption", 0];
  },
});
