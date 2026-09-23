import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  shift,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { BubbleMenuButton } from "./BubbleMenuContent";

export function LinkButton({ editor }: { editor: Editor }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const editorState = useEditorState({
    editor,
    selector: ({ editor }) => ({
      canLink: editor.can().toggleLink(),
      isLink: editor.isActive("link"),
    }),
  });

  return (
    <BubbleMenuButton
      isActive={editorState.isLink}
      isDisabled={!editorState.canLink}
      title="Link"
      iconClassName="icon-[material-symbols--link]"
      ref={buttonRef}
      onClick={() =>
        editor.emit("openLinkDialog", {
          editor,
          reference: buttonRef.current ?? undefined,
        })
      }
    />
  );
}

export function LinkDialog({ editor }: { editor: Editor }) {
  const [isOpen, setIsOpen] = useState(false);
  const textInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const clipboardRequestRef = useRef(0);

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
    onOpenChange: handleOpenChange,
    middleware: [offset(4), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  const handleOpenLinkDialog = useEffectEvent(
    ({ reference }: { reference?: HTMLButtonElement }) => {
      refs.setReference(reference ?? editor.view.dom);
      void handleOpenChange(true);
    },
  );

  useEffect(() => {
    editor.on("openLinkDialog", handleOpenLinkDialog);
    return () => {
      editor.off("openLinkDialog", handleOpenLinkDialog);
    };
  }, [editor]);

  const dismiss = useDismiss(context);
  const role = useRole(context);

  const { getFloatingProps } = useInteractions([dismiss, role]);

  async function handleOpenChange(open: boolean) {
    const clipboardRequest = ++clipboardRequestRef.current;
    setIsOpen(open);
    if (!open) return;

    const linkUrl = editor.getAttributes("link").href || "";
    const { from, to } = editor.state.selection;
    setUrl(linkUrl);
    setText(editor.state.doc.textBetween(from, to));

    if (linkUrl) return;

    try {
      const clipboardText = (await navigator.clipboard.readText()).trim();
      const clipboardUrl = new URL(clipboardText);
      if (
        clipboardRequest === clipboardRequestRef.current &&
        ["http:", "https:"].includes(clipboardUrl.protocol)
      ) {
        setUrl(clipboardText);
      }
    } catch {
      // Clipboard access may be denied or its contents may not be a URL.
    }
  }

  function handleSetLink() {
    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      void handleOpenChange(false);
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
    void handleOpenChange(false);
    setUrl("");
    setText("");
  }

  function handleRemoveLink() {
    editor.chain().focus().unsetLink().run();
    void handleOpenChange(false);
    setUrl("");
    setText("");
  }

  return (
    <>
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
                    onChange={(e) => {
                      clipboardRequestRef.current++;
                      setUrl(e.target.value);
                    }}
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
    </>
  );
}
