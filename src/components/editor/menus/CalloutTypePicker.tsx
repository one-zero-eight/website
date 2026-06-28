import { calloutTypes } from "@/components/editor/extensions/Callout.ts";
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

export function CalloutTypePicker({ editor }: { editor: Editor }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const editorState = useEditorState({
    editor,
    selector: (ctx) => {
      return {
        isCallout: ctx.editor.isActive("callout") ?? false,
        calloutType: ctx.editor.getAttributes("callout").type || "note",
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

  function handleSelect(type: string, index: number) {
    if (editorState.isCallout) {
      editor.chain().focus().setCallout({ type }).run();
    } else {
      editor.chain().focus().setCallout({ type }).run();
    }
    setIsOpen(false);
    setActiveIndex(index);
  }

  const currentType =
    calloutTypes.find((t) => t.id === editorState.calloutType) ||
    calloutTypes[0];

  return (
    <div className="relative">
      <li>
        <button
          type="button"
          ref={refs.setReference}
          {...getReferenceProps({
            onMouseDown: (event) => event.preventDefault(),
          })}
          className={cn(
            "btn btn-sm btn-ghost flex items-center gap-1",
            isOpen && "btn-active",
          )}
          title="Callout"
        >
          <span className={cn("shrink-0 text-sm", currentType.icon)} />
          <span>{currentType.menuLabel}</span>
          <span
            className={cn(
              "shrink-0 text-lg transition-transform",
              "icon-[material-symbols--arrow-drop-down]",
              isOpen && "rotate-180",
            )}
          />
        </button>
      </li>

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
              className="border-base-300 bg-base-200 rounded-field z-50 mt-1 max-h-64 overflow-y-auto border shadow-lg"
              {...getFloatingProps()}
            >
              {calloutTypes.map((type, index) => (
                <div
                  key={type.id}
                  ref={(node) => {
                    listRef.current[index] = node;
                  }}
                  role="option"
                  tabIndex={index === activeIndex ? 0 : -1}
                  className={cn(
                    "hover:bg-base-300 flex cursor-pointer items-center gap-2 px-3 py-2 transition-colors",
                    type.id === editorState.calloutType &&
                      "bg-primary/20 text-primary",
                  )}
                  {...getItemProps({
                    onClick: () => handleSelect(type.id, index),
                    onKeyDown(event) {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleSelect(type.id, index);
                      }
                    },
                  })}
                >
                  <span className={cn("shrink-0", type.icon)} />
                  <span>{type.menuLabel}</span>
                </div>
              ))}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </div>
  );
}
