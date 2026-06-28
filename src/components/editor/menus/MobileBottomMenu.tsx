import { moveBlock } from "@/components/editor/utils/moveBlock";
import { cn } from "@/lib/ui/cn";
import { Editor } from "@tiptap/react";
import { BubbleMenuButton } from "./BubbleMenuButton";
import { EditorMenuItems } from "./EditorMenuItems";
import { useEditorMenuState } from "./useEditorMenuState";

export function MobileBottomMenu({
  editor,
  className,
}: {
  editor: Editor;
  className?: string;
}) {
  const editorState = useEditorMenuState(editor);

  return (
    <div
      data-testid="mobile-bottom-menu"
      className={cn(
        "border-base-300 bg-base-200 sticky bottom-0 w-full min-w-0 border-t md:hidden",
        className,
      )}
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

          <EditorMenuItems editor={editor} editorState={editorState} />
        </ul>
      </div>
    </div>
  );
}
