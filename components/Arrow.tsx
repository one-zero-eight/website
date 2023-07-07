type ArrowProps = {
  className?: string;
};
function Arrow({ className }: ArrowProps) {
  return (
    <svg
      className={"rotate-90 lg:rotate-0 " + className}
      width="102"
      height="38"
      viewBox="0 0 102 38"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 16.5C1.61929 16.5 0.5 17.6193 0.5 19C0.5 20.3807 1.61929 21.5 3 21.5V16.5ZM100.768 20.7678C101.744 19.7915 101.744 18.2085 100.768 17.2322L84.8579 1.32233C83.8816 0.34602 82.2986 0.34602 81.3223 1.32233C80.346 2.29864 80.346 3.88155 81.3223 4.85786L95.4645 19L81.3223 33.1421C80.346 34.1184 80.346 35.7014 81.3223 36.6777C82.2986 37.654 83.8816 37.654 84.8579 36.6777L100.768 20.7678ZM3 21.5H99V16.5H3V21.5Z"
        fill="#2C2C2C"
      />
    </svg>
  );
}

export default Arrow;
