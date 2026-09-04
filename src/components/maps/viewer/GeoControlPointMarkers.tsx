import { type GeoControlPoint } from "@/components/maps/georeference.ts";

/**
 * TEMPORARY / dev-only debug overlay: draws each SCENE_GEOREFERENCE control
 * point at its raw (x, y) SVG-viewBox coordinate, so calibration can be checked
 * by eye. Remove once calibration is confirmed.
 */
export function GeoControlPointMarkers({
  points,
}: {
  points: GeoControlPoint[];
}) {
  const color = "#f59e0b"; // amber-500, distinct from the primary "you are here" dot

  return (
    <g pointerEvents="none">
      {points.map((p, i) => (
        <g key={i}>
          <circle
            cx={p.x}
            cy={p.y}
            r={28}
            fill="none"
            stroke={color}
            strokeWidth={4}
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={p.x - 44}
            y1={p.y}
            x2={p.x + 44}
            y2={p.y}
            stroke={color}
            strokeWidth={3}
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={p.x}
            y1={p.y - 44}
            x2={p.x}
            y2={p.y + 44}
            stroke={color}
            strokeWidth={3}
            vectorEffect="non-scaling-stroke"
          />
          <text
            x={p.x + 34}
            y={p.y - 34}
            fontSize={40}
            fontFamily="sans-serif"
            fill={color}
            stroke="white"
            strokeWidth={0.5}
            paintOrder="stroke"
          >
            {`#${i}${p.label ? ` ${p.label}` : ""}`}
          </text>
        </g>
      ))}
    </g>
  );
}
