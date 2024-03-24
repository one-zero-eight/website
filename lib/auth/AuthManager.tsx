"use client";
import { accounts } from "@/lib/accounts";
import { useMyAccessToken } from "@/lib/auth/access";
import { useMe } from "@/lib/auth/user";
import { PropsWithChildren, useEffect } from "react";

export function AuthManager({ children }: PropsWithChildren) {
  // Always fetch the user, so we can understand if the user is logged in or not
  const { me } = useMe();

  const [token, setToken] = useMyAccessToken();
  const { refetch: refetchMyToken } = accounts.useTokensGenerateMyToken({
    query: { enabled: false },
  });

  useEffect(() => {
    // If the user doesn't have personal access token for services, we should fetch it
    if (!token && me) {
      refetchMyToken().then((result) => {
        if (result.isSuccess) {
          setToken(result.data.access_token);
        }
      });
    }
  }, [me, token, setToken, refetchMyToken]);

  return <>{children}</>;
}
