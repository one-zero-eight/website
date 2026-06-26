import { FIND108_FONT_FAMILY } from "@/components/find-108/find108-illustration.ts";
import { cn } from "@/lib/ui/cn";

export function Find108SvgGlyph({
  x,
  y,
  width,
  height,
  fontSize,
  prefix,
  className,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  prefix?: string;
  className?: string;
}) {
  return (
    <foreignObject
      x={x}
      y={y}
      width={width}
      height={height}
      pointerEvents="none"
    >
      <div
        xmlns="http://www.w3.org/1999/xhtml"
        className={cn(
          "flex h-full w-full flex-row items-center justify-center font-semibold text-current [&>p]:m-0",
          className,
        )}
        style={{
          fontFamily: FIND108_FONT_FAMILY,
          fontSize,
        }}
      >
        {prefix ? <p>{prefix}</p> : null}
        <p>1</p>
        <p>0</p>
        <p>8</p>
      </div>
    </foreignObject>
  );
}
