import { Callout } from "@/components/editor/extensions/Callout";
import { Details } from "@/components/editor/extensions/Details.ts";
import { Highlight } from "@/components/editor/extensions/Highlight.ts";
import { Link } from "@/components/editor/extensions/Link.ts";
import { ImageWithCaption } from "@/components/editor/extensions/image/ImageWithCaption.ts";
import { Image } from "@/components/editor/extensions/image/Image.ts";
import { Caption } from "@/components/editor/extensions/image/Caption.ts";
import { ImageUploadPlaceholder } from "@/components/editor/extensions/image/ImageUploadPlaceholder.ts";
import { EditorImageHandlersExtension } from "@/components/editor/extensions/EditorImageHandlers";
import { TableKit } from "@tiptap/extension-table";
import { DetailsContent, DetailsSummary } from "@tiptap/extension-details";
import { Placeholder } from "@tiptap/extensions";
import { Editor, JSONContent } from "@tiptap/core";
import { Node } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";

export const descriptionEditorExtensions = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3],
    },
    link: false,
  }),
  Link,
  TableKit.configure({
    table: { resizable: true, cellMinWidth: 100 },
  }),
  Placeholder.configure({
    includeChildren: true,
    showOnlyCurrent: false,
    placeholder: () => "Write something…",
  }),
  Highlight,
  Callout,
  Details,
  DetailsSummary,
  DetailsContent,
  ImageWithCaption,
  Image,
  Caption,
  ImageUploadPlaceholder,
  EditorImageHandlersExtension,
];

export function createDescriptionEditor(content?: JSONContent | string) {
  return new Editor({
    extensions: descriptionEditorExtensions,
    content,
  });
}

export function setCursorInTopLevelBlock(editor: Editor, blockIndex: number) {
  const block = editor.state.doc.child(blockIndex);
  const nodePos = getBlockStartPos(editor.state.doc, blockIndex);
  const cursorPos = Math.min(nodePos + 1, nodePos + block.nodeSize - 1);

  editor.commands.setTextSelection(cursorPos);
}

function getBlockStartPos(doc: Node, index: number) {
  let pos = 0;

  for (let i = 0; i < index; i++) {
    pos += doc.child(i).nodeSize;
  }

  return pos;
}

function getBlockIndex(doc: Node, nodePos: number) {
  let pos = 0;

  for (let index = 0; index < doc.childCount; index++) {
    if (pos === nodePos) {
      return index;
    }
    pos += doc.child(index).nodeSize;
  }

  return null;
}

export function setCursorInNestedText(
  editor: Editor,
  topLevelIndex: number,
  text: string,
) {
  let cursorPos = 1;

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== "paragraph" || node.textContent !== text) {
      return true;
    }

    const blockIndex = getBlockIndex(
      editor.state.doc,
      editor.state.doc.resolve(pos).before(1),
    );

    if (blockIndex === topLevelIndex) {
      cursorPos = pos + 1;
      return false;
    }

    return true;
  });

  editor.commands.setTextSelection(cursorPos);
}
