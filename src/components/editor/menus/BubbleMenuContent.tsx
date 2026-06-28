import { BubbleMenuPluginProps } from "@tiptap/extension-bubble-menu";
import { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { useMediaQuery } from "usehooks-ts";
import { EditorMenuItems } from "./EditorMenuItems";
import { useEditorMenuState } from "./useEditorMenuState";

export { BubbleMenuButton } from "./BubbleMenuButton";

const shouldShow: BubbleMenuPluginProps["shouldShow"] = ({
  editor,
  element,
  view,
  state,
}) => {
  const { selection } = state;
  const { empty } = selection;
  const isChildOfMenu = element.contains(document.activeElement);
  const hasEditorFocus = view.hasFocus() || isChildOfMenu;

  if (!hasEditorFocus || !editor.isEditable) {
    return false;
  }

  if (editor.isActive("imageWithCaption")) {
    return true;
  }

  return !empty;
};

// https://tiptap.dev/docs/editor/extensions/functionality/bubble-menu
export function BubbleMenuContent({ editor }: { editor: Editor }) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const editorState = useEditorMenuState(editor);

  if (!isDesktop) {
    return null;
  }

  return (
    <BubbleMenu editor={editor} shouldShow={shouldShow} updateDelay={0}>
      <ul
        data-testid="bubble-menu"
        className="menu menu-horizontal bg-base-200 rounded-field p-1 shadow-lg"
      >
        <EditorMenuItems editor={editor} editorState={editorState} />
      </ul>
    </BubbleMenu>
  );
}
