import { IconProps } from "@/lib/types/IconProps";

function CloseIcon({ width, height, className, fill }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height={height || 48}
      viewBox="0 -960 960 960"
      width={width || 48}
      className={className}
      fill={fill}
    >
      <path d="m249-207-42-42 231-231-231-231 42-42 231 231 231-231 42 42-231 231 231 231-42 42-231-231-231 231Z" />
    </svg>
  );
}

export default CloseIcon;
