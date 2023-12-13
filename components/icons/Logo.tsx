import { IconProps } from "@/components/icons/IconProps";
import Image from "next/image";
import LogoInvertSVG from "./logo-invert.svg";
import LogoSVG from "./logo.svg";

function Logo(props: Omit<IconProps, "fill">) {
  return (
    <>
      <Image
        src={LogoInvertSVG}
        alt="logo"
        {...props}
        className="flex dark:hidden"
      />
      <Image src={LogoSVG} alt="logo" {...props} className="hidden dark:flex" />
    </>
  );
}

export default Logo;
