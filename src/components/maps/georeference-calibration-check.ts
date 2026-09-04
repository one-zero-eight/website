/**
 * Calibration diagnostic for SCENE_GEOREFERENCE: reports how self-consistent
 * a scene's control points are, using the real solveGeoTransform/project
 * from georeference.ts (not a reimplementation), so the numbers always match
 * what the app actually does at runtime.
 *
 * Run with: pnpm check:georeference
 */
import {
  SCENE_GEOREFERENCE,
  solveGeoTransform,
  type GeoControlPoint,
} from "./georeference.ts";

const EARTH_RADIUS_M = 6378137;
const DEG = Math.PI / 180;

function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = (lat2 - lat1) * DEG;
  const dLon = (lon2 - lon1) * DEG;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG) * Math.cos(lat2 * DEG) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

function checkScene(sceneId: string, controlPoints: GeoControlPoint[]) {
  console.log(`\n=== ${sceneId} (${controlPoints.length} points) ===`);

  const transform = solveGeoTransform({
    controlPoints,
    accuracyThresholdM: 0, // irrelevant for this diagnostic
  });
  if (!transform) {
    console.log(
      "  Cannot solve a transform (need 2+ points, or points are duplicated).",
    );
    return;
  }
  console.log(
    `  Scale: ${transform.svgUnitsPerMeter.toFixed(2)} svg units/meter`,
  );

  // Per-point residual: re-project each control point's lat/lon through the
  // fitted transform and compare to its recorded (x, y). A well-calibrated
  // set should show residuals of a few meters (GPS/pixel reading noise);
  // an outlier here usually means a mistyped lat/lon or SVG coordinate.
  const errorsM: number[] = [];
  for (const cp of controlPoints) {
    const projected = transform.project(cp.lat, cp.lon);
    const errUnits = Math.hypot(projected.x - cp.x, projected.y - cp.y);
    const errM = errUnits / transform.svgUnitsPerMeter;
    errorsM.push(errM);
    console.log(
      `  ${cp.label.padEnd(16)} actual=(${cp.x}, ${cp.y})` +
        `  predicted=(${projected.x.toFixed(1)}, ${projected.y.toFixed(1)})` +
        `  error=${errM.toFixed(2)}m`,
    );
  }
  const rms = Math.sqrt(
    errorsM.reduce((sum, e) => sum + e * e, 0) / errorsM.length,
  );
  console.log(
    `  RMS residual: ${rms.toFixed(2)}m   Max residual: ${Math.max(...errorsM).toFixed(2)}m`,
  );

  // Pairwise scale check: real-world distance vs. SVG distance between every
  // pair of points. Ratios should all cluster near the overall scale above —
  // a point involved in every outlier ratio is the one to re-measure.
  console.log("  Pairwise scale check (svg units per real meter):");
  for (let i = 0; i < controlPoints.length; i++) {
    for (let j = i + 1; j < controlPoints.length; j++) {
      const p1 = controlPoints[i];
      const p2 = controlPoints[j];
      const distM = haversineMeters(p1.lat, p1.lon, p2.lat, p2.lon);
      const distPx = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      if (distM < 1) continue;
      console.log(
        `    ${p1.label} - ${p2.label}: ${distM.toFixed(1)}m, scale=${(distPx / distM).toFixed(2)}`,
      );
    }
  }
}

for (const [sceneId, ref] of Object.entries(SCENE_GEOREFERENCE)) {
  checkScene(sceneId, ref.controlPoints);
}
