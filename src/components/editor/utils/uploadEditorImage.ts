import type { Editor } from "@tiptap/core";
import { buildImageSizeAttrs } from "@/components/editor/utils/imageDisplay";
import { getEditorImageHandlers } from "@/components/editor/utils/getEditorImageHandlers";

export async function uploadEditorImage(
  editor: Editor,
  file: File,
  getPos: () => number | undefined,
) {
  const { uploadImage, resolveImageUrl } = getEditorImageHandlers(editor);
  if (!uploadImage) {
    throw new Error("Editor uploadImage is not configured");
  }

  const imageId = await uploadImage(file);
  if (editor.isDestroyed) {
    return;
  }

  const sizeAttrs = await new Promise<ReturnType<typeof buildImageSizeAttrs>>(
    (resolve) => {
      const image = new Image();
      image.onload = () => resolve(buildImageSizeAttrs(image));
      image.onerror = () => resolve({});
      image.src = resolveImageUrl(imageId);
    },
  );

  if (editor.isDestroyed) {
    return;
  }

  const pos = getPos();
  if (pos === undefined || pos < 0) {
    return;
  }

  const placeholder = editor.state.doc.nodeAt(pos);
  if (placeholder?.type.name !== "imageUploadPlaceholder") {
    return;
  }

  const { schema, tr } = editor.state;
  editor.view.dispatch(
    tr.replaceWith(
      pos,
      pos + placeholder.nodeSize,
      schema.nodes.imageWithCaption.create({}, [
        schema.nodes.image.create({
          imageId,
          src: null,
          alt: file.name.replace(/\.[^/.]+$/, ""),
          ...sizeAttrs,
        }),
        schema.nodes.caption.create(),
      ]),
    ),
  );
}
