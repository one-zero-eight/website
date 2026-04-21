import { IconProps } from "@/components/icons/IconProps";
import { cn } from "@/lib/ui/cn";
import LogoOneZeroEightInvertSVG from "./one-zero-eight-invert.svg";
import LogoOneZeroEightSVG from "./one-zero-eight.svg";

function Logo108(props: Omit<IconProps, "fill">) {
  return (
    <>
      <img
        src={LogoOneZeroEightInvertSVG}
        alt="logo"
        {...props}
        className={cn("flex dark:hidden", props.className)}
      />
      <img
        src={LogoOneZeroEightSVG}
        alt="logo"
        {...props}
        className={cn("hidden dark:flex", props.className)}
      />
    </>
  );
}

export default Logo108;
