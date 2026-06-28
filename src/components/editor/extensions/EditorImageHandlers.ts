import { Extension } from "@tiptap/core";
import type { EditorImageHandlers } from "@/components/editor/types";

export const EditorImageHandlersExtension =
  Extension.create<EditorImageHandlers>({
    name: "editorImageHandlers",

    addOptions() {
      return {
        uploadImage: async () => {
          throw new Error("Editor uploadImage is not configured");
        },
        resolveImageUrl: (imageId: string) => imageId,
      };
    },

    addStorage() {
      return {
        uploadImage: this.options.uploadImage,
        resolveImageUrl: this.options.resolveImageUrl,
      };
    },
  });
