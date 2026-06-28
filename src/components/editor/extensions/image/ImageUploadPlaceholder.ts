import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ImageUploadPlaceholderNodeView } from "./ImageUploadPlaceholderNodeView.tsx";

export const ImageUploadPlaceholder = Node.create({
  name: "imageUploadPlaceholder",
  group: "block",
  atom: true,

  addAttributes() {
    return {};
  },

  parseHTML() {
    return [
      {
        tag: "div[data-type='image-upload-placeholder']",
      },
    ];
  },

  renderHTML() {
    return ["div", { "data-type": "image-upload-placeholder" }, 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageUploadPlaceholderNodeView);
  },
});
