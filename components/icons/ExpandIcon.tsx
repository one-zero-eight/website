import { IconProps } from "@/lib/types/IconProps";

export function ExpandIcon({ width, height, className, fill }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height={height || 48}
      viewBox="0 -960 960 960"
      width={width || 48}
      className={className}
      fill={fill}
    >
      <path d="M114.022-114.022v-308.13h68.13v192.021l547.717-547.717H537.848v-68.37h308.37v308.37h-68.37v-192.021L230.131-182.152h192.021v68.13h-308.13Z" />
    </svg>
  );
}
