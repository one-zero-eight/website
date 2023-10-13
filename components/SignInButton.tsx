import { useAuthPaths } from "@/lib/auth";
import Link from "next/link";

export type SignInButtonProps = Partial<React.ComponentProps<typeof Link>>;

export default function SignInButton(props: SignInButtonProps) {
  const { signIn } = useAuthPaths();

  return (
    <Link
      href={signIn}
      rel="nofollow noindex"
      {...props}
      className={`flex h-14 w-fit items-center justify-center gap-4 rounded-2xl border-2 border-focus_color px-6 py-2 text-xl font-medium hover:bg-primary-hover ${
        props.className ?? ""
      }`}
    >
      <span className="icon-[material-symbols--login] -ml-2 text-4xl text-icon-main" />
      Sign in
    </Link>
  );
}

export function SignInButtonIcon(props: SignInButtonProps) {
  const { signIn } = useAuthPaths();

  return (
    <Link
      href={signIn}
      rel="nofollow noindex"
      {...props}
      className={`flex h-18p w-18p items-center justify-center rounded-2xl bg-primary-main hover:bg-primary-hover ${
        props.className ?? ""
      }`}
    >
      <span className="icon-[material-symbols--login] -ml-1 text-4xl text-icon-main/50" />
    </Link>
  );
}
