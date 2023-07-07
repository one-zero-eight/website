import { IconProps } from "@/lib/types/IconProps";

function DropListIcon({ width, height, className, fill }: IconProps) {
  return (
    <svg
      width={width || 40}
      height={height || 40}
      viewBox="0 -960 960 960"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill={fill}
    >
      <path d="M480-354.261 270.195-563.065h419.61L480-354.261Z" />
    </svg>
  );
}

export default DropListIcon;
