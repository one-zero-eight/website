import { IconProps } from "@/lib/types/IconProps";

function TableChartIcon({ width, height, className, fill }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height={width || 48}
      viewBox="0 -960 960 960"
      width={height || 48}
      className={className}
      fill={fill}
    >
      <path d="M817.848-115.022H182.152q-27.599 0-47.865-20.265-20.265-20.266-20.265-47.865v-594.696q0-27.697 20.265-48.033 20.266-20.337 47.865-20.337h635.696q27.697 0 48.033 20.337 20.337 20.336 20.337 48.033v594.696q0 27.599-20.337 47.865-20.336 20.265-48.033 20.265Zm-635.696-523.5h635.696v-139.326H182.152v139.326Zm148.805 60H182.152v395.37h148.805v-395.37Zm338.086 0v395.37h148.805v-395.37H669.043Zm-60 0H390.957v395.37h218.086v-395.37Z" />
    </svg>
  );
}

export default TableChartIcon;
