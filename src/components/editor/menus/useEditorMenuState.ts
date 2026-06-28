import { getImageBlockState } from "@/components/editor/utils/imageBlock";
import { getBlockMoveState } from "@/components/editor/utils/moveBlock";
import { Editor, isTextSelection, useEditorState } from "@tiptap/react";

export function useEditorMenuState(editor: Editor) {
  return useEditorState({
    editor,
    selector: (ctx) => {
      const state = ctx.editor.state;
      const { ranges } = state.selection;
      const from = Math.min(...ranges.map((range) => range.$from.pos));
      const to = Math.max(...ranges.map((range) => range.$to.pos));
      const blockMove = getBlockMoveState(ctx.editor);
      const imageBlock = getImageBlockState(ctx.editor);

      return {
        isTextSelection:
          (state.doc.textBetween(from, to).length &&
            isTextSelection(state.selection)) ||
          false,
        isBold: ctx.editor.isActive("bold") ?? false,
        canBold: ctx.editor.can().toggleBold(),
        isItalic: ctx.editor.isActive("italic") ?? false,
        canItalic: ctx.editor.can().toggleItalic(),
        isStrike: ctx.editor.isActive("strike") ?? false,
        canStrike: ctx.editor.can().toggleStrike(),
        isCode: ctx.editor.isActive("code") ?? false,
        canCode: ctx.editor.can().toggleCode(),
        canUndo: ctx.editor.can().undo(),
        canRedo: ctx.editor.can().redo(),
        isCallout: ctx.editor.isActive("callout") ?? false,
        isTable: ctx.editor.isActive("table") ?? false,
        canAddRowBefore: ctx.editor.can().addRowBefore(),
        canAddRowAfter: ctx.editor.can().addRowAfter(),
        canDeleteRow: ctx.editor.can().deleteRow(),
        canAddColumnBefore: ctx.editor.can().addColumnBefore(),
        canAddColumnAfter: ctx.editor.can().addColumnAfter(),
        canDeleteColumn: ctx.editor.can().deleteColumn(),
        canDeleteTable: ctx.editor.can().deleteTable(),
        canMoveUp: blockMove.canMoveUp,
        canMoveDown: blockMove.canMoveDown,
        isImage: imageBlock.isImage,
        imageSrc: imageBlock.imageSrc,
      };
    },
  });
}

export type EditorMenuState = ReturnType<typeof useEditorMenuState>;
