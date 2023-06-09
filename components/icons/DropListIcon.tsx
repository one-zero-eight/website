function DropListIcon(props: any) {
  return (
    <svg
      width={30}
      height={18}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mr-2"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M.732 1a2.5 2.5 0 013.536 0l12.464 12.465A2.5 2.5 0 0113.197 17L.732 4.536A2.5 2.5 0 01.732 1z"
        fill="#fff"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M13.197 17a2.5 2.5 0 010-3.536L25.66 1a2.5 2.5 0 113.536 3.536L16.732 17a2.5 2.5 0 01-3.535 0z"
        fill="#fff"
      />
    </svg>
  );
}

export default DropListIcon;
