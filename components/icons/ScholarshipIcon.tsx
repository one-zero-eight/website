import { IconProps } from "@/lib/types/IconProps";

function ScholarshipIcon({ width, height, className, fill }: IconProps) {
  return (
    <svg
      width={width || 40}
      height={height || 40}
      viewBox="0 -960 960 960"
      xmlns="http://www.w3.org/2000/svg"
      className={"mr-4 hover:cursor-pointer " + className}
      fill={fill}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M886.855-730.942v501.884q0 30.994-22.427 53.374-22.426 22.38-53.486 22.38H149.058q-30.994 0-53.374-22.38-22.38-22.38-22.38-53.374v-501.884q0-31.06 22.38-53.486 22.38-22.427 53.374-22.427h661.884q31.06 0 53.486 22.427 22.427 22.426 22.427 53.486Zm-737.797 96.384h661.884v-96.384H149.058v96.384Zm0 139.333v266.167h661.884v-266.167H149.058Zm0 266.167v-501.884 501.884Z"
      />
    </svg>
  );
}

export default ScholarshipIcon;
