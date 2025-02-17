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
        "flex h-14 w-fit items-center justify-center gap-4 rounded-2xl border-2 border-brand-violet bg-pagebg px-6 py-2 text-xl font-medium hover:bg-primary-hover",
        className,
      )}
      onClick={(e) => {
        navigateToSignIn(signInRedirect);
        onClick?.(e);
      }}
    >
      <span className="icon-[material-symbols--login] -ml-2 text-4xl text-contrast" />
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
        type="button"
        className="flex items-center justify-center rounded-xl p-2 hover:bg-secondary"
        onClick={(e) => {
          navigateToSignIn(signInRedirect);
          onClick?.(e);
        }}
      >
        <span className="icon-[material-symbols--login-rounded] -ml-2 text-3xl text-brand-violet" />
      </button>
    </Tooltip>
  );
}
