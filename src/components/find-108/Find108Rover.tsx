import { FIND108_ILLUSTRATION_SVG_CLASS } from "@/components/find-108/Find108Illustration.tsx";
import type { ReactNode } from "react";
import {
  FIND108_FONT_FAMILY,
  ROVER_STROKE_WIDTH,
  ROVER_WHEEL_RADIUS,
} from "./find108-illustration.ts";

const roverStrokeProps = {
  stroke: "currentColor",
  strokeWidth: ROVER_STROKE_WIDTH,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

// Back panel baseline for the rover label (with side margins, no glyph stretching).
const ROVER_BACK_PANEL = {
  startX: 336,
  startY: 748,
  endX: 672,
  endY: 668,
};

const ROVER_BACK_LABEL = {
  marginRatio: 0.1,
  fontSize: 68,
  skewX: -12,
  scaleY: 0.76,
};

const ROVER_SIGN_BOX = {
  width: 280,
  height: 90,
};

function getRoverBackLabelLayout() {
  const dx = ROVER_BACK_PANEL.endX - ROVER_BACK_PANEL.startX;
  const dy = ROVER_BACK_PANEL.endY - ROVER_BACK_PANEL.startY;
  const panelLength = Math.hypot(dx, dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const inset = panelLength * ROVER_BACK_LABEL.marginRatio;
  const centerOffset = inset + (panelLength - 2 * inset) / 2;

  return {
    angle,
    centerX: ROVER_BACK_PANEL.startX + (dx / panelLength) * centerOffset,
    centerY: ROVER_BACK_PANEL.startY + (dy / panelLength) * centerOffset,
  };
}

function RoverBody() {
  return (
    <>
      <line
        x1="149.53"
        y1="281.906"
        x2="155.652"
        y2="339.582"
        {...roverStrokeProps}
      />
      <path
        d="M210.667 228.214C230.158 224.356 248.743 226.187 263.005 232.138C277.286 238.096 286.969 248.04 289.4 260.322C291.831 272.604 286.666 285.486 275.732 296.435C264.812 307.371 248.326 316.143 228.835 320.001C209.344 323.859 190.76 322.028 176.497 316.077C162.216 310.119 152.533 300.175 150.102 287.893C147.671 275.611 152.836 262.729 163.77 251.78C174.691 240.844 191.177 232.071 210.667 228.214Z"
        {...roverStrokeProps}
      />
      <circle
        cx="81"
        cy="687.479"
        r={ROVER_WHEEL_RADIUS}
        {...roverStrokeProps}
      />
      <path
        d="M153 306.479L40.9607 334.405C24.5875 338.486 20.3153 359.76 33.8436 369.846L328.579 589.578C333.569 593.298 340.006 594.483 345.993 592.784L665.804 502.028C682.052 497.417 685.623 475.988 671.749 466.358L373.915 259.626C369.201 256.354 363.308 255.264 357.735 256.635L290.5 273.17"
        {...roverStrokeProps}
      />
      <path
        d="M678.5 489.479V753.237C678.5 762.283 672.428 770.203 663.691 772.552L345.95 857.951C340.011 859.547 333.669 858.323 328.751 854.631L285 821.787M25.5 356.479V616.985C25.5 623.277 28.4609 629.202 33.4928 632.98L57.5 651.002M209 764.733L121.5 699.047"
        {...roverStrokeProps}
      />
      <line
        x1="338.5"
        y1="860.479"
        x2="338.5"
        y2="591.479"
        {...roverStrokeProps}
      />
      <circle
        cx="234.5"
        cy="815.979"
        r={ROVER_WHEEL_RADIUS}
        {...roverStrokeProps}
      />
      <path
        d="M452 315.979V164.979M452 164.979V58.9793L524.5 4.97934V110.979L452 164.979Z"
        {...roverStrokeProps}
      />
      <path d="M289.033 259.185L293.5 308.979" {...roverStrokeProps} />
    </>
  );
}

function RoverBackSignLabel({
  onClick,
  children,
}: {
  onClick?: () => void;
  children: ReactNode;
}) {
  const { angle, centerX, centerY } = getRoverBackLabelLayout();
  const { width, height } = ROVER_SIGN_BOX;

  const label = (
    <g
      transform={`translate(${centerX} ${centerY}) rotate(${angle}) skewX(${ROVER_BACK_LABEL.skewX}) scale(1 ${ROVER_BACK_LABEL.scaleY})`}
      pointerEvents="none"
    >
      <foreignObject
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        pointerEvents="none"
      >
        <div
          className="flex h-full w-full flex-row items-center justify-center font-semibold text-current [&>p]:m-0"
          style={{
            fontFamily: FIND108_FONT_FAMILY,
            fontSize: ROVER_BACK_LABEL.fontSize,
          }}
          {...{ xmlns: "http://www.w3.org/1999/xhtml" }}
        >
          {children}
        </div>
      </foreignObject>
    </g>
  );

  if (!onClick) return label;

  return (
    <g className="cursor-pointer" onClick={onClick}>
      <rect x="406" y="610" width="220" height="145" fill="transparent" />
      {label}
    </g>
  );
}

function Rover108Sign({ onReveal }: { onReveal: () => void }) {
  return (
    <RoverBackSignLabel onClick={onReveal}>
      <p>А-</p>
      <p>1</p>
      <p>0</p>
      <p>8</p>
    </RoverBackSignLabel>
  );
}

function RoverA242Sign() {
  return (
    <RoverBackSignLabel>
      <p>А-242</p>
    </RoverBackSignLabel>
  );
}

export function Find108Rover({
  signRevealed,
  onSignReveal,
}: {
  signRevealed: boolean;
  onSignReveal: () => void;
}) {
  return (
    <svg
      viewBox="0 0 707 876"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={FIND108_ILLUSTRATION_SVG_CLASS}
    >
      <RoverBody />
      {signRevealed ? (
        <RoverA242Sign />
      ) : (
        <Rover108Sign onReveal={onSignReveal} />
      )}
    </svg>
  );
}
