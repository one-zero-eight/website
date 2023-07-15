import { IconProps } from "@/lib/types/IconProps";

export function LocationIcon({ width, height, className, fill }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height={height || 48}
      viewBox="0 -960 960 960"
      width={width || 48}
      className={className}
      fill={fill}
    >
      <path d="M480.129-488.326q29.828 0 50.806-20.987 20.978-20.988 20.978-50.816 0-29.828-21.037-50.806-21.037-20.978-50.935-20.978-29.898 0-50.756 21.037-20.859 21.037-20.859 50.935 0 29.898 20.987 50.756 20.988 20.859 50.816 20.859ZM480-163.783q131.804-119.565 194.826-215.793 63.022-96.228 63.022-173.141 0-116.53-74.658-190.83-74.658-74.301-183.154-74.301t-183.19 74.301q-74.694 74.3-74.694 190.83 0 76.913 64.522 173.021Q351.196-283.587 480-163.783Zm0 89.761Q316.13-212.696 235.076-330.674q-81.054-117.978-81.054-222.043 0-152.325 98.302-242.913Q350.627-886.218 480-886.218q129.27 0 227.744 90.588 98.474 90.588 98.474 242.913 0 104.065-81.174 222.043Q643.87-212.696 480-74.022ZM480-560Z" />
    </svg>
  );
}
