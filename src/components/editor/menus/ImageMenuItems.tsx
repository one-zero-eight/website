import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import {
  deleteImageBlock,
  downloadImageOriginal,
  pickImageFile,
  replaceImageInBlock,
} from "@/components/editor/utils/imageBlock";
import { useToast } from "@/components/toast";
import { Editor } from "@tiptap/react";
import { useState } from "react";
import { BubbleMenuButton } from "./BubbleMenuButton";
import { EditorMenuState } from "./useEditorMenuState";

function EditorMenuSeparator() {
  return (
    <div className="my-auto h-6 shrink-0 border-l border-black/20 dark:border-white/20" />
  );
}

export function ImageMenuItems({
  editor,
  editorState,
}: {
  editor: Editor;
  editorState: EditorMenuState;
}) {
  const { t } = useLingui();
  const { showError } = useToast();
  const [isReplacing, setIsReplacing] = useState(false);

  if (!editorState.isImage) {
    return null;
  }

  async function handleReplace() {
    const file = await pickImageFile();
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      showError(msg`Error`, msg`Please select an image file`);
      return;
    }

    setIsReplacing(true);
    try {
      const replaced = await replaceImageInBlock(editor, file);
      if (!replaced) {
        showError(msg`Error`, msg`Could not replace image`);
      }
    } catch {
      showError(msg`Error`, msg`Failed to upload image`);
    } finally {
      setIsReplacing(false);
    }
  }

  async function handleDownload() {
    if (!editorState.imageSrc) {
      return;
    }

    try {
      await downloadImageOriginal(editorState.imageSrc);
    } catch {
      showError(msg`Error`, msg`Failed to download image`);
    }
  }

  function handleDelete() {
    deleteImageBlock(editor);
  }

  return (
    <>
      <EditorMenuSeparator />

      <BubbleMenuButton
        isDisabled={isReplacing}
        onMouseDown={(event) => event.preventDefault()}
        onClick={handleReplace}
        title={t`Replace image`}
        iconClassName={
          isReplacing
            ? "loading loading-spinner loading-sm"
            : "icon-[material-symbols--swap-horiz]"
        }
      />
      <BubbleMenuButton
        isDisabled={!editorState.imageSrc}
        onMouseDown={(event) => event.preventDefault()}
        onClick={handleDownload}
        title={t`Download original`}
        iconClassName="icon-[material-symbols--download]"
      />
      <BubbleMenuButton
        onMouseDown={(event) => event.preventDefault()}
        onClick={handleDelete}
        title={t`Delete image`}
        iconClassName="icon-[material-symbols--delete-outline]"
      />
    </>
  );
}
