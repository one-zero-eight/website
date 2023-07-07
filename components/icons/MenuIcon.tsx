import { IconProps } from "@/lib/types/IconProps";

export function MenuIcon({ width, height, className, fill }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height={height || 36}
      viewBox="0 -960 960 960"
      width={width || 36}
      className={className}
      fill={fill}
    >
      <path d="M120-240v-60h720v60H120Zm0-210v-60h720v60H120Zm0-210v-60h720v60H120Z" />
    </svg>
  );
}
