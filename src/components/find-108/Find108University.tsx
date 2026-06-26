import { FIND108_ILLUSTRATION_SVG_CLASS } from "@/components/find-108/Find108Illustration.tsx";
import { UNIVERSITY_STROKE_WIDTH } from "./find108-illustration.ts";

const universityStrokeProps = {
  stroke: "currentColor",
  strokeWidth: UNIVERSITY_STROKE_WIDTH,
};

function UniversityBody() {
  return (
    <>
      <path d="M356 324.69V351.69H373V331.69" {...universityStrokeProps} />
      <path
        d="M129 430.69L102 329.925L160.722 314.19L191.938 430.69"
        {...universityStrokeProps}
      />
      <path
        d="M260.5 429.19V286.03H173L73.5 312.69L104.716 429.19M173 286.03L219 429.19"
        {...universityStrokeProps}
      />
      <path d="M446.5 153.19L447 247.69" {...universityStrokeProps} />
      <path
        d="M151 481.69V99.1904C151 99.1904 182.754 116.198 199.5 114.19C216.246 112.183 216 99.1905 229 89.6905C242 80.1905 261 89.6904 261 89.6904V153.69"
        {...universityStrokeProps}
      />
      <path
        d="M151 170.69C151 170.69 183.897 185.461 201 182.69C218.103 179.92 221.445 159.315 233.5 154.19C245.555 149.066 260.5 154.19 260.5 154.19"
        {...universityStrokeProps}
      />
      <path
        d="M151 481.69V99.1904C151 99.1904 182.754 116.198 199.5 114.19C216.246 112.183 216 99.1905 229 89.6905C242 80.1905 261 89.6904 261 89.6904V153.69"
        {...universityStrokeProps}
      />
      <path
        d="M11.5 231.652C11.5 231.652 24.8028 237.625 31.7187 236.505C38.6346 235.384 39.9863 227.052 44.8609 224.98C49.7355 222.908 55.779 224.98 55.779 224.98"
        {...universityStrokeProps}
      />
      <path
        d="M11.5 452.69V202.739C11.5 202.739 24.3404 209.617 31.1122 208.805C37.8839 207.993 37.7843 202.739 43.0412 198.898C48.2981 195.056 55.9812 198.898 55.9812 198.898V224.778"
        {...universityStrokeProps}
      />
      <path
        d="M71.5 221.655C71.5 221.655 92.5244 231.095 103.455 229.324C114.385 227.554 116.521 214.385 124.225 211.11C131.929 207.835 141.48 211.11 141.48 211.11"
        {...universityStrokeProps}
      />
      <path
        d="M71.5 468.19V175.96C71.5 175.96 91.7935 186.829 102.496 185.546C113.198 184.264 113.041 175.96 121.349 169.889C129.657 163.817 141.8 169.889 141.8 169.889V210.791"
        {...universityStrokeProps}
      />
      <path
        d="M412.291 228.02L458 128.19M412.291 228.02L218 268.19M568.5 445.69L568.5 317.19L412.291 228.02M387 336.19L218 268.19L287.5 177.69L458 128.19L640 217.69M568.5 317.19L387 336.19M568.5 445.69L638 445.69M387 336.19L387 432.19L387 445.69L568.5 445.69M387 432.19L0 432.19"
        {...universityStrokeProps}
      />
      <path d="M638.5 215.69V448.19" {...universityStrokeProps} />
      <path d="M598.5 197.19V445.19" {...universityStrokeProps} />
      <path d="M563.5 179.19V314.19" {...universityStrokeProps} />
      <path d="M522.5 159.19L523 289.19" {...universityStrokeProps} />
      <path d="M484 140.69V270.19" {...universityStrokeProps} />
      <rect
        x="281"
        y="316.69"
        width="20"
        height="33"
        {...universityStrokeProps}
      />
      <rect
        x="356"
        y="366.69"
        width="20"
        height="33"
        {...universityStrokeProps}
      />
      <rect
        x="319"
        y="366.69"
        width="20"
        height="33"
        {...universityStrokeProps}
      />
      <rect
        x="281"
        y="366.69"
        width="20"
        height="33"
        {...universityStrokeProps}
      />
      <rect
        x="320"
        y="316.69"
        width="20"
        height="33"
        {...universityStrokeProps}
      />
    </>
  );
}

export function Find108University() {
  return (
    <svg
      viewBox="0 0 733 699"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={FIND108_ILLUSTRATION_SVG_CLASS}
    >
      <UniversityBody />
    </svg>
  );
}
