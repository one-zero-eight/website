import { NodeViewWrapper, ReactNodeViewProps } from "@tiptap/react";
import { useState } from "react";
import { uploadEditorImage } from "@/components/editor/utils/uploadEditorImage";
import { cn } from "@/lib/ui/cn";

export function ImageUploadPlaceholderNodeView({
  node,
  editor,
  getPos,
}: ReactNodeViewProps) {
  const [isFileUploading, setIsFileUploading] = useState(false);
  const isUploading = isFileUploading || Boolean(node.attrs.uploadId);

  async function handleFileUpload(file: File) {
    if (isUploading) {
      return;
    }

    setIsFileUploading(true);
    try {
      await uploadEditorImage(editor, file, getPos);
    } catch (error) {
      console.error("Failed to upload image:", error);
      alert("Failed to upload image");
    } finally {
      setIsFileUploading(false);
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
    input.accept = "image/jpeg,image/png,image/webp";
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
