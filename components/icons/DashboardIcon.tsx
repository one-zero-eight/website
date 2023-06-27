function DashboardIcon(props: any) {
  return (
    <svg
      width={40}
      height={40}
      fill="none"
      viewBox="0 -960 960 960"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      className="mr-4 hover:cursor-pointer"
      onClick={() => props.setSearchVisible(false)}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M189.058-113.304q-30.994 0-53.374-22.38-22.38-22.38-22.38-53.374v-581.884q0-31.06 22.38-53.486 22.38-22.427 53.374-22.427h581.884q31.06 0 53.486 22.427 22.427 22.426 22.427 53.486v581.884q0 30.994-22.427 53.374-22.426 22.38-53.486 22.38H189.058Zm0-75.754h257.609v-581.884H189.058v581.884Zm324.275 0h257.609v-291.609H513.333v291.609Zm0-358.275h257.609v-223.609H513.333v223.609Z"
      />
    </svg>
  );
}

export default DashboardIcon;