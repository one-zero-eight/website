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

type BlockType = {
  id: string;
  label: string;
  icon: string;
  action: (editor: Editor) => void;
  isActive: (editor: Editor) => boolean;
};

const blockTypes: BlockType[] = [
  {
    id: "paragraph",
    label: "Text",
    icon: "icon-[material-symbols--text-fields]",
    action: (ed) => ed.chain().focus().setParagraph().run(),
    isActive: (ed) => ed.isActive("paragraph") ?? false,
  },
  {
    id: "heading1",
    label: "Heading 1",
    icon: "icon-[material-symbols--format-h1]",
    action: (ed) => ed.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: (ed) => ed.isActive("heading", { level: 1 }) ?? false,
  },
  {
    id: "heading2",
    label: "Heading 2",
    icon: "icon-[material-symbols--format-h2]",
    action: (ed) => ed.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: (ed) => ed.isActive("heading", { level: 2 }) ?? false,
  },
  {
    id: "heading3",
    label: "Heading 3",
    icon: "icon-[material-symbols--format-h3]",
    action: (ed) => ed.chain().focus().toggleHeading({ level: 3 }).run(),
    isActive: (ed) => ed.isActive("heading", { level: 3 }) ?? false,
  },
  {
    id: "blockquote",
    label: "Quote",
    icon: "icon-[material-symbols--format-quote]",
    action: (ed) => ed.chain().focus().toggleBlockquote().run(),
    isActive: (ed) => ed.isActive("blockquote") ?? false,
  },
  {
    id: "codeBlock",
    label: "Code",
    icon: "icon-[material-symbols--code-blocks]",
    action: (ed) => ed.chain().focus().toggleCodeBlock().run(),
    isActive: (ed) => ed.isActive("codeBlock") ?? false,
  },
  {
    id: "bulletList",
    label: "Bullet list",
    icon: "icon-[material-symbols--format-list-bulleted]",
    action: (ed) => ed.chain().focus().toggleBulletList().run(),
    isActive: (ed) => ed.isActive("bulletList") ?? false,
  },
  {
    id: "orderedList",
    label: "Number list",
    icon: "icon-[material-symbols--format-list-numbered]",
    action: (ed) => ed.chain().focus().toggleOrderedList().run(),
    isActive: (ed) => ed.isActive("orderedList") ?? false,
  },
  {
    id: "details",
    label: "Toggle",
    icon: "icon-[material-symbols--expand-more]",
    action: (ed) => {
      if (ed.isActive("details")) {
        ed.chain().focus().unsetDetails().run();
      } else {
        ed.chain().focus().setDetails().run();
      }
    },
    isActive: (ed) => ed.isActive("details") ?? false,
  },
  {
    id: "callout",
    label: "Callout",
    icon: "icon-[material-symbols--info-outline-rounded]",
    action: (ed) => {
      if (ed.isActive("callout")) {
        ed.chain().focus().unsetCallout().run();
      } else {
        ed.chain().focus().setCallout({ type: "note" }).run();
      }
    },
    isActive: (ed) => ed.isActive("callout") ?? false,
  },
  {
    id: "table",
    label: "Table",
    icon: "icon-[material-symbols--table]",
    action: (ed) => {
      if (ed.isActive("table")) {
        return;
      }
      ed.chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
    },
    isActive: (ed) => ed.isActive("table") ?? false,
  },
  {
    id: "image",
    label: "Image",
    icon: "icon-[material-symbols--image]",
    action: (ed) => {
      ed.chain()
        .focus()
        .insertContent({ type: "imageUploadPlaceholder" })
        .run();
    },
    isActive: (ed) => ed.isActive("imageWithCaption") ?? false,
  },
];

export function BlockTypeDropdown({ editor }: { editor: Editor }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const activeBlockTypes = useEditorState({
    editor,
    selector: (ctx) => {
      return Object.fromEntries(
        blockTypes.map((type) => [type.id, type.isActive(ctx.editor)]),
      );
    },
  });

  const activeBlockType =
    blockTypes.find(
      (type) => activeBlockTypes[type.id] && type.id !== "paragraph",
    ) || blockTypes[0];

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

  function handleSelect(type: BlockType, index: number) {
    type.action(editor);
    setIsOpen(false);
    setActiveIndex(index);
  }

  return (
    <div className="relative">
      <button
        type="button"
        ref={refs.setReference}
        {...getReferenceProps()}
        className={cn(
          "btn btn-sm btn-ghost flex items-center gap-1",
          isOpen && "btn-active",
        )}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className="line-clamp-1">{activeBlockType?.label || "Text"}</span>
        <span
          className={cn(
            "shrink-0 text-lg transition-transform",
            "icon-[material-symbols--arrow-drop-down]",
            isOpen && "rotate-180",
          )}
        />
      </button>

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
              {blockTypes.map((type, index) => (
                <div
                  key={type.id}
                  ref={(node) => {
                    listRef.current[index] = node;
                  }}
                  role="option"
                  tabIndex={index === activeIndex ? 0 : -1}
                  aria-selected={activeBlockTypes[type.id]}
                  className={cn(
                    "hover:bg-base-300 flex cursor-pointer items-center gap-2 px-3 py-2 transition-colors",
                    activeBlockTypes[type.id] && "bg-primary/20 text-primary",
                  )}
                  {...getItemProps({
                    onClick: () => handleSelect(type, index),
                    onKeyDown(event) {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleSelect(type, index);
                      }
                    },
                  })}
                >
                  <span className={cn("shrink-0 text-lg", type.icon)} />
                  <span className="whitespace-nowrap">{type.label}</span>
                </div>
              ))}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </div>
  );
}
