function ScholarshipIcon(props) {
  return (
    <svg
      width={39}
      height={28}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 2.8C0 1.254 1.247 0 2.786 0h33.428A2.793 2.793 0 0139 2.8v22.4c0 1.546-1.247 2.8-2.786 2.8H2.786A2.793 2.793 0 010 25.2V2.8zm36.214 0H2.786v22.4h33.428V2.8z"
        fill={`${props.selected ? "#9A2EFF" : "#414141"}`}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M25.071 21c0-.773.624-1.4 1.393-1.4h5.572c.769 0 1.393.627 1.393 1.4 0 .773-.624 1.4-1.393 1.4h-5.572c-.769 0-1.393-.627-1.393-1.4zM16.714 21c0-.773.624-1.4 1.393-1.4h2.786c.77 0 1.393.627 1.393 1.4 0 .773-.624 1.4-1.393 1.4h-2.786c-.77 0-1.393-.627-1.393-1.4zM0 8.557c0-.773.624-1.4 1.393-1.4h36.214c.77 0 1.393.627 1.393 1.4 0 .774-.624 1.4-1.393 1.4H1.393C.623 9.957 0 9.332 0 8.557z"
        fill={`${props.selected ? "#9A2EFF" : "#414141"}`}
      />
    </svg>
  );
}

export default ScholarshipIcon;
