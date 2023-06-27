function Arrow(props: any) {
  return (
    <svg
      className={"rotate-90 sm:rotate-0 " + props.className}
      width="136"
      height="38"
      viewBox="0 0 136 38"
      fill="none"
      xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 16.5C1.61929 16.5 0.5 17.6193 0.5 19C0.5 20.3807 1.61929 21.5 3 21.5V16.5ZM134.768 20.7678C135.744 19.7915 135.744 18.2085 134.768 17.2322L118.858 1.32233C117.882 0.34602 116.299 0.34602 115.322 1.32233C114.346 2.29864 114.346 3.88155 115.322 4.85786L129.464 19L115.322 33.1421C114.346 34.1184 114.346 35.7014 115.322 36.6777C116.299 37.654 117.882 37.654 118.858 36.6777L134.768 20.7678ZM3 21.5H133V16.5H3V21.5Z"
        fill="#2C2C2C"
      />
    </svg>
  )
}

export default Arrow;