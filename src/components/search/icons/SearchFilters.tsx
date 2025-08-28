import React from "react";

type Props = {
  className?: string;
  stroke?: string;
};

const SearchFiltersIcon: React.FC<Props> = ({
  className,
  stroke = "currentColor",
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 15 15"
    className={className}
  >
    <path
      fill={stroke}
      d="M7.64 5.38L2.13 11.17a.6.6 0 0 0 0 .83l.01.01a.55.55 0 0 0 .79 0l5.06-5.31 5.05 5.31a.55.55 0 0 0 .79 0l.01-.01a.6.6 0 0 0 0-.83L8.35 5.38a.6.6 0 0 0-.71 0z"
    />
  </svg>
);

export default SearchFiltersIcon;
