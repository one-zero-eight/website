export function TimelineOverlay({
  overlayRef,
  sidebarWidth,
  headerHeight,
}: {
  overlayRef: React.RefObject<HTMLDivElement | null>;
  sidebarWidth: number;
  headerHeight: number;
}) {
  return (
    <div
      ref={overlayRef}
      className="pointer-events-none absolute inset-0 shadow-[inset_0_0_6px_rgba(0,0,0,0.1)]"
      style={{
        left: sidebarWidth,
        top: headerHeight,
      }}
    />
  );
}
