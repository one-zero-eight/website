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
          style={{ transition: "r 0.6s ease-out" }}
        />
      )}

      {/* Icon shapes counter-scaled against map zoom so they stay a sensible
          screen size instead of growing huge as the user zooms in. */}
      <g
        style={{
          transform: "scale(clamp(0.4, calc(1 / var(--map-zoom, 1)), 1.2))",
          transition: "transform 0.15s ease-out",
        }}
      >
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

        {/* Solid dot with a light outline for contrast on any background.
            Already inside the counter-scaled group above, so its stroke
            stays a constant screen width without needing vector-effect. */}
        <circle
          cx={0}
          cy={0}
          r={34}
          className="fill-base-100"
          stroke="white"
          strokeWidth={3}
        />
        <circle cx={0} cy={0} r={22} className="fill-primary" />

        {heading != null && (
          <path
            d="M 0 -62 L -16 -30 L 16 -30 Z"
            className="fill-primary"
            style={{
              // Counter-rotate against the map's own rotation so the arrow keeps
              // pointing the correct real-world direction regardless of bearing.
              transform: `rotate(calc(${heading}deg - 1deg * var(--map-bearing, 0)))`,
              transition: "transform 0.6s ease-out",
            }}
          />
        )}
      </g>
    </g>
  );
}
