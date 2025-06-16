import React from "react";

type Props = {
  className?: string;
  stroke?: string;
};

const SearchIcon: React.FC<Props> = ({
  className,
  stroke = "currentColor",
}) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M6.38708 8.26292C4.82752 6.70335 4.82752 4.17072 6.38708 2.60449C7.94665 1.04492 10.4793 1.04492 12.0455 2.60449C13.6051 4.16406 13.6051 6.69669 12.0455 8.26292C10.4859 9.82248 7.95331 9.82248 6.38708 8.26292Z"
      stroke={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6.21382 8.43628L1.21521 13.4349"
      stroke={stroke}
      strokeLinecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

export default SearchIcon;
