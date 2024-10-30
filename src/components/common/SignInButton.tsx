import { navigateToSignIn } from "@/api/accounts/sign-in.ts";
import Tooltip from "@/components/common/Tooltip.tsx";
import clsx from "clsx";
import { forwardRef } from "react";

export type SignInButtonProps = {
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  signInRedirect?: string;
};

export const SignInButton = forwardRef(function SignInButton_(
  { onClick, className, signInRedirect }: SignInButtonProps,
  ref: React.Ref<HTMLButtonElement>,
) {
  return (
    <button
      ref={ref}
      rel="nofollow noindex"
      className={clsx(
        "flex h-14 w-fit items-center justify-center gap-4 rounded-2xl border-2 border-brand-violet bg-base px-6 py-2 text-xl font-medium hover:bg-primary-hover",
        className,
      )}
      onClick={(e) => {
        navigateToSignIn(signInRedirect);
        onClick?.(e);
      }}
    >
      <span className="icon-[material-symbols--login] -ml-2 text-4xl text-icon-main" />
      Sign in
    </button>
  );
});

export function SignInButtonIcon({
  onClick,
  signInRedirect,
}: SignInButtonProps) {
  return (
    <Tooltip content="Sign in">
      <button
        className="flex h-14 w-14 flex-col items-center justify-center rounded-xl text-icon-main/50 hover:bg-secondary-main"
        onClick={(e) => {
          navigateToSignIn(signInRedirect);
          onClick?.(e);
        }}
      >
        <span className="icon-[material-symbols--login-rounded] text-4xl" />
      </button>
    </Tooltip>
  );
}
