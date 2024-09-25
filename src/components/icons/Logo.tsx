import { IconProps } from "@/components/icons/IconProps";
import clsx from "clsx";
import LogoInvertSVG from "./logo-invert.svg";
import LogoSVG from "./logo.svg";

function Logo(props: Omit<IconProps, "fill">) {
  return (
    <>
      <img
        src={LogoInvertSVG}
        alt="logo"
        {...props}
        className={clsx("flex dark:hidden", props.className)}
      />
      <img
        src={LogoSVG}
        alt="logo"
        {...props}
        className={clsx("hidden dark:flex", props.className)}
      />
    </>
  );
}

export default Logo;
