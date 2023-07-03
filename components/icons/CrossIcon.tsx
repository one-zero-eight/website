function CrossIcon(props: any) {
  return (
    <svg
      width={37}
      height={37}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      className="mr-4 hover:cursor-pointer"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M36.458.542a1.85 1.85 0 010 2.616l-33.3 33.3a1.85 1.85 0 11-2.616-2.616l33.3-33.3a1.85 1.85 0 012.616 0z"
        fill="#fff"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M.542.542a1.85 1.85 0 012.616 0l33.3 33.3a1.85 1.85 0 11-2.616 2.616l-33.3-33.3a1.85 1.85 0 010-2.616z"
        fill="#fff"
      />
    </svg>
  );
}

export default CrossIcon;
