import { $accounts, accountsTypes } from "@/api/accounts";
import {
  navigateToSignIn,
  navigateToSignOut,
  shouldAutoSignIn,
} from "@/api/accounts/sign-in.ts";
import {
  checkIsTokenExpired,
  invalidateMyAccessToken,
  useIsMyAccessTokenExpired,
  useMyAccessToken,
} from "@/api/helpers/access-token.ts";
import {
  invalidateMySportAccessToken,
  useMySportAccessToken,
} from "@/api/helpers/sport-access-token.ts";
import { useQueryClient } from "@tanstack/react-query";
import { PropsWithChildren, useEffect, useState } from "react";
import { useLocalStorage } from "usehooks-ts";

export function AuthManager({ children }: PropsWithChildren) {
  const [token, setToken] = useMyAccessToken();
  const isTokenExpired = useIsMyAccessTokenExpired();
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

  const [sportToken, setSportToken] = useMySportAccessToken();
  const { refetch: refetchMySportToken } = $accounts.useQuery(
    "get",
    "/tokens/generate-my-sport-token",
    {},
    { enabled: false },
  );
  const [sportTokenRefetchCount, setSportTokenRefetchCount] = useState(0);
  const shouldRefetchSportToken =
    !sportToken && me && sportTokenRefetchCount < 2;

  useEffect(() => {
    if (me || !isPending) {
      setStoredMe(me ?? null);
      if (!me) {
        invalidateMyAccessToken();
        invalidateMySportAccessToken();
        if (shouldAutoSignIn()) {
          navigateToSignIn(window.location.href, "none");
        }
      }
    }
  }, [me, isPending, setStoredMe]);

  useEffect(() => {
    // Invalidate token if it's expired
    if (token && isTokenExpired && checkIsTokenExpired(token, new Date())) {
      invalidateMyAccessToken();
    }
  }, [isTokenExpired, token]);

  useEffect(() => {
    // If the user doesn't have personal access token for services, we should fetch it
    if (!token && me) {
      console.log("Fetching new access token for the user...");
      refetchMyToken().then((result) => {
        if (result.isSuccess) {
          setToken(result.data.access_token);
          queryClient.clear();
        }
      });
    }
  }, [me, token, setToken, refetchMyToken, queryClient]);

  useEffect(() => {
    // If the user doesn't have personal access token for services, we should fetch it
    if (shouldRefetchSportToken) {
      setSportTokenRefetchCount((v) => v + 1);
      refetchMySportToken().then((result) => {
        if (result.isSuccess) {
          setSportToken(result.data.access_token);
          queryClient.clear();
        }
      });
    }
  }, [
    shouldRefetchSportToken,
    setSportToken,
    refetchMySportToken,
    queryClient,
  ]);

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
