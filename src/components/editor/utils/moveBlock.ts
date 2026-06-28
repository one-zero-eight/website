import { Editor } from "@tiptap/react";
import { Fragment, Node } from "@tiptap/pm/model";
import { EditorState, TextSelection, Transaction } from "@tiptap/pm/state";

function cloneNode(node: Node) {
  return node.type.create(node.attrs, node.content, node.marks);
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

function getTopLevelBlockIndex($from: EditorState["selection"]["$from"]) {
  if ($from.depth < 1) {
    const pos = $from.pos;
    let nodePos = 0;

    for (let index = 0; index < $from.doc.childCount; index++) {
      const node = $from.doc.child(index);
      const nodeEnd = nodePos + node.nodeSize;

      if (pos >= nodePos && pos < nodeEnd) {
        return index;
      }

      nodePos = nodeEnd;
    }

    return $from.doc.childCount > 0 ? $from.doc.childCount - 1 : null;
  }

  return getBlockIndex($from.doc, $from.before(1));
}

export function getBlockMoveState(editor: Editor) {
  const index = getTopLevelBlockIndex(editor.state.selection.$from);

  if (index === null) {
    return {
      canMoveUp: false,
      canMoveDown: false,
    };
  }

  const doc = editor.state.doc;

  return {
    canMoveUp: index > 0,
    canMoveDown: index < doc.childCount - 1,
  };
}

export function createMoveBlockTransaction(
  state: EditorState,
  direction: "up" | "down",
): Transaction | null {
  const { selection } = state;
  const { $from } = selection;
  const index = getTopLevelBlockIndex($from);

  if (index === null) {
    return null;
  }

  const doc = state.doc;

  if (direction === "up" && index === 0) {
    return null;
  }
  if (direction === "down" && index >= doc.childCount - 1) {
    return null;
  }

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  const lowIndex = Math.min(index, swapIndex);
  const highIndex = Math.max(index, swapIndex);
  const node = doc.child(index);
  const lowNode = doc.child(lowIndex);
  const highNode = doc.child(highIndex);
  const nodePos = getBlockStartPos(doc, index);
  const rangeStart = getBlockStartPos(doc, lowIndex);
  const rangeEnd = rangeStart + lowNode.nodeSize + highNode.nodeSize;

  const selFromOffset = selection.from - nodePos;
  const selToOffset = selection.to - nodePos;

  const tr = state.tr;
  tr.replaceWith(
    rangeStart,
    rangeEnd,
    Fragment.from([cloneNode(highNode), cloneNode(lowNode)]),
  );

  const newNodePos =
    index < swapIndex ? rangeStart + highNode.nodeSize : rangeStart;
  const newFrom = Math.min(
    Math.max(newNodePos + selFromOffset, newNodePos + 1),
    newNodePos + node.nodeSize - 1,
  );
  const newTo = Math.min(
    Math.max(newNodePos + selToOffset, newNodePos + 1),
    newNodePos + node.nodeSize - 1,
  );

  tr.setSelection(
    selection.empty
      ? TextSelection.create(tr.doc, newFrom)
      : TextSelection.create(
          tr.doc,
          Math.min(newFrom, newTo),
          Math.max(newFrom, newTo),
        ),
  );

  return tr;
}

export function moveBlock(editor: Editor, direction: "up" | "down") {
  const tr = createMoveBlockTransaction(editor.state, direction);

  if (!tr) {
    return false;
  }

  editor.view.dispatch(tr);
  editor.view.focus();

  return true;
}

export function getTopLevelBlockTexts(doc: Node) {
  const texts: string[] = [];

  doc.forEach((node) => {
    texts.push(node.textContent);
  });

  return texts;
}
