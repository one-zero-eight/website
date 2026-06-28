import { findParentNode } from "@tiptap/core";
import { Editor } from "@tiptap/react";
import { buildImageSizeAttrs } from "@/components/editor/utils/imageDisplay";
import {
  getEditorImageHandlers,
  resolveImageAttrSrc,
} from "@/components/editor/utils/getEditorImageHandlers";

export function getImageBlockState(editor: Editor) {
  const imageWithCaption = findParentNode(
    (node) => node.type.name === "imageWithCaption",
  )(editor.state.selection);

  if (!imageWithCaption) {
    return {
      isImage: false,
      imageSrc: null as string | null,
      imageWithCaptionPos: null as number | null,
      imagePos: null as number | null,
    };
  }

  const imageNode = imageWithCaption.node.firstChild;
  if (!imageNode || imageNode.type.name !== "image") {
    return {
      isImage: false,
      imageSrc: null,
      imageWithCaptionPos: null,
      imagePos: null,
    };
  }

  return {
    isImage: true,
    imageSrc: resolveImageAttrSrc(editor, imageNode.attrs),
    imageWithCaptionPos: imageWithCaption.pos,
    imagePos: imageWithCaption.pos + 1,
  };
}

export function pickImageFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      resolve(input.files?.[0] ?? null);
    };
    input.click();
  });
}

export async function replaceImageInBlock(editor: Editor, file: File) {
  const blockState = getImageBlockState(editor);
  if (!blockState.isImage || blockState.imagePos === null) {
    return false;
  }

  if (!file.type.startsWith("image/")) {
    return false;
  }

  const imageId = await getEditorImageHandlers(editor).uploadImage?.(file);
  if (!imageId) {
    throw new Error("Editor uploadImage is not configured");
  }
  const imageUrl = getEditorImageHandlers(editor).resolveImageUrl(imageId);
  const alt = file.name.replace(/\.[^/.]+$/, "");

  await new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      editor
        .chain()
        .focus()
        .command(({ tr, dispatch }) => {
          if (dispatch) {
            tr.setNodeMarkup(blockState.imagePos!, undefined, {
              imageId,
              src: null,
              alt,
              title: null,
              ...buildImageSizeAttrs({
                naturalWidth: img.naturalWidth,
                naturalHeight: img.naturalHeight,
              }),
            });
          }
          return true;
        })
        .run();
      resolve();
    };
    img.onerror = () => {
      editor
        .chain()
        .focus()
        .command(({ tr, dispatch }) => {
          if (dispatch) {
            tr.setNodeMarkup(blockState.imagePos!, undefined, {
              imageId,
              src: null,
              alt,
              title: null,
              width: null,
              height: null,
              originalWidth: null,
              originalHeight: null,
            });
          }
          return true;
        })
        .run();
      resolve();
    };
    img.src = imageUrl;
  });

  return true;
}

export function deleteImageBlock(editor: Editor) {
  const blockState = getImageBlockState(editor);
  if (!blockState.isImage || blockState.imageWithCaptionPos === null) {
    return false;
  }

  const node = editor.state.doc.nodeAt(blockState.imageWithCaptionPos);
  if (!node) {
    return false;
  }

  return editor
    .chain()
    .focus()
    .command(({ tr, dispatch }) => {
      if (dispatch) {
        tr.delete(
          blockState.imageWithCaptionPos!,
          blockState.imageWithCaptionPos! + node.nodeSize,
        );
      }
      return true;
    })
    .run();
}

export async function downloadImageOriginal(src: string) {
  const filenameBase = "image";

  if (src.startsWith("data:")) {
    const mime = src.match(/:(.*?);/)?.[1] || "image/png";
    const ext = mime.split("/")[1] || "png";
    const link = document.createElement("a");
    link.href = src;
    link.download = `${filenameBase}.${ext}`;
    link.click();
    return;
  }

  const response = await fetch(src);
  const blob = await response.blob();
  const extension = blob.type.split("/")[1] || "png";
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filenameBase}.${extension}`;
  link.click();
  URL.revokeObjectURL(url);
}
