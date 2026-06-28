import {
  HighlightColor,
  highlightColors,
} from "@/components/editor/extensions/Highlight.ts";
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
import { cn } from "@/lib/ui/cn";
import { useRef, useState } from "react";
import { BubbleMenuButton } from "./BubbleMenuContent";

export function HighlightColorPicker({ editor }: { editor: Editor }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const editorState = useEditorState({
    editor,
    selector: (ctx) => {
      const attrs = ctx.editor.getAttributes("highlight");
      return {
        highlightColorId: attrs.color || null,
        canHighlight: ctx.editor.can().toggleHighlight(),
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

  const listRef = useRef<Array<HTMLElement | null>>([]);

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "listbox" });

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions(
    [click, dismiss, role],
  );

  function handleSelect(color: HighlightColor, index: number) {
    if (color === "none") {
      editor.chain().focus().unsetHighlight().run();
    } else {
      editor.chain().focus().toggleHighlight({ color }).run();
    }
    setIsOpen(false);
    setActiveIndex(index);
  }

  const currentColor =
    highlightColors[editorState.highlightColorId as HighlightColor];

  return (
    <div className="relative">
      <BubbleMenuButton
        isDisabled={!editorState.canHighlight}
        onClick={() => setIsOpen((prev) => !prev)}
        title="Highlight"
        iconClassName="icon-[material-symbols--format-ink-highlighter-outline]"
        className={cn(
          isOpen && "btn-active",
          currentColor?.color &&
            "btn-active bg-(--mark-color)/20 dark:bg-(--mark-color-dark)/20",
        )}
        style={{
          // @ts-expect-error: Allow CSS custom properties for Tailwind 'bg-(--mark-color)' usage
          "--mark-color": currentColor?.color,
          "--mark-color-dark": currentColor?.darkColor,
        }}
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
              className="border-base-300 bg-base-200 rounded-field z-50 mt-1 grid grid-cols-4 gap-1 border p-2 shadow-lg"
              {...getFloatingProps()}
            >
              {Object.entries(highlightColors).map(
                ([_, colorOption], index) => (
                  <button
                    key={colorOption.id}
                    type="button"
                    ref={(node) => {
                      listRef.current[index] = node;
                    }}
                    role="option"
                    tabIndex={index === activeIndex ? 0 : -1}
                    aria-selected={
                      colorOption.id === editorState.highlightColorId
                    }
                    className={cn(
                      "ring-primary btn btn-square btn-sm border-2 border-transparent bg-(--mark-color) transition-all hover:ring dark:bg-(--mark-color-dark)",
                      colorOption.id === editorState.highlightColorId &&
                        "ring-2 hover:ring-2",
                    )}
                    style={{
                      // @ts-expect-error: Allow CSS custom properties for Tailwind 'bg-(--mark-color)' usage
                      "--mark-color": colorOption.color,
                      "--mark-color-dark": colorOption.darkColor,
                    }}
                    title={colorOption.label}
                    {...getItemProps({
                      onClick: () => handleSelect(colorOption.id, index),
                      onKeyDown(event) {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleSelect(colorOption.id, index);
                        }
                      },
                    })}
                  >
                    {colorOption.id === "none" ? (
                      <span className="icon-[material-symbols--cancel-outline] text-base-content text-lg" />
                    ) : (
                      "A"
                    )}
                  </button>
                ),
              )}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </div>
  );
}
