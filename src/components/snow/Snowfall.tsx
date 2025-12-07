import Snowfall from "react-snowfall";

const SnowfallComponent = () => {
  const snowfallLayers = [
    { color: "#b7fbff", opacity: 0.5, angleDeg: 37, radius: 3, count: 40 },
    { color: "#aaaabb", opacity: 0.75, angleDeg: 45, radius: 4, count: 45 },
    { color: "#aaaaaa", opacity: 0.5, angleDeg: 40, radius: 4, count: 35 },
  ];

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
  return snowfallLayers.map((layer, index) => (
    <Snowfall
      key={index}
      color={toRgba(layer.color, layer.opacity)}
      radius={fixedRange(layer.radius)}
      snowflakeCount={layer.count}
      wind={fixedRange(angleDegToWind(layer.angleDeg))}
      speed={fixedRange(1)}
      style={{ zIndex: -1 }}
    />
  ));
};

export default SnowfallComponent;
