import { IconProps } from "@/lib/types/IconProps";

function DoubleArrowIcon({ width, height, className, fill }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height={width || 36}
      viewBox="0 0 48 48"
      width={height || 36}
      fill={fill}
      className={className}
    >
      <path
        d="M12.7024 36.237L10.3154 33.85L20.2154 23.95L10.3154 14.05L12.7024 11.6631L24.9894 23.95L12.7024 36.237ZM25.46 36.237L23.073 33.85L32.973 23.95L23.073 14.05L25.46 11.6631L37.747 23.95L25.46 36.237Z"
        fill="white"
      />
    </svg>
  );
}

export default DoubleArrowIcon;
