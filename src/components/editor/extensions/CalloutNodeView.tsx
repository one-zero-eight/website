import {
  CalloutId,
  CalloutType,
  calloutTypes,
} from "@/components/editor/extensions/Callout.ts";
import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import type { ReactNodeViewProps } from "@tiptap/react";
import { cn } from "@/lib/ui/cn";
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import { memo, useRef, useState } from "react";

const CalloutContent = memo(function CalloutContent() {
  return (
    <div className="min-w-0 flex-1">
      <NodeViewContent />
    </div>
  );
});

export const CalloutNodeView = memo(
  function CalloutNodeView({
    node,
    updateAttributes,
    editor,
  }: ReactNodeViewProps) {
    const calloutTypeId = node.attrs.type || "note";
    const calloutType =
      calloutTypes.find((t) => t.id === calloutTypeId) || calloutTypes[0];

    return (
      <NodeViewWrapper className="my-4">
        <div
          className={cn(
            "border-base-300 rounded-field border-l-4 p-4",
            calloutType.color,
          )}
          data-type="callout"
          data-callout-type={calloutTypeId}
        >
          <div className="flex flex-col gap-2">
            {editor.isEditable ? (
              <CalloutTypeHeader
                calloutType={calloutType}
                setType={(type) => updateAttributes({ type })}
              />
            ) : (
              <StaticCalloutHeader calloutType={calloutType} />
            )}
            <CalloutContent />
          </div>
        </div>
      </NodeViewWrapper>
    );
  },
  (prev, next) =>
    prev.node.eq(next.node) &&
    prev.editor.isEditable === next.editor.isEditable,
);

function StaticCalloutHeader({ calloutType }: { calloutType: CalloutType }) {
  return (
    <div className="flex shrink-0 items-center gap-2 text-xl select-none">
      <span className={cn("text-xl", calloutType.icon)} />
      <span className="text-sm font-medium">{calloutType.label}</span>
    </div>
  );
}

function CalloutTypeHeader({
  calloutType,
  setType,
}: {
  calloutType: CalloutType;
  setType: (type: CalloutId) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const activeIndexRef = useRef<number | null>(null);

  const { refs, context, x, y, strategy } = useFloating({
    placement: "bottom-start",
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [offset(4), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "listbox" });

  const { getFloatingProps, getItemProps } = useInteractions([dismiss, role]);

  function handleSelect(type: CalloutId, index: number) {
    setType(type);
    setIsOpen(false);
    activeIndexRef.current = index;
  }

  return (
    <div
      className="relative flex shrink-0 items-center"
      contentEditable={false}
      data-callout-picker=""
    >
      <button
        type="button"
        ref={refs.setReference}
        data-callout-picker=""
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsOpen((open) => !open);
        }}
        className={cn(
          "flex cursor-pointer items-center justify-center gap-2 text-xl select-none hover:opacity-70",
          isOpen && "opacity-70",
        )}
        title="Change callout type"
      >
        <span className={cn("text-xl", calloutType.icon)} />
        <span className="text-sm font-medium">{calloutType.label}</span>
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
          <div
            ref={refs.setFloating}
            data-callout-picker=""
            style={{
              position: strategy,
              top: y ?? 0,
              left: x ?? 0,
              width: "max-content",
              minWidth: "150px",
              zIndex: 9999,
            }}
            className="border-base-300 bg-base-200 rounded-field mt-1 max-h-64 overflow-auto border shadow-lg"
            contentEditable={false}
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            {...getFloatingProps()}
          >
            {calloutTypes.map((type, index) => {
              const isActive = type.id === calloutType.id;
              return (
                <div
                  key={type.id}
                  role="option"
                  tabIndex={index === activeIndexRef.current ? 0 : -1}
                  aria-selected={isActive}
                  className={cn(
                    "hover:bg-base-300 flex cursor-pointer items-center gap-2 px-3 py-2 transition-colors",
                    isActive && "bg-primary/20 text-primary",
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
                  <span className={type.icon} />
                  <span>{type.menuLabel}</span>
                </div>
              );
            })}
          </div>
        </FloatingPortal>
      )}
    </div>
  );
}
