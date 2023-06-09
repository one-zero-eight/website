function DropListCloseIcon(props: any) {
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
        d="M.732 16.732a2.5 2.5 0 003.536 0L16.732 4.268A2.5 2.5 0 0013.197.732L.732 13.197a2.5 2.5 0 000 3.535z"
        fill="#fff"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M13.197.732a2.5 2.5 0 000 3.536L25.66 16.732a2.5 2.5 0 103.536-3.535L16.732.732a2.5 2.5 0 00-3.535 0z"
        fill="#fff"
      />
    </svg>
  );
}

export default DropListCloseIcon;
