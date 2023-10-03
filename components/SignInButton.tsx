import { LoginIcon } from "@/components/icons/LoginIcon";
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
      <LoginIcon width={36} height={36} className="-ml-2 fill-icon-main" />
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
      <LoginIcon
        className="-ml-1 flex fill-icon-main/50"
        width={36}
        height={36}
      />
    </Link>
  );
}
