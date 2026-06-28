import type { Editor } from "@tiptap/core";
import type { EditorImageHandlers } from "@/components/editor/types";

export function getEditorImageHandlers(editor: Editor): EditorImageHandlers {
  return editor.storage.editorImageHandlers;
}

export function resolveImageAttrSrc(
  editor: Editor,
  attrs: { imageId?: string | null; src?: string | null },
) {
  if (attrs.imageId) {
    return getEditorImageHandlers(editor).resolveImageUrl(attrs.imageId);
  }

  return attrs.src ?? "";
}
