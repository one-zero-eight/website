import type { Editor } from "@tiptap/core";
import { Slice } from "@tiptap/pm/model";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDescriptionEditor } from "@/components/editor/test-utils/createDescriptionEditor";
import { getEditorImageHandlers } from "@/components/editor/utils/getEditorImageHandlers";

function pasteFile(editor: Editor, file: File) {
  const event = {
    clipboardData: {
      items: [{ type: file.type, getAsFile: () => file }],
      getData: () => "",
    },
  } as unknown as ClipboardEvent;

  return editor.view.someProp("handlePaste", (handlePaste) =>
    handlePaste(editor.view, event, Slice.empty),
  );
}

function getImages(editor: Editor) {
  const images: Record<string, unknown>[] = [];
  editor.state.doc.descendants((node) => {
    if (node.type.name === "image") {
      images.push(node.attrs);
    }
  });
  return images;
}

function getPlaceholderPos(editor: Editor) {
  let position: number | undefined;
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "imageUploadPlaceholder") {
      position = pos;
    }
  });
  return position;
}

describe("image resizing", () => {
  let editor: Editor;

  beforeEach(() => {
    editor = createDescriptionEditor(`
      <p>Text before images</p>
      <figure data-type="image">
        <img src="/first.png" alt="First image" width="640" height="480"
          data-original-width="640" data-original-height="480" />
        <figcaption>First caption</figcaption>
      </figure>
      <figure data-type="image">
        <img src="/second.png" width="640" height="480"
          data-original-width="640" data-original-height="480" />
        <figcaption>Second caption</figcaption>
      </figure>
    `);
  });

  afterEach(() => {
    editor.destroy();
    vi.restoreAllMocks();
  });

  it.each(["caption", "paragraph"])(
    "persists resized dimensions with the cursor in a %s",
    (selectionNodeType) => {
      let selectionPos: number | undefined;
      editor.state.doc.descendants((node, pos) => {
        if (
          node.type.name === selectionNodeType &&
          selectionPos === undefined
        ) {
          selectionPos = pos + 1;
        }
      });
      editor.commands.setTextSelection(selectionPos!);
      const onUpdate = vi.fn();
      editor.on("update", onUpdate);
      const originalImages = getImages(editor);
      const image = editor.view.dom.querySelector("img")!;
      vi.spyOn(image, "offsetWidth", "get").mockReturnValue(640);
      vi.spyOn(image, "offsetHeight", "get").mockReturnValue(480);
      const handle = editor.view.dom.querySelector(
        '[data-resize-handle="right"]',
      )!;

      handle.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, clientX: 640 }),
      );
      document.dispatchEvent(new MouseEvent("mousemove", { clientX: 320 }));
      document.dispatchEvent(new MouseEvent("mouseup"));

      expect(getImages(editor)).toEqual([
        { ...originalImages[0], width: 320, height: 240 },
        originalImages[1],
      ]);
      expect(onUpdate).toHaveBeenCalledTimes(1);
      expect(editor.state.selection.from).toBe(selectionPos);
      const savedContent = editor.getJSON();

      editor.commands.undo();
      expect(getImages(editor)).toEqual(originalImages);
      editor.commands.redo();
      expect(editor.getJSON()).toEqual(savedContent);

      editor.destroy();
      editor = createDescriptionEditor(savedContent);
      expect(getImages(editor)[0]).toMatchObject({
        width: 320,
        height: 240,
        originalWidth: 640,
        originalHeight: 480,
      });
      expect(editor.view.dom.querySelector("img")!.style.width).toBe("320px");
      editor.state.doc.check();
    },
  );
});

