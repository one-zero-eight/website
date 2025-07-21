import { $accounts, accountsTypes } from "@/api/accounts";
import {
  navigateToSignIn,
  navigateToSignOut,
  shouldAutoSignIn,
} from "@/api/accounts/sign-in.ts";
import {
  invalidateMyAccessToken,
  useMyAccessToken,
} from "@/api/helpers/access-token.ts";
import { useQueryClient } from "@tanstack/react-query";
import { PropsWithChildren, useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";

export function AuthManager({ children }: PropsWithChildren) {
  const [token, setToken] = useMyAccessToken();
  const queryClient = useQueryClient();
  const { refetch: refetchMyToken } = $accounts.useQuery(
    "get",
    "/tokens/generate-my-token",
    {},
    { enabled: false },
  );
  const { data: me, isPending } = $accounts.useQuery("get", "/users/me");
  const [_, setStoredMe] = useLocalStorage<accountsTypes.SchemaUser | null>(
    "user",
    null,
  );

  useEffect(() => {
    if (me || !isPending) {
      setStoredMe(me ?? null);
      if (!me) {
        invalidateMyAccessToken();
        if (shouldAutoSignIn()) {
          navigateToSignIn(window.location.href, "none");
        }
      }
    }
  }, [me, isPending, setStoredMe]);

  useEffect(() => {
    // If the user doesn't have personal access token for services, we should fetch it
    if (!token && me) {
      refetchMyToken().then((result) => {
        if (result.isSuccess) {
          setToken(result.data.access_token);
          queryClient.clear();
        }
      });
    }
  }, [me, token, setToken, refetchMyToken, queryClient]);

  useEffect(() => {
    // Log out if the user has outdated Innopolis SSO info
    if (
      me?.innopolis_sso?.issued_at &&
      new Date(me.innopolis_sso.issued_at) < new Date("2025-06-01T00:00:00Z") &&
      localStorage.getItem("loggedOutJune") !== "true"
    ) {
      localStorage.setItem("loggedOutJune", "true"); // Prevent multiple logouts
      navigateToSignOut();
    }
  }, [me]);

  return <>{children}</>;
}
