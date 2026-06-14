import { IconProps } from "@/components/icons/IconProps";
import LogoOneZeroEightSVG from "./one-zero-eight.svg";

function Logo108(props: Omit<IconProps, "fill">) {
  return (
    <img
      src={LogoOneZeroEightSVG}
      alt="logo"
      {...props}
      className={props.className}
    />
  );
}

export default Logo108;
