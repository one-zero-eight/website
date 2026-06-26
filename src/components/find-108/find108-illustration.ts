export const FIND108_STROKE_WIDTH = 8;
export const FIND108_FONT_FAMILY = '"Rubik Variable", sans-serif';
export const BUS_VIEWBOX_WIDTH = 477;
export const ROVER_VIEWBOX_WIDTH = 707;
export const UNIVERSITY_VIEWBOX_WIDTH = 733;
export const BUS_WHEEL_RADIUS = 30.5;
export const BUS_CORNER_RADIUS = 38.5;

export function illustrationStrokeWidth(viewBoxWidth: number) {
  return FIND108_STROKE_WIDTH * (viewBoxWidth / BUS_VIEWBOX_WIDTH);
}

export function scaledRadius(
  radius: number,
  viewBoxWidth = ROVER_VIEWBOX_WIDTH,
) {
  return radius * (viewBoxWidth / BUS_VIEWBOX_WIDTH);
}

export const ROVER_STROKE_WIDTH = illustrationStrokeWidth(ROVER_VIEWBOX_WIDTH);
export const ROVER_WHEEL_RADIUS = scaledRadius(BUS_WHEEL_RADIUS);
export const UNIVERSITY_STROKE_WIDTH = illustrationStrokeWidth(
  UNIVERSITY_VIEWBOX_WIDTH,
);
