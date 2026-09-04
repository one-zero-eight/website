/**
 * "You are here" marker, drawn in the map SVG's user-space so it pans and zooms
 * together with the floor plan. Rendered into an overlay <svg> that shares the
 * map's viewBox (see MapViewer).
 */
export function UserLocationMarker({
  x,
  y,
  accuracyUnits,
  heading,
}: {
  x: number;
  y: number;
  /** GPS accuracy radius, already converted to SVG user-units. */
  accuracyUnits: number;
  heading: number | null;
}) {
  return (
    <g
      pointerEvents="none"
      style={{
        transform: `translate(${x}px, ${y}px)`,
        transition: "transform 0.6s ease-out",
      }}
    >
      {accuracyUnits > 0 && (
        <circle
          cx={0}
          cy={0}
          r={accuracyUnits}
          className="fill-primary stroke-primary"
          fillOpacity={0.12}
          strokeOpacity={0.3}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
          style={{ transition: "r 0.6s ease-out" }}
        />
      )}

      {/* Expanding pulse */}
      <circle cx={0} cy={0} r={26} className="fill-primary" fillOpacity={0.4}>
        <animate
          attributeName="r"
          values="20;70"
          dur="1.8s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="fill-opacity"
          values="0.4;0"
          dur="1.8s"
          repeatCount="indefinite"
        />
      </circle>

      {/* Solid dot with a light outline for contrast on any background */}
      <circle
        cx={0}
        cy={0}
        r={34}
        className="fill-base-100"
        stroke="white"
        strokeWidth={3}
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={0} cy={0} r={22} className="fill-primary" />

      {heading != null && (
        <path
          d="M 0 -62 L -16 -30 L 16 -30 Z"
          className="fill-primary"
          transform={`rotate(${heading})`}
          style={{ transition: "transform 0.6s ease-out" }}
        />
      )}
    </g>
  );
}
