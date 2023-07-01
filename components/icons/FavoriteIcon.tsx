export type FavoriteIconProps = {
  active: boolean;
};

function FavoriteIcon({ active, ...props }: FavoriteIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height={36}
      viewBox="0 -960 960 960"
      width={36}
      className={
        active ? "fill-[#F0B132]" : "fill-secondary hover:fill-secondary_hover"
      }
      {...props}
    >
      {active ? (
        <path d="m223.116-66.21 67.71-292.399L63.819-555.341l299.637-25.797L480-856.979l116.544 275.841 299.637 25.797-227.007 196.732 67.87 292.4L480-221.508 223.116-66.21Z" />
      ) : (
        <path d="m337.091-224.346 142.915-85.634 142.915 86.64-38.203-162.124 125.812-109.29-165.696-14.522L480-662.385l-64.834 152.348-165.696 14.283 125.872 109.389-38.251 162.019ZM223.116-66.21l67.71-292.399L63.819-555.341l299.574-25.764L480-856.979l116.607 275.874 299.574 25.764-227.007 196.732 67.87 292.4L480-221.508 223.116-66.21ZM480-432.775Z" />
      )}
    </svg>
  );
}

export default FavoriteIcon;