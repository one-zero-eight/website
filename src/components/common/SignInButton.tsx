import { getSignInUrl } from "@/lib/auth/paths";
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
        "flex h-14 w-fit items-center justify-center gap-4 rounded-2xl border-2 border-focus bg-base px-6 py-2 text-xl font-medium hover:bg-primary-hover",
        className,
      )}
      onClick={(e) => {
        window.location.assign(getSignInUrl(signInRedirect));
        onClick?.(e);
      }}
    >
      <span className="icon-[material-symbols--login] -ml-2 text-4xl text-icon-main" />
      Sign in
    </button>
  );
});

export const SignInButtonIcon = forwardRef(function SignInButtonIcon(
  { onClick, className, signInRedirect }: SignInButtonProps,
  ref: React.Ref<HTMLButtonElement>,
) {
  return (
    <button
      ref={ref}
      rel="nofollow noindex"
      className={clsx(
        "flex h-18p w-18p items-center justify-center rounded-2xl bg-primary-main hover:bg-primary-hover",
        className,
      )}
      onClick={(e) => {
        window.location.assign(getSignInUrl(signInRedirect));
        onClick?.(e);
      }}
    >
      <span className="icon-[material-symbols--login] -ml-1 text-4xl text-icon-main/50" />
    </button>
  );
});
