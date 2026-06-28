import { offset } from "@floating-ui/react";
import DragHandle from "@tiptap/extension-drag-handle-react";
import { Node } from "@tiptap/pm/model";
import { Editor } from "@tiptap/react";
import { useRef } from "react";

// https://tiptap.dev/docs/editor/extensions/functionality/drag-handle
// https://tiptap.dev/docs/editor/extensions/functionality/drag-handle-react
export function ClickableDragHandle({ editor }: { editor: Editor }) {
  const nodeRef = useRef<{ node: Node | null; pos: number } | null>(null);

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();

    if (!nodeRef.current) return;

    const { node, pos } = nodeRef.current;

    if (pos === null || pos === undefined || !node) return;

    // Select the entire block node
    // nodeSize includes opening (1) + content + closing (1)
    // content.size gives us the actual content size including all nested nodes
    const contentSize = node.content.size;

    if (contentSize > 0) {
      // Find the last leaf text position within the node's content
      // This ensures we don't select beyond the node's boundaries
      function findLastLeafTextPos(
        currentNode: Node,
        currentPos: number,
      ): number | null {
        if (currentNode.isText) {
          return currentPos + currentNode.nodeSize;
        }

        if (currentNode.content.size === 0) {
          return null; // Empty non-text node
        }

        // Traverse to the last child recursively
        let childPos = currentPos + 1;
        let lastTextPos: number | null = null;

        currentNode.content.forEach((child) => {
          const childTextPos = findLastLeafTextPos(child, childPos);
          if (childTextPos !== null) {
            lastTextPos = childTextPos;
          }
          childPos += child.nodeSize;
        });

        return lastTextPos;
      }

      const lastTextPos = findLastLeafTextPos(node, pos);
      const contentEnd = pos + 1 + contentSize;

      // Use the last text position if found, otherwise use contentEnd - 1
      // contentEnd - 1 ensures we don't include the closing tag position
      const selectionEnd =
        lastTextPos !== null && lastTextPos < contentEnd
          ? lastTextPos
          : contentEnd;

      // Select from after opening tag to the last text position (exclusive)
      editor
        .chain()
        .focus()
        .setTextSelection({ from: pos, to: selectionEnd })
        .run();
    } else {
      // In case node is empty, select the node itself
      editor
        .chain()
        .focus()
        .setTextSelection({ from: pos, to: pos + node.nodeSize - 1 })
        .run();
    }
  }

  return (
    <div
      onClick={handleClick}
      className="absolute top-4 -left-2 z-10 hidden md:block"
    >
      <DragHandle
        editor={editor}
        computePositionConfig={{
          middleware: [offset({ mainAxis: 1 })],
        }}
        onNodeChange={({ node, pos }) => (nodeRef.current = { node, pos })}
        className="btn btn-xs btn-ghost cursor-pointer rounded-sm px-0 opacity-60 transition-opacity hover:opacity-100"
      >
        <span className="icon-[material-symbols--drag-indicator] text-base-content text-xl" />
      </DragHandle>
    </div>
  );
}
