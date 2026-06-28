import { NodeViewWrapper, ReactNodeViewProps } from "@tiptap/react";
import { useState } from "react";
import { buildImageSizeAttrs } from "@/components/editor/utils/imageDisplay";
import { getEditorImageHandlers } from "@/components/editor/utils/getEditorImageHandlers";
import { cn } from "@/lib/ui/cn";

export function ImageUploadPlaceholderNodeView({
  node,
  editor,
  getPos,
}: ReactNodeViewProps) {
  const [isUploading, setIsUploading] = useState(false);

  async function handleFileUpload(file: File) {
    if (!editor) {
      return;
    }

    setIsUploading(true);
    try {
      const uploadImage = getEditorImageHandlers(editor).uploadImage;
      if (!uploadImage) {
        throw new Error("Editor uploadImage is not configured");
      }

      const imageId = await uploadImage(file);
      const imageUrl = getEditorImageHandlers(editor).resolveImageUrl(imageId);
      const alt = file.name.replace(/\.[^/.]+$/, "");

      const pos = getPos();
      if (pos === undefined || pos < 0) {
        return;
      }

      const img = new Image();
      img.onload = () => {
        editor
          .chain()
          .focus()
          .command(({ tr, dispatch }) => {
            if (dispatch) {
              const nodeSize = node.nodeSize;
              tr.replaceWith(
                pos,
                pos + nodeSize,
                editor.state.schema.nodes.imageWithCaption.create({}, [
                  editor.state.schema.nodes.image.create({
                    imageId,
                    src: null,
                    alt,
                    ...buildImageSizeAttrs({
                      naturalWidth: img.naturalWidth,
                      naturalHeight: img.naturalHeight,
                    }),
                  }),
                  editor.state.schema.nodes.caption.create(),
                ]),
              );
            }
            return true;
          })
          .run();
      };
      img.onerror = () => {
        editor
          .chain()
          .focus()
          .command(({ tr, dispatch }) => {
            if (dispatch) {
              const nodeSize = node.nodeSize;
              tr.replaceWith(
                pos,
                pos + nodeSize,
                editor.state.schema.nodes.imageWithCaption.create({}, [
                  editor.state.schema.nodes.image.create({
                    imageId,
                    src: null,
                    alt,
                  }),
                  editor.state.schema.nodes.caption.create(),
                ]),
              );
            }
            return true;
          })
          .run();
      };
      img.src = imageUrl;
    } catch (error) {
      console.error("Failed to upload image:", error);
      alert("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  }

  function handlePaste(event: React.ClipboardEvent) {
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        event.preventDefault();
        const file = item.getAsFile();
        if (file) {
          handleFileUpload(file);
        }
        return;
      }
    }
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleFileUpload(file);
    }
  }

  function handleClick() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileUpload(file);
      }
    };
    input.click();
  }

  return (
    <NodeViewWrapper className="my-4">
      <div
        className={cn(
          "border-base-300 bg-base-200 rounded-field relative flex min-h-[200px] flex-col items-center justify-center border-2 border-dashed p-8 transition-colors",
          isUploading && "opacity-50",
        )}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={handleClick}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <span className="icon-[mdi--loading] text-primary h-8 w-8 animate-spin" />
            <p className="text-base-content/70 text-sm">Uploading image...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="icon-[material-symbols--image] text-base-content/50 h-12 w-12" />
            <p className="text-base-content text-sm font-medium">
              Click to upload or paste an image
            </p>
            <p className="text-base-content/50 text-xs">
              Drag and drop an image here
            </p>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
