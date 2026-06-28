import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";
import {
  createDescriptionEditor,
  setCursorInNestedText,
  setCursorInTopLevelBlock,
} from "@/components/editor/test-utils/createDescriptionEditor";
import {
  createMoveBlockTransaction,
  getBlockMoveState,
  getTopLevelBlockTexts,
  moveBlock,
} from "@/components/editor/utils/moveBlock";

function applyMove(editor: Editor, direction: "up" | "down") {
  const tr = createMoveBlockTransaction(editor.state, direction);

  if (!tr) {
    return false;
  }

  editor.view.dispatch(tr);
  return true;
}

describe("moveBlock", () => {
  let editor: Editor;

  afterEach(() => {
    editor?.destroy();
  });

  it("returns block move state for middle paragraph", () => {
    editor = createDescriptionEditor({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "A" }] },
        { type: "paragraph", content: [{ type: "text", text: "B" }] },
        { type: "paragraph", content: [{ type: "text", text: "C" }] },
      ],
    });

    setCursorInTopLevelBlock(editor, 1);

    expect(getBlockMoveState(editor)).toEqual({
      canMoveUp: true,
      canMoveDown: true,
    });
  });

  it("disables move up for first paragraph", () => {
    editor = createDescriptionEditor({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "A" }] },
        { type: "paragraph", content: [{ type: "text", text: "B" }] },
      ],
    });

    setCursorInTopLevelBlock(editor, 0);

    expect(getBlockMoveState(editor)).toEqual({
      canMoveUp: false,
      canMoveDown: true,
    });
  });

  it("disables move down for last paragraph", () => {
    editor = createDescriptionEditor({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "A" }] },
        { type: "paragraph", content: [{ type: "text", text: "B" }] },
      ],
    });

    setCursorInTopLevelBlock(editor, 1);

    expect(getBlockMoveState(editor)).toEqual({
      canMoveUp: true,
      canMoveDown: false,
    });
  });

  it("moves a paragraph up", () => {
    editor = createDescriptionEditor({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "A" }] },
        { type: "paragraph", content: [{ type: "text", text: "B" }] },
        { type: "paragraph", content: [{ type: "text", text: "C" }] },
      ],
    });

    setCursorInTopLevelBlock(editor, 1);
    expect(applyMove(editor, "up")).toBe(true);

    expect(getTopLevelBlockTexts(editor.state.doc)).toEqual(["B", "A", "C"]);
    expect(editor.state.doc.childCount).toBe(3);
  });

  it("moves a paragraph down", () => {
    editor = createDescriptionEditor({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "A" }] },
        { type: "paragraph", content: [{ type: "text", text: "B" }] },
        { type: "paragraph", content: [{ type: "text", text: "C" }] },
      ],
    });

    setCursorInTopLevelBlock(editor, 0);
    expect(applyMove(editor, "down")).toBe(true);

    expect(getTopLevelBlockTexts(editor.state.doc)).toEqual(["B", "A", "C"]);
    expect(editor.state.doc.childCount).toBe(3);
  });

  it("preserves selection inside moved paragraph", () => {
    editor = createDescriptionEditor({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "A" }] },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello world" }],
        },
      ],
    });

    setCursorInTopLevelBlock(editor, 1);
    const { from } = editor.state.selection;
    editor.commands.setTextSelection({ from, to: from + 5 });

    expect(applyMove(editor, "up")).toBe(true);

    expect(getTopLevelBlockTexts(editor.state.doc)).toEqual([
      "Hello world",
      "A",
    ]);
    expect(
      editor.state.doc.textBetween(
        editor.state.selection.from,
        editor.state.selection.to,
      ),
    ).toBe("Hello");
  });

  it("moves the whole callout when cursor is inside it", () => {
    editor = createDescriptionEditor({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Before" }] },
        {
          type: "callout",
          attrs: { type: "note" },
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Inside callout" }],
            },
          ],
        },
        { type: "paragraph", content: [{ type: "text", text: "After" }] },
      ],
    });

    setCursorInNestedText(editor, 1, "Inside callout");
    expect(applyMove(editor, "up")).toBe(true);

    expect(getTopLevelBlockTexts(editor.state.doc)).toEqual([
      "Inside callout",
      "Before",
      "After",
    ]);
  });

  it("moves a bullet list as a top-level block", () => {
    editor = createDescriptionEditor({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "A" }] },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Item 1" }],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Item 2" }],
                },
              ],
            },
          ],
        },
        { type: "paragraph", content: [{ type: "text", text: "C" }] },
      ],
    });

    setCursorInNestedText(editor, 1, "Item 1");
    expect(applyMove(editor, "up")).toBe(true);

    expect(getTopLevelBlockTexts(editor.state.doc)).toEqual([
      "Item 1Item 2",
      "A",
      "C",
    ]);
  });

  it("does not add extra empty paragraphs", () => {
    editor = createDescriptionEditor({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "A" }] },
        { type: "paragraph", content: [{ type: "text", text: "B" }] },
      ],
    });

    setCursorInTopLevelBlock(editor, 1);

    for (let i = 0; i < 3; i++) {
      applyMove(editor, "up");
      applyMove(editor, "down");
    }

    expect(getTopLevelBlockTexts(editor.state.doc)).toEqual(["A", "B"]);
    expect(editor.state.doc.childCount).toBe(2);
  });

  it("works through moveBlock wrapper", () => {
    editor = createDescriptionEditor({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "A" }] },
        { type: "paragraph", content: [{ type: "text", text: "B" }] },
      ],
    });

    setCursorInTopLevelBlock(editor, 1);
    expect(moveBlock(editor, "up")).toBe(true);

    expect(getTopLevelBlockTexts(editor.state.doc)).toEqual(["B", "A"]);
  });
});
