/**
 * Georeferencing for map scenes: converts real-world GPS coordinates (WGS84
 * latitude/longitude) into the SVG user-space of a floor plan.
 *
 * The floor-plan SVGs carry no geographic metadata, so each scene that wants a
 * "you are here" dot must provide a few control points (a recognizable spot on
 * the plan + its real-world lat/lon). From those we fit a 2D affine transform.
 *
 * The control points themselves live server-side and arrive on `scene.geo_reference`
 * from the maps `/scenes/` API; this module only turns them into a transform.
 */

import { mapsTypes } from "@/api/maps";

export type GeoControlPoint = {
  /** Human-readable note, e.g. "garage entrance, NE corner". */
  label: string;
  lat: number;
  lon: number;
  /** Position of the same spot in the SVG's user-space (viewBox units). */
  x: number;
  y: number;
};

export type SceneGeoReference = {
  /**
   * At least 2 points. Prefer 3+ that are spread out and not on a straight
   * line — the transform is only as good as its calibration.
   */
  controlPoints: GeoControlPoint[];
  /** Hide the dot when the browser's reported accuracy is worse than this. */
  accuracyThresholdM: number;
};

/**
 * viewBox shared by every `university-floor-*.svg` (Floor -1 through Floor
 * 5): "-115.31 -100 2677.53 1893.18". Confirmed identical across all of them
 * (same building, same export coordinate frame), so a single set of control
 * points (served on `scene.geo_reference`) applies to all of them.
 */
export const MAP_VIEWBOX = {
  minX: -115.31,
  minY: -100,
  width: 2677.53,
  height: 1893.18,
} as const;

export const MAP_VIEWBOX_STRING = `${MAP_VIEWBOX.minX} ${MAP_VIEWBOX.minY} ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`;

/**
 * Adapt a scene's server-provided `geo_reference` (snake_case, from the
 * `/scenes/` API) into the shape the transform solver expects. Returns
 * `undefined` when the scene isn't georeferenced or has fewer than 2 control
 * points — both mean "no location dot" (currently `sport-complex` and
 * `campus`). New scenes are calibrated by adding `geo_reference` in the maps
 * service's `scenes.yaml`, not here.
 */
export function getSceneGeoReference(
  geoReference: mapsTypes.SchemaGeoReference | null | undefined,
): SceneGeoReference | undefined {
  if (!geoReference) return undefined;
  const controlPoints = geoReference.control_points ?? [];
  if (controlPoints.length < 2) return undefined;
  return {
    controlPoints,
    accuracyThresholdM: geoReference.accuracy_threshold_m,
  };
}

export function isWithinViewBox(
  x: number,
  y: number,
  marginRatio = 0.05,
): boolean {
  const mx = MAP_VIEWBOX.width * marginRatio;
  const my = MAP_VIEWBOX.height * marginRatio;
  return (
    x >= MAP_VIEWBOX.minX - mx &&
    x <= MAP_VIEWBOX.minX + MAP_VIEWBOX.width + mx &&
    y >= MAP_VIEWBOX.minY - my &&
    y <= MAP_VIEWBOX.minY + MAP_VIEWBOX.height + my
  );
}

const EARTH_RADIUS_M = 6378137;
const DEG = Math.PI / 180;

/** Local equirectangular projection (meters east/north) around a reference point. */
function toLocalMeters(
  lat: number,
  lon: number,
  latRef: number,
  lonRef: number,
): { e: number; n: number } {
  return {
    e: (lon - lonRef) * DEG * EARTH_RADIUS_M * Math.cos(latRef * DEG),
    n: (lat - latRef) * DEG * EARTH_RADIUS_M,
  };
}

/** Affine map: x = a·e + b·n + c, y = d·e + f·n + g. */
type AffineCoeffs = {
  a: number;
  b: number;
  c: number;
  d: number;
  f: number;
  g: number;
};

export type GeoTransform = {
  project: (lat: number, lon: number) => { x: number; y: number };
  /** SVG user-units per real-world meter, for sizing the accuracy circle. */
  svgUnitsPerMeter: number;
};

