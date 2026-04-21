import { IconProps } from "@/components/icons/IconProps";
import { cn } from "@/lib/ui/cn";
import LogoInvertSVG from "./logo-invert.svg";
import LogoSVG from "./logo.svg";

function Logo(props: Omit<IconProps, "fill">) {
  return (
    <>
      <img
        src={LogoInvertSVG}
        alt="logo"
        {...props}
        className={cn("flex dark:hidden", props.className)}
      />
      <img
        src={LogoSVG}
        alt="logo"
        {...props}
        className={cn("hidden dark:flex", props.className)}
      />
    </>
  );
}

export default Logo;
