import { useCallback, useEffect, useRef, useState } from "react";

/** Attribute that marks an element as a drop target; its value is the group name */
export const DROP_ATTR = "data-drop-group";

const HOLD_MS = 300;
/** finger movement that cancels the hold, so the page can still be scrolled */
const TOUCH_SLOP = 10;
/** with a mouse, moving the pressed chip starts dragging right away */
const MOUSE_SLOP = 6;
/** distance from the viewport edge where the page scrolls while dragging */
const EDGE = 72;

export type GroupDrag = {
  id: string;
  x: number;
  y: number;
  over: string | null;
};

type Pending = {
  id: string;
  pointerId: number;
  mouse: boolean;
  startX: number;
  startY: number;
  x: number;
  y: number;
  timer: number;
  scroller: HTMLElement | null;
};

function groupAt(x: number, y: number): string | null {
  const el = document.elementFromPoint(x, y);
  return el?.closest(`[${DROP_ATTR}]`)?.getAttribute(DROP_ATTR) ?? null;
}

/** nearest vertically scrollable ancestor, null means the window scrolls */
function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      node.scrollHeight > node.clientHeight
    )
      return node;
  }
  return null;
}

/**
 * Press-and-hold drag of player chips between groups, for touch and mouse.
 * On touch the finger has to stay still during the hold, otherwise it is a normal
 * scroll. While dragging the page auto-scrolls near the top and bottom edges.
 */
export function useGroupDrag(onDrop: (id: string, group: string) => void) {
  const [drag, setDrag] = useState<GroupDrag | null>(null);
  const dragRef = useRef<GroupDrag | null>(null);
  const pendingRef = useRef<Pending | null>(null);
  const scrollerRef = useRef<HTMLElement | null>(null);
  const suppressClickRef = useRef(false);
  const onDropRef = useRef(onDrop);

  useEffect(() => {
    onDropRef.current = onDrop;
  });

  const update = useCallback((next: GroupDrag | null) => {
    dragRef.current = next;
    setDrag(next);
  }, []);

  const clearPending = useCallback(() => {
    if (pendingRef.current) window.clearTimeout(pendingRef.current.timer);
    pendingRef.current = null;
  }, []);

  const begin = useCallback(
    (p: Pending) => {
      clearPending();
      scrollerRef.current = p.scroller;
      suppressClickRef.current = true;
      navigator.vibrate?.(15);
      update({ id: p.id, x: p.x, y: p.y, over: groupAt(p.x, p.y) });
    },
    [clearPending, update],
  );

  const moveTo = useCallback(
    (x: number, y: number) => {
      const current = dragRef.current;
      if (current) update({ ...current, x, y, over: groupAt(x, y) });
    },
    [update],
  );

  const finish = useCallback(
    (drop: boolean) => {
      const current = dragRef.current;
      if (!current) return;
      update(null);
      if (drop && current.over) onDropRef.current(current.id, current.over);
      // the click fired after pointerup must not select the chip
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    },
    [update],
  );

  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      if (dragRef.current) {
        if (e.pointerType === "mouse") moveTo(e.clientX, e.clientY);
        return;
      }
      const p = pendingRef.current;
      if (!p || p.pointerId !== e.pointerId) return;
      p.x = e.clientX;
      p.y = e.clientY;
      const moved = Math.hypot(p.x - p.startX, p.y - p.startY);
      if (p.mouse && moved > MOUSE_SLOP) begin(p);
      else if (!p.mouse && moved > TOUCH_SLOP) clearPending();
    }
    function onPointerUp(e: PointerEvent) {
      clearPending();
      if (e.pointerType === "mouse") finish(true);
    }
    function onPointerCancel(e: PointerEvent) {
      clearPending();
      // touch drags are driven by the touch events below
      if (e.pointerType === "mouse") finish(false);
    }
    function onTouchMove(e: TouchEvent) {
      if (!dragRef.current) return;
      e.preventDefault(); // keep the page still under the finger
      const t = e.touches[0];
      if (t) moveTo(t.clientX, t.clientY);
    }
    function onTouchEnd(e: TouchEvent) {
      clearPending();
      if (!dragRef.current) return;
      if (e.cancelable) e.preventDefault(); // no emulated click after a drop
      finish(e.type === "touchend");
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") finish(false);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: false });
    window.addEventListener("touchcancel", onTouchEnd);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      clearPending();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [begin, clearPending, finish, moveTo]);

  // auto-scroll near the viewport edges while dragging
  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;
    let frame = 0;
    const tick = () => {
      const current = dragRef.current;
      if (!current) return;
      const height = window.innerHeight;
      let dy = 0;
      if (current.y < EDGE) dy = -(EDGE - current.y) / 4;
      else if (current.y > height - EDGE)
        dy = (current.y - (height - EDGE)) / 4;
      if (dy !== 0) {
        const scroller = scrollerRef.current;
        if (scroller) scroller.scrollTop += dy;
        else window.scrollBy(0, dy);
        const over = groupAt(current.x, current.y);
        if (over !== current.over) update({ ...current, over });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [dragging, update]);

  const chipProps = useCallback(
    (id: string) => ({
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
        if (e.button !== 0 || dragRef.current) return;
        clearPending();
        const p: Pending = {
          id,
          pointerId: e.pointerId,
          mouse: e.pointerType === "mouse",
          startX: e.clientX,
          startY: e.clientY,
          x: e.clientX,
          y: e.clientY,
          timer: 0,
          scroller: scrollParent(e.currentTarget),
        };
        p.timer = window.setTimeout(() => begin(p), HOLD_MS);
        pendingRef.current = p;
      },
      // a long press opens the context menu on Android and in desktop browsers
      onContextMenu: (e: React.MouseEvent) => {
        if (pendingRef.current || dragRef.current) e.preventDefault();
      },
    }),
    [begin, clearPending],
  );

  /** true when the click belongs to a just finished drag and must be ignored */
  const consumeClick = useCallback(() => {
    if (!suppressClickRef.current) return false;
    suppressClickRef.current = false;
    return true;
  }, []);

  return { drag, chipProps, consumeClick };
}
