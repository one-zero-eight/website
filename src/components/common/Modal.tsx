import {
  FloatingNode,
  FloatingOverlay,
  FloatingPortal,
  FloatingTree,
  useDismiss,
  useFloating,
  useFloatingNodeId,
  useFloatingParentNodeId,
  useInteractions,
  useRole,
  useTransitionStyles,
} from "@floating-ui/react";
import { cn } from "@/lib/ui/cn";
import { useEffect, useRef } from "react";

export function Modal({
  open,
  onOpenChange,
  children,
  containerClassName,
  overlayClassName,
  title,
  hideHeader = false,
  closeOnOutsidePress = true,
}: React.PropsWithChildren<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  containerClassName?: string;
  overlayClassName?: string;
  title?: React.ReactNode;
  hideHeader?: boolean;
  closeOnOutsidePress?: boolean;
}>) {
  const parentId = useFloatingParentNodeId();

  // Root modals own a FloatingTree so nested modals (portaled) can
  // coordinate Escape / outside-press and only dismiss the topmost.
  if (parentId === null) {
    return (
      <FloatingTree>
        <ModalContent
          open={open}
          onOpenChange={onOpenChange}
          containerClassName={containerClassName}
          overlayClassName={overlayClassName}
          title={title}
          hideHeader={hideHeader}
          closeOnOutsidePress={closeOnOutsidePress}
        >
          {children}
        </ModalContent>
      </FloatingTree>
    );
  }

  return (
    <ModalContent
      open={open}
      onOpenChange={onOpenChange}
      containerClassName={containerClassName}
      overlayClassName={overlayClassName}
      title={title}
      hideHeader={hideHeader}
      closeOnOutsidePress={closeOnOutsidePress}
    >
      {children}
    </ModalContent>
  );
}

function ModalContent({
  open,
  onOpenChange,
  children,
  containerClassName,
  overlayClassName,
  title,
  hideHeader = false,
  closeOnOutsidePress = true,
}: React.PropsWithChildren<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  containerClassName?: string;
  overlayClassName?: string;
  title?: React.ReactNode;
  hideHeader?: boolean;
  closeOnOutsidePress?: boolean;
}>) {
  const nodeId = useFloatingNodeId();
  const parentId = useFloatingParentNodeId();
  const nested = parentId != null;

  const { context, refs } = useFloating({
    nodeId,
    open,
    onOpenChange,
  });
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const bodyOverflowRef = useRef<string | null>(null);

  const { isMounted, styles: transitionStyles } = useTransitionStyles(context, {
    duration: 50,
  });

  const dismiss = useDismiss(context, {
    outsidePress: closeOnOutsidePress,
    bubbles: false,
    capture: true,
  });
  const role = useRole(context);

  const { getFloatingProps } = useInteractions([dismiss, role]);

  // Cheap scroll lock: FloatingOverlay's lockScroll calls getBoundingClientRect
  // and forces a full reflow on large pages (e.g. timetable ~10k nodes).
  // Nested modals skip — the root modal already locked scroll.
  useEffect(() => {
    if (!isMounted || nested) return;

    bodyOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = bodyOverflowRef.current ?? "";
      bodyOverflowRef.current = null;
    };
  }, [isMounted, nested]);

  // Lightweight focus move/restore. Avoid FloatingFocusManager: its layout
  // effect runs tabbable's isHidden (getClientRects) and reflows the whole
  // document behind the modal.
  useEffect(() => {
    if (!isMounted) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const frame = requestAnimationFrame(() => {
      refs.floating.current?.focus({ preventScroll: true });
    });

    return () => {
      cancelAnimationFrame(frame);
      const previous = previousFocusRef.current;
      previousFocusRef.current = null;
      if (previous?.isConnected) {
        previous.focus({ preventScroll: true });
      }
    };
  }, [isMounted, refs]);

  return (
    <FloatingNode id={nodeId}>
      {isMounted ? (
        <FloatingPortal>
          <FloatingOverlay
            className={cn(
              "grid place-items-center bg-black/60 p-4",
              nested ? "z-20" : "z-10",
              overlayClassName,
            )}
            style={transitionStyles}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              ref={refs.setFloating}
              style={transitionStyles}
              {...getFloatingProps()}
              tabIndex={-1}
              className={cn(
                "@container/modal",
                "h-fit w-full max-w-lg",
                "flex flex-col gap-2 p-4",
                "bg-base-200 border-base-300 rounded-box border outline-hidden",
                containerClassName,
              )}
            >
              {!hideHeader && (
                <div className="flex gap-2">
                  {title && (
                    <div className="grow items-center overflow-hidden text-2xl font-semibold wrap-break-word">
                      {title}
                    </div>
                  )}
                  <button
                    type="button"
                    className="text-base-content/50 hover:bg-base-300/50 hover:text-base-content/75 rounded-box -mt-2 -mr-2 ml-auto flex h-12 w-12 shrink-0 items-center justify-center outline-white dark:outline-black"
                    onClick={() => onOpenChange(false)}
                  >
                    <span className="icon-[material-symbols--close] text-2xl" />
                  </button>
                </div>
              )}

              {children}
            </div>
          </FloatingOverlay>
        </FloatingPortal>
      ) : null}
    </FloatingNode>
  );
}
