import { CalloutTypePicker } from "@/components/editor/menus/CalloutTypePicker.tsx";
import { Editor } from "@tiptap/react";
import { BlockTypeDropdown } from "./BlockTypeDropdown";
import { BubbleMenuButton } from "./BubbleMenuButton";
import { EditorMenuState } from "./useEditorMenuState";
import { HighlightColorPicker } from "./HighlightColorPicker";
import { ImageMenuItems } from "./ImageMenuItems";
import { LinkButton } from "./LinkButton";

function EditorMenuSeparator() {
  return (
    <div className="my-auto h-6 shrink-0 border-l border-black/20 dark:border-white/20" />
  );
}

export function EditorMenuItems({
  editor,
  editorState,
}: {
  editor: Editor;
  editorState: EditorMenuState;
}) {
  return (
    <>
      <BlockTypeDropdown editor={editor} />

      {editorState.isCallout && <CalloutTypePicker editor={editor} />}

      {editorState.isTextSelection && (
        <>
          <EditorMenuSeparator />

          <BubbleMenuButton
            isActive={editorState.isBold}
            isDisabled={!editorState.canBold}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold"
            iconClassName="icon-[material-symbols--format-bold]"
          />
          <BubbleMenuButton
            isActive={editorState.isItalic}
            isDisabled={!editorState.canItalic}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic"
            iconClassName="icon-[material-symbols--format-italic]"
          />
          <BubbleMenuButton
            isActive={editorState.isStrike}
            isDisabled={!editorState.canStrike}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough"
            iconClassName="icon-[material-symbols--strikethrough-s]"
          />
          <BubbleMenuButton
            isActive={editorState.isCode}
            isDisabled={!editorState.canCode}
            onClick={() => editor.chain().focus().toggleCode().run()}
            title="Inline code"
            iconClassName="icon-[material-symbols--code]"
          />

          <HighlightColorPicker editor={editor} />

          <LinkButton editor={editor} />
        </>
      )}

      {editorState.isTable && (
        <>
          <EditorMenuSeparator />
          <BubbleMenuButton
            isDisabled={!editorState.canAddRowBefore}
            onClick={() => editor.chain().focus().addRowBefore().run()}
            title="Add row above"
            iconClassName="icon-[material-symbols--add-row-above-outline-rounded]"
          />
          <BubbleMenuButton
            isDisabled={!editorState.canAddRowAfter}
            onClick={() => editor.chain().focus().addRowAfter().run()}
            title="Add row below"
            iconClassName="icon-[material-symbols--add-row-below-outline-rounded]"
          />
          <BubbleMenuButton
            isDisabled={!editorState.canDeleteRow}
            onClick={() => editor.chain().focus().deleteRow().run()}
            title="Delete row"
            iconClassName="icon-[mdi--table-row-remove]"
          />
          <EditorMenuSeparator />
          <BubbleMenuButton
            isDisabled={!editorState.canAddColumnBefore}
            onClick={() => editor.chain().focus().addColumnBefore().run()}
            title="Add column left"
            iconClassName="icon-[material-symbols--add-column-left-outline-rounded]"
          />
          <BubbleMenuButton
            isDisabled={!editorState.canAddColumnAfter}
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            title="Add column right"
            iconClassName="icon-[material-symbols--add-column-right-outline-rounded]"
          />
          <BubbleMenuButton
            isDisabled={!editorState.canDeleteColumn}
            onClick={() => editor.chain().focus().deleteColumn().run()}
            title="Delete column"
            iconClassName="icon-[mdi--table-column-remove]"
          />
        </>
      )}

      <ImageMenuItems editor={editor} editorState={editorState} />

      <EditorMenuSeparator />

      <BubbleMenuButton
        isDisabled={!editorState.canUndo}
        onClick={() => editor.chain().focus().undo().run()}
        title="Undo"
        iconClassName="icon-[material-symbols--undo] shrink-0 text-lg"
      />
      <BubbleMenuButton
        isDisabled={!editorState.canRedo}
        onClick={() => editor.chain().focus().redo().run()}
        title="Redo"
        iconClassName="icon-[material-symbols--redo] shrink-0 text-lg"
      />
    </>
  );
}
