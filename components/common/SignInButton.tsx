import { useAuthPaths } from "@/lib/auth/paths";
import clsx from "clsx";
import { useRouter } from "next/navigation";

export type SignInButtonProps = {
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  ref?: React.RefObject<HTMLButtonElement>;
};

export default function SignInButton(props: SignInButtonProps) {
  const router = useRouter();
  const { signIn } = useAuthPaths();

  return (
    <button
      rel="nofollow noindex"
      {...props}
      className={clsx(
        "flex h-14 w-fit items-center justify-center gap-4 rounded-2xl border-2 border-focus bg-base px-6 py-2 text-xl font-medium hover:bg-primary-hover",
        props.className,
      )}
      onClick={(e) => {
        router.push(signIn);
        if (props.onClick) {
          props.onClick(e);
        }
      }}
    >
      <span className="icon-[material-symbols--login] -ml-2 text-4xl text-icon-main" />
      Sign in
    </button>
  );
}

export function SignInButtonIcon(props: SignInButtonProps) {
  const router = useRouter();
  const { signIn } = useAuthPaths();

  return (
    <button
      rel="nofollow noindex"
      {...props}
      className={clsx(
        "flex h-18p w-18p items-center justify-center rounded-2xl bg-primary-main hover:bg-primary-hover",
        props.className,
      )}
      onClick={(e) => {
        router.push(signIn);
        if (props.onClick) {
          props.onClick(e);
        }
      }}
    >
      <span className="icon-[material-symbols--login] -ml-1 text-4xl text-icon-main/50" />
    </button>
  );
}
