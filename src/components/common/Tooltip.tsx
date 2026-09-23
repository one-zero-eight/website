import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
  useTransitionStyles,
} from "@floating-ui/react";
import React, { useState } from "react";

export default function Tooltip({
  children,
  content,
  className,
  trigger = "hover",
}: {
  children: React.ReactNode;
  content: React.ReactNode;
  /** Extra classes for the wrapper, e.g. to keep a flex parent's sizing. */
  className?: string;
  /**
   * "hover" (default) shows on hover/focus, and a press dismisses it.
   * "press" shows on press instead, which is the only thing that works on
   * touch. The two cannot be combined: dismiss-on-reference-press is what
   * makes a press close a hover tooltip, and it would immediately swallow the
   * press that opened a click-triggered one.
   */
  trigger?: "hover" | "press";
}) {
  const openOnPress = trigger === "press";
  const [isOpen, setIsOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    whileElementsMounted: autoUpdate,
    middleware: [offset(5), flip(), shift()],
  });

  // Transition effect
  const { isMounted, styles: transitionStyles } = useTransitionStyles(context, {
    duration: 50,
  });

  // Event listeners to change the open state
  const hover = useHover(context, { move: false, enabled: !openOnPress });
  const focus = useFocus(context);
  const click = useClick(context, { toggle: openOnPress });
  const dismiss = useDismiss(context, { referencePress: !openOnPress });
  // Role props for screen readers
  const role = useRole(context, { role: "tooltip" });

  // Merge all the interactions into prop getters
  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    click,
    dismiss,
    role,
  ]);

  if (content === undefined) {
    return <>{children}</>;
  }

  return (
    <>
      <span
        ref={refs.setReference}
        className={`inline-flex items-center leading-none${className ? ` ${className}` : ""}`}
        {...getReferenceProps()}
      >
        {children}
      </span>

      {isMounted && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={{ ...floatingStyles, ...transitionStyles }}
            {...getFloatingProps()}
            className={`bg-base-200 text-base-content z-[100] rounded-xl px-4 py-2 text-sm drop-shadow-md${
              openOnPress ? "" : "pointer-events-none"
            }`}
          >
            {content}
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
