import { useMe } from "@/api/accounts/user.ts";
import { SignInButton } from "@/components/common/SignInButton.tsx";
import { Trans } from "@lingui/react/macro";
import { PropsWithChildren } from "react";

export function AuthWall() {
  return (
    <div className="px-4">
      <h2 className="my-4 text-3xl font-medium">
        <Trans>Sign in to get access</Trans>
      </h2>
      <p className="text-base-content/75 mb-4 text-lg">
        <Trans>Use your Innopolis account to access InNoHassle services.</Trans>
      </p>
      <SignInButton />
    </div>
  );
}

export function RequireAuth({ children }: PropsWithChildren) {
  const { me } = useMe();
  if (!me) {
    // Unauthorized, show auth wall
    return <AuthWall />;
  }
  return <>{children}</>;
}