/** Solve a 3×3 linear system by Cramer's rule; returns null if near-singular. */
function solve3(
  m: [number, number, number, number, number, number, number, number, number],
  v: [number, number, number],
): [number, number, number] | null {
  const [a, b, c, d, e, f, g, h, i] = m;
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-9) return null;
  const dx =
    v[0] * (e * i - f * h) -
    b * (v[1] * i - f * v[2]) +
    c * (v[1] * h - e * v[2]);
  const dy =
    a * (v[1] * i - f * v[2]) -
    v[0] * (d * i - f * g) +
    c * (d * v[2] - v[1] * g);
  const dz =
    a * (e * v[2] - v[1] * h) -
    b * (d * v[2] - v[1] * g) +
    v[0] * (d * h - e * g);
  return [dx / det, dy / det, dz / det];
}

/** Least-squares affine fit from 3+ control points (normal equations). */
function fitAffine(
  pts: { e: number; n: number; x: number; y: number }[],
): AffineCoeffs | null {
  let See = 0,
    Snn = 0,
    Sen = 0,
    Se = 0,
    Sn = 0;
  let Sex = 0,
    Snx = 0,
    Sx = 0,
    Sey = 0,
    Sny = 0,
    Sy = 0;
  for (const p of pts) {
    See += p.e * p.e;
    Snn += p.n * p.n;
    Sen += p.e * p.n;
    Se += p.e;
    Sn += p.n;
    Sex += p.e * p.x;
    Snx += p.n * p.x;
    Sx += p.x;
    Sey += p.e * p.y;
    Sny += p.n * p.y;
    Sy += p.y;
  }
  const normal: [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ] = [See, Sen, Se, Sen, Snn, Sn, Se, Sn, pts.length];
  const cx = solve3(normal, [Sex, Snx, Sx]);
  const cy = solve3(normal, [Sey, Sny, Sy]);
  if (!cx || !cy) return null;
  return { a: cx[0], b: cx[1], c: cx[2], d: cy[0], f: cy[1], g: cy[2] };
}

/** Exact similarity transform (scale + rotation + translation) from 2 points. */
function fitSimilarity(
  p1: { e: number; n: number; x: number; y: number },
  p2: { e: number; n: number; x: number; y: number },
): AffineCoeffs | null {
  // Treat (e, n) and (x, y) as complex numbers z and w; solve w = k·z + t.
  const zr = p2.e - p1.e;
  const zi = p2.n - p1.n;
  const denom = zr * zr + zi * zi;
  if (denom < 1e-9) return null;
  const wr = p2.x - p1.x;
  const wi = p2.y - p1.y;
  // k = (w2 - w1) / (z2 - z1)
  const kr = (wr * zr + wi * zi) / denom;
  const ki = (wi * zr - wr * zi) / denom;
  // t = w1 - k·z1
  const tr = p1.x - (kr * p1.e - ki * p1.n);
  const ti = p1.y - (ki * p1.e + kr * p1.n);
  return { a: kr, b: -ki, c: tr, d: ki, f: kr, g: ti };
}

/**
 * Build a GPS → SVG transform from a scene's control points. Uses a
 * least-squares affine fit for 3+ points, falling back to a 2-point similarity
 * transform (also used when the points turn out to be collinear).
 */
export function solveGeoTransform(ref: SceneGeoReference): GeoTransform | null {
  const cps = ref.controlPoints;
  if (cps.length < 2) return null;

  const latRef = cps[0].lat;
  const lonRef = cps[0].lon;
  const local = cps.map((cp) => {
    const { e, n } = toLocalMeters(cp.lat, cp.lon, latRef, lonRef);
    return { e, n, x: cp.x, y: cp.y };
  });

  let coeffs = cps.length >= 3 ? fitAffine(local) : null;
  if (!coeffs) {
    // Pick the two farthest-apart points for the similarity fallback.
    let best: [number, number] = [0, 1];
    let bestDist = -1;
    for (let i = 0; i < local.length; i++) {
      for (let j = i + 1; j < local.length; j++) {
        const dist = Math.hypot(
          local[i].e - local[j].e,
          local[i].n - local[j].n,
        );
        if (dist > bestDist) {
          bestDist = dist;
          best = [i, j];
        }
      }
    }
    coeffs = fitSimilarity(local[best[0]], local[best[1]]);
  }
  if (!coeffs) return null;

  const { a, b, c, d, f, g } = coeffs;
  const svgUnitsPerMeter = Math.sqrt(Math.abs(a * f - b * d)) || 1;

  return {
    project: (lat, lon) => {
      const { e, n } = toLocalMeters(lat, lon, latRef, lonRef);
      return { x: a * e + b * n + c, y: d * e + f * n + g };
    },
    svgUnitsPerMeter,
  };
}
