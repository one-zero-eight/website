import { describe, expect, it } from "vitest";
import {
  isWithinViewBox,
  solveGeoTransform,
  type GeoControlPoint,
} from "./georeference.ts";

const EARTH_RADIUS_M = 6378137;
const DEG = Math.PI / 180;

// Same local projection the module uses internally.
function toLocal(lat: number, lon: number, latRef: number, lonRef: number) {
  return {
    e: (lon - lonRef) * DEG * EARTH_RADIUS_M * Math.cos(latRef * DEG),
    n: (lat - latRef) * DEG * EARTH_RADIUS_M,
  };
}

const BASE_LAT = 55.7538;
const BASE_LON = 48.7437;

/** Build control points from a lat/lon list by applying a known (e,n)->(x,y) map. */
function makeControlPoints(
  latLons: [number, number][],
  map: (e: number, n: number) => { x: number; y: number },
): GeoControlPoint[] {
  return latLons.map(([lat, lon], i) => {
    const { e, n } = toLocal(lat, lon, BASE_LAT, BASE_LON);
    const { x, y } = map(e, n);
    return { label: `p${i}`, lat, lon, x, y };
  });
}

describe("solveGeoTransform", () => {
  it("recovers a full affine transform from 3+ control points", () => {
    // x = 12e - 3n + 100 ; y = 2e + 11n - 50 (skewed, not a similarity)
    const map = (e: number, n: number) => ({
      x: 12 * e - 3 * n + 100,
      y: 2 * e + 11 * n - 50,
    });
    const latLons: [number, number][] = [
      [BASE_LAT, BASE_LON],
      [BASE_LAT + 0.0012, BASE_LON + 0.0018],
      [BASE_LAT - 0.0009, BASE_LON + 0.0007],
      [BASE_LAT + 0.0004, BASE_LON - 0.0015],
    ];
    const cps = makeControlPoints(latLons, map);
    const transform = solveGeoTransform({
      controlPoints: cps,
      accuracyThresholdM: 75,
    });
    expect(transform).not.toBeNull();

    for (const cp of cps) {
      const got = transform!.project(cp.lat, cp.lon);
      expect(got.x).toBeCloseTo(cp.x, 3);
      expect(got.y).toBeCloseTo(cp.y, 3);
    }

    // A point between the controls should also map through the same affine.
    const midLat = BASE_LAT + 0.0003;
    const midLon = BASE_LON + 0.0005;
    const { e, n } = toLocal(midLat, midLon, BASE_LAT, BASE_LON);
    const expected = map(e, n);
    const got = transform!.project(midLat, midLon);
    expect(got.x).toBeCloseTo(expected.x, 2);
    expect(got.y).toBeCloseTo(expected.y, 2);
  });

  it("falls back to a similarity transform for exactly 2 points", () => {
    const scale = 9;
    const theta = 0.35;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    // similarity: rotate + uniform scale + translate
    const map = (e: number, n: number) => ({
      x: scale * (cos * e - sin * n) + 250,
      y: scale * (sin * e + cos * n) + 700,
    });
    const cps = makeControlPoints(
      [
        [BASE_LAT, BASE_LON],
        [BASE_LAT + 0.0015, BASE_LON + 0.001],
      ],
      map,
    );
    const transform = solveGeoTransform({
      controlPoints: cps,
      accuracyThresholdM: 75,
    });
    expect(transform).not.toBeNull();
    expect(transform!.svgUnitsPerMeter).toBeCloseTo(scale, 4);

    for (const cp of cps) {
      const got = transform!.project(cp.lat, cp.lon);
      expect(got.x).toBeCloseTo(cp.x, 3);
      expect(got.y).toBeCloseTo(cp.y, 3);
    }
  });

  it("returns null with fewer than 2 control points", () => {
    expect(
      solveGeoTransform({ controlPoints: [], accuracyThresholdM: 75 }),
    ).toBeNull();
  });
});

describe("isWithinViewBox", () => {
  it("accepts a point inside the plan and rejects a far-away one", () => {
    expect(isWithinViewBox(1000, 800)).toBe(true);
    expect(isWithinViewBox(50_000, 50_000)).toBe(false);
  });
});
