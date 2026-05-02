export function TimeGridSvg({
  scrollX,
  pixelsPerMinute,
  sidebarWidth,
  headerHeight,
  bodyHeight,
}: {
  scrollX: number;
  pixelsPerMinute: number;
  sidebarWidth: number;
  headerHeight: number;
  bodyHeight: number;
}) {
  const hourWidth = pixelsPerMinute * 60;
  const patternX = -(scrollX % hourWidth);

  return (
    <svg
      className="pointer-events-none absolute top-0 left-0 block"
      style={{
        top: headerHeight,
        left: sidebarWidth,
        width: `calc(100% - ${sidebarWidth}px)`,
        height: bodyHeight,
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id="rulers-pattern"
          x={patternX}
          y={0}
          width={hourWidth}
          height="100%"
          patternUnits="userSpaceOnUse"
        >
          {/* 0 min */}
          <rect x={0} y={0} height="100%" width={1} className="fill-base-300" />
          {/* 15 min */}
          <rect
            x={pixelsPerMinute * 15}
            y={0}
            height="100%"
            width={1}
            className="fill-base-200"
          />
          {/* 30 min */}
          <rect
            x={pixelsPerMinute * 30}
            y={0}
            height="100%"
            width={1}
            className="fill-base-300"
          />
          {/* 45 min */}
          <rect
            x={pixelsPerMinute * 45}
            y={0}
            height="100%"
            width={1}
            className="fill-base-200"
          />
        </pattern>
      </defs>
      <rect fill="url(#rulers-pattern)" width="100%" height="100%" />
    </svg>
  );
}
