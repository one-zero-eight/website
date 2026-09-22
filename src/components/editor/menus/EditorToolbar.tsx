import { moveBlock } from "@/components/editor/utils/moveBlock";
import { Editor } from "@tiptap/react";
import { BubbleMenuButton } from "./BubbleMenuButton";
import { EditorMenuItems } from "./EditorMenuItems";
import { useEditorMenuState } from "./useEditorMenuState";

export function EditorToolbar({ editor }: { editor: Editor }) {
  const editorState = useEditorMenuState(editor);

  return (
    <div
      data-testid="editor-toolbar"
      className="border-base-300 bg-base-200 sticky top-0 z-10 mb-3 w-full min-w-0 border-t border-b"
    >
      <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain">
        <ul className="menu menu-horizontal flex w-max! flex-nowrap! p-1">
          <BubbleMenuButton
            isDisabled={!editorState.canMoveUp}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => moveBlock(editor, "up")}
            title="Move up"
            iconClassName="icon-[mdi--arrow-collapse-up]"
          />
          <BubbleMenuButton
            isDisabled={!editorState.canMoveDown}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => moveBlock(editor, "down")}
            title="Move down"
            iconClassName="icon-[mdi--arrow-collapse-up] rotate-180"
          />

          <div className="my-auto h-6 shrink-0 border-l border-black/20 dark:border-white/20" />

          <EditorMenuItems
            editor={editor}
            editorState={editorState}
            showTextFormatting
          />
        </ul>
      </div>
    </div>
  );
}
