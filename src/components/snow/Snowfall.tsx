import { useEffect, useMemo, useState } from "react";
import Snowfall from "react-snowfall";

const snowfallLayers = [
  { color: "#b7fbff", opacity: 0.5, angleDeg: 37, radius: 3, count: 40 },
  { color: "#aaaabb", opacity: 0.75, angleDeg: 45, radius: 4, count: 45 },
  { color: "#aaaaaa", opacity: 0.5, angleDeg: 40, radius: 4, count: 35 },
];

const getViewportSize = () => ({
  width: typeof window !== "undefined" ? window.innerWidth : 0,
  height: typeof window !== "undefined" ? window.innerHeight : 0,
});

const hexToRgb = (hex: string) => {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;

  const int = parseInt(value, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
};

const toRgba = (hex: string, opacity: number) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const angleDegToWind = (deg: number) => Math.tan((deg * Math.PI) / 180);
const fixedRange = (value: number): [number, number] => [value, value];

const SnowfallComponent = () => {
  const [viewport, setViewport] = useState(getViewportSize);

  useEffect(() => {
    const handleResize = () => setViewport(getViewportSize());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const canvasStyle = useMemo(
    () => ({
      zIndex: -1,
      position: "fixed" as const,
      inset: 0,
      width: viewport.width,
      height: viewport.height,
      pointerEvents: "none" as const,
    }),
    [viewport.height, viewport.width],
  );

  return (
    <>
      {snowfallLayers.map((layer, index) => (
        <Snowfall
          key={`${index}-${viewport.width}x${viewport.height}`}
          color={toRgba(layer.color, layer.opacity)}
          radius={fixedRange(layer.radius)}
          snowflakeCount={layer.count}
          wind={fixedRange(angleDegToWind(layer.angleDeg))}
          speed={fixedRange(1)}
          style={canvasStyle}
        />
      ))}
    </>
  );
};

export default SnowfallComponent;
