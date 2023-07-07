import { IconProps } from "@/lib/types/IconProps";

function QuestionIcon({ width, height, className, fill }: IconProps) {
  return (
    <svg
      width={width || 41}
      height={height || 41}
      viewBox="0 0 41 41"
      xmlns="http://www.w3.org/2000/svg"
      fill={fill}
      fillOpacity={0.75}
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M20.5 3.154c-9.58 0-17.346 7.766-17.346 17.346S10.92 37.846 20.5 37.846 37.846 30.08 37.846 20.5 30.08 3.154 20.5 3.154zM0 20.5C0 9.178 9.178 0 20.5 0S41 9.178 41 20.5 31.822 41 20.5 41 0 31.822 0 20.5z"
      />
      <path d="M20.5 33.115a2.365 2.365 0 100-4.73 2.365 2.365 0 000 4.73z" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17.784 10.002a7.096 7.096 0 114.293 13.474v.178a1.577 1.577 0 11-3.154 0v-1.577A1.577 1.577 0 0120.5 20.5a3.942 3.942 0 10-3.942-3.942 1.577 1.577 0 11-3.154 0 7.096 7.096 0 014.38-6.556z"
      />
    </svg>
  );
}

export default QuestionIcon;
