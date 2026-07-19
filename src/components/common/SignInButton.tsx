import { navigateToSignIn } from "@/api/accounts/sign-in.tsx";
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
      className={cn("btn btn-primary w-fit shrink-0 gap-2", className)}
      onClick={(e) => {
        navigateToSignIn();
        onClick?.(e);
      }}
    >
      Sign in
    </button>
  );
});
