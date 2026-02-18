import { navigateToSignIn } from "@/api/accounts/sign-in.ts";
import Tooltip from "@/components/common/Tooltip.tsx";
import clsx from "clsx";
import { forwardRef } from "react";

export type SignInButtonProps = {
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

export const SignInButton = forwardRef(function SignInButton_(
  { onClick, className }: SignInButtonProps,
  ref: React.Ref<HTMLButtonElement>,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={clsx(
        "border-primary bg-base-100 hover:bg-base-300 rounded-box flex h-14 w-fit items-center justify-center gap-4 border-2 px-6 py-2 text-xl font-medium",
        className,
      )}
      onClick={(e) => {
        navigateToSignIn();
        onClick?.(e);
      }}
    >
      <span className="icon-[material-symbols--login] text-base-content -ml-2 text-4xl" />
      Sign in
    </button>
  );
});

export function SignInButtonIcon({ onClick }: SignInButtonProps) {
  return (
    <Tooltip content="Sign in">
      <button
        type="button"
        className="hover:bg-base-300 flex items-center justify-center rounded-xl p-2"
        onClick={(e) => {
          navigateToSignIn();
          onClick?.(e);
        }}
      >
        <span className="icon-[material-symbols--login-rounded] text-primary -ml-2 text-3xl" />
      </button>
    </Tooltip>
  );
}
