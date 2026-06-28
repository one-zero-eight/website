import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import { useRef, useState } from "react";
import { BubbleMenuButton } from "./BubbleMenuContent";

export function LinkButton({ editor }: { editor: Editor }) {
  const [isOpen, setIsOpen] = useState(false);
  const textInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");

  const editorState = useEditorState({
    editor,
    selector: (ctx) => {
      return {
        canLink: ctx.editor.can().toggleLink(),
        isLink: ctx.editor.isActive("link") ?? false,
        linkUrl: ctx.editor.getAttributes("link").href || "",
      };
    },
  });

  const { refs, context, x, y, strategy } = useFloating({
    placement: "bottom-start",
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [offset(4), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  function handleOpen() {
    console.log(editor.getAttributes("link"));
    setUrl(editor.getAttributes("link")?.href || "");
    setText(
      editor.state.doc.textBetween(
        editor.state.selection.from,
        editor.state.selection.to,
      ) || "",
    );
    setIsOpen(true);
  }

  function handleSetLink() {
    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setIsOpen(false);
      return;
    }

    // Apply link to selected text or insert link with custom text
    if (editor.state.selection.empty) {
      const linkText = text || url;
      editor
        .chain()
        .focus()
        .insertContent(`<a href="${url}">${linkText}</a>`)
        .run();
    } else {
      // If text is provided and different from selected text, replace selection with new text
      if (
        text &&
        text !==
          editor.state.doc.textBetween(
            editor.state.selection.from,
            editor.state.selection.to,
          )
      ) {
        editor
          .chain()
          .focus()
          .deleteSelection()
          .insertContent(`<a href="${url}">${text}</a>`)
          .run();
      } else {
        editor.chain().focus().setLink({ href: url }).run();
      }
    }
    setIsOpen(false);
    setUrl("");
    setText("");
  }

  function handleRemoveLink() {
    editor.chain().focus().unsetLink().run();
    setIsOpen(false);
    setUrl("");
    setText("");
  }

  return (
    <div className="relative">
      <BubbleMenuButton
        isActive={editorState.isLink}
        isDisabled={!editorState.canLink}
        onClick={handleOpen}
        title="Link"
        iconClassName="icon-[material-symbols--link]"
        ref={refs.setReference}
        {...getReferenceProps()}
      />

      {isOpen && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={refs.setFloating}
              style={{
                position: strategy,
                top: y ?? 0,
                left: x ?? 0,
              }}
              className="border-base-300 bg-base-200 rounded-field z-50 mt-1 w-80 border p-3 shadow-lg"
              {...getFloatingProps()}
            >
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">Text</label>
                  <input
                    ref={textInputRef}
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Link text"
                    className="input input-sm border-base-300 bg-base-100"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        urlInputRef.current?.focus();
                      }
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">URL</label>
                  <input
                    ref={urlInputRef}
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="input input-sm border-base-300 bg-base-100"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSetLink();
                      }
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSetLink}
                    className="btn btn-sm btn-primary flex-1"
                  >
                    {editorState.isLink ? "Update" : "Add"} Link
                  </button>
                  {editorState.isLink && (
                    <button
                      type="button"
                      onClick={handleRemoveLink}
                      className="btn btn-sm btn-ghost"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </div>
  );
}
