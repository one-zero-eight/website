import { Find108SvgGlyph } from "@/components/find-108/Find108SvgGlyph.tsx";
import { FIND108_ILLUSTRATION_SVG_CLASS } from "@/components/find-108/Find108Illustration.tsx";
import {
  BUS_VIEWBOX_WIDTH,
  FIND108_FONT_FAMILY,
  illustrationStrokeWidth,
} from "./find108-illustration.ts";

const BUS_STROKE_WIDTH = illustrationStrokeWidth(BUS_VIEWBOX_WIDTH);

const BUS_DESTINATION_SIGN = {
  x: 88,
  y: 16,
  width: 300,
  height: 64,
  rx: 32,
  centerX: 238,
  centerY: 52,
  destinationFontSize: 34,
  numberFontSize: 42,
};

function BusBody() {
  return (
    <>
      <rect
        x="39.5"
        y="1.5"
        width="398"
        height="455"
        rx="38.5"
        stroke="currentColor"
        strokeWidth={BUS_STROKE_WIDTH}
      />
      <rect
        x="68.5"
        y="99.5"
        width="340"
        height="185"
        rx="38.5"
        stroke="currentColor"
        strokeWidth={BUS_STROKE_WIDTH}
      />
      <rect
        x={BUS_DESTINATION_SIGN.x}
        y={BUS_DESTINATION_SIGN.y}
        width={BUS_DESTINATION_SIGN.width}
        height={BUS_DESTINATION_SIGN.height}
        rx={BUS_DESTINATION_SIGN.rx}
        stroke="currentColor"
        strokeWidth={BUS_STROKE_WIDTH}
      />
      <circle
        cx="128"
        cy="387"
        r="30.5"
        stroke="currentColor"
        strokeWidth={BUS_STROKE_WIDTH}
      />
      <circle
        cx="358"
        cy="387"
        r="30.5"
        stroke="currentColor"
        strokeWidth={BUS_STROKE_WIDTH}
      />
      <path
        d="M39.5 231.493C18.4675 231.225 1.5 214.096 1.5 193V138C1.5 116.904 18.4675 99.7736 39.5 99.5059V231.493Z"
        stroke="currentColor"
        strokeWidth={BUS_STROKE_WIDTH}
      />
      <path
        d="M158.457 456.5C157.679 470.438 146.132 481.5 132 481.5L95 481.5C80.8679 481.5 69.3197 470.438 68.542 456.5L158.457 456.5Z"
        stroke="currentColor"
        strokeWidth={BUS_STROKE_WIDTH}
      />
      <path
        d="M402.457 456.5C401.679 470.438 390.132 481.5 376 481.5L339 481.5C324.868 481.5 313.32 470.438 312.542 456.5L402.457 456.5Z"
        stroke="currentColor"
        strokeWidth={BUS_STROKE_WIDTH}
      />
      <path
        d="M437.5 99.5068C458.533 99.7746 475.5 116.904 475.5 138L475.5 193C475.5 214.096 458.533 231.226 437.5 231.494L437.5 99.5068Z"
        stroke="currentColor"
        strokeWidth={BUS_STROKE_WIDTH}
      />
    </>
  );
}

const BUS_NUMBER_SIGN = {
  x: 188,
  y: 26,
  width: 100,
  height: 44,
};

function Bus108Sign({ onReveal }: { onReveal: () => void }) {
  const { numberFontSize } = BUS_DESTINATION_SIGN;
  const { x, y, width, height } = BUS_NUMBER_SIGN;

  return (
    <g className="cursor-pointer" onClick={onReveal}>
      <rect x={x} y={y} width={width} height={height} fill="transparent" />
      <Find108SvgGlyph
        x={x}
        y={y}
        width={width}
        height={height}
        fontSize={numberFontSize}
      />
    </g>
  );
}

function BusInnopolisSign() {
  const { centerX, centerY, destinationFontSize } = BUS_DESTINATION_SIGN;

  return (
    <text
      fill="currentColor"
      fontFamily={FIND108_FONT_FAMILY}
      fontSize={destinationFontSize}
      fontWeight="600"
      textAnchor="middle"
      dominantBaseline="middle"
      x={centerX}
      y={centerY}
    >
      Иннополис
    </text>
  );
}

export function Find108Bus({
  signRevealed,
  onSignReveal,
}: {
  signRevealed: boolean;
  onSignReveal: () => void;
}) {
  return (
    <svg
      viewBox="0 0 477 483"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={FIND108_ILLUSTRATION_SVG_CLASS}
    >
      <BusBody />
      {signRevealed ? (
        <BusInnopolisSign />
      ) : (
        <Bus108Sign onReveal={onSignReveal} />
      )}
    </svg>
  );
}
