import { navigateToSignIn } from "@/api/accounts/sign-in.ts";
import Tooltip from "@/components/common/Tooltip.tsx";
import { cn } from "@/lib/ui/cn";
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
      className={cn(
        "btn btn-primary btn-outline btn-lg w-fit gap-2",
        className,
      )}
      onClick={(e) => {
        navigateToSignIn();
        onClick?.(e);
      }}
    >
      <span className="icon-[material-symbols--login] -ml-2 text-3xl" />
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