describe("image clipboard uploads", () => {
  let editor: Editor;
  let resolveUpload: (imageId: string) => void;
  let rejectUpload: (error: Error) => void;
  let uploadImage: ReturnType<typeof vi.fn>;
  const file = new File(["image"], "pasted.png", { type: "image/png" });

  beforeEach(() => {
    vi.stubGlobal(
      "Image",
      class {
        naturalWidth = 640;
        naturalHeight = 480;
        onload: (() => void) | null = null;
        set src(_value: string) {
          queueMicrotask(() => this.onload?.());
        }
      },
    );
    editor = createDescriptionEditor("<p>Hello world</p>");
    uploadImage = vi.fn(
      () =>
        new Promise<string>((resolve, reject) => {
          resolveUpload = resolve;
          rejectUpload = reject;
        }),
    );
    Object.assign(getEditorImageHandlers(editor), {
      uploadImage,
      resolveImageUrl: (imageId: string) => `/images/${imageId}`,
    });
  });

  afterEach(() => {
    editor.destroy();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uploads the clipboard file and replaces the placeholder with an image and caption", async () => {
    editor.commands.setTextSelection(6);

    expect(pasteFile(editor, file)).toBe(true);
    expect(uploadImage).toHaveBeenCalledExactlyOnceWith(file);
    expect(getPlaceholderPos(editor)).toBeDefined();

    resolveUpload("uploaded-image");

    await vi.waitFor(() => {
      expect(getImages(editor)).toEqual([
        expect.objectContaining({
          imageId: "uploaded-image",
          src: null,
          alt: "pasted",
          width: 640,
          height: 480,
          originalWidth: 640,
          originalHeight: 480,
        }),
      ]);
    });
    expect(getPlaceholderPos(editor)).toBeUndefined();
    const figure = editor
      .getJSON()
      .content?.find((node) => node.type === "imageWithCaption");
    expect(figure?.content?.map((node) => node.type)).toEqual([
      "image",
      "caption",
    ]);
    expect(editor.state.doc.textContent).toBe("Hello world");
    editor.state.doc.check();
  });

  it("replaces the selected text when pasting an image", async () => {
    editor.commands.setTextSelection({ from: 1, to: 6 });
    pasteFile(editor, file);
    resolveUpload("uploaded-image");

    await vi.waitFor(() => expect(getImages(editor)).toHaveLength(1));
    expect(editor.state.doc.textContent).toBe(" world");
    editor.state.doc.check();
  });

  it("finds the placeholder after edits move it during upload", async () => {
    pasteFile(editor, file);
    editor.commands.insertContentAt(0, "<p>Inserted before upload</p>");
    resolveUpload("uploaded-image");

    await vi.waitFor(() => expect(getImages(editor)).toHaveLength(1));
    expect(editor.state.doc.firstChild?.textContent).toBe(
      "Inserted before upload",
    );
    expect(editor.state.doc.textContent).toContain("Hello world");
    expect(getPlaceholderPos(editor)).toBeUndefined();
    editor.state.doc.check();
  });

  it("does not overwrite content when the placeholder is deleted during upload", async () => {
    pasteFile(editor, file);
    const pos = getPlaceholderPos(editor)!;
    editor.commands.deleteRange({ from: pos, to: pos + 1 });
    const content = editor.getJSON();
    resolveUpload("uploaded-image");
    await uploadImage.mock.results[0].value;
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(editor.getJSON()).toEqual(content);
    expect(getImages(editor)).toHaveLength(0);
  });

  it("keeps concurrent uploads attached to their own placeholders", async () => {
    pasteFile(editor, file);
    const resolveFirst = resolveUpload;
    const secondFile = new File(["second image"], "second.png", {
      type: "image/png",
    });
    pasteFile(editor, secondFile);

    resolveUpload("second-image");
    await vi.waitFor(() => expect(getImages(editor)).toHaveLength(1));
    resolveFirst("first-image");

    await vi.waitFor(() => expect(getImages(editor)).toHaveLength(2));
    expect(
      getImages(editor).map(({ imageId, alt }) => ({ imageId, alt })),
    ).toEqual([
      { imageId: "first-image", alt: "pasted" },
      { imageId: "second-image", alt: "second" },
    ]);
    expect(getPlaceholderPos(editor)).toBeUndefined();
    editor.state.doc.check();
  });

  it("does not update a destroyed editor after upload", async () => {
    pasteFile(editor, file);
    editor.destroy();
    resolveUpload("uploaded-image");
    await uploadImage.mock.results[0].value;

    expect(getImages(editor)).toHaveLength(0);
  });

  it("resets the placeholder and reports upload errors", async () => {
    const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    pasteFile(editor, file);
    rejectUpload(new Error("Upload failed"));

    await vi.waitFor(() =>
      expect(alert).toHaveBeenCalledWith("Failed to upload image"),
    );
    const pos = getPlaceholderPos(editor)!;
    expect(editor.state.doc.nodeAt(pos)?.attrs.uploadId).toBeNull();
    expect(getImages(editor)).toHaveLength(0);
  });

  it("ignores non-image clipboard files", () => {
    const content = editor.getJSON();
    expect(
      pasteFile(editor, new File(["text"], "note.txt", { type: "text/plain" })),
    ).toBeFalsy();
    expect(uploadImage).not.toHaveBeenCalled();
    expect(editor.getJSON()).toEqual(content);
  });

  it("does not upload in a read-only editor", () => {
    editor.setEditable(false);
    expect(pasteFile(editor, file)).toBeFalsy();
    expect(uploadImage).not.toHaveBeenCalled();
  });
});
