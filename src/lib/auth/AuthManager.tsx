import { accounts } from "@/lib/accounts";
import { invalidateMyAccessToken, useMyAccessToken } from "@/lib/auth/access";
import { useQueryClient } from "@tanstack/react-query";
import { PropsWithChildren, useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";

export function AuthManager({ children }: PropsWithChildren) {
  const [token, setToken] = useMyAccessToken();
  const queryClient = useQueryClient();
  const { refetch: refetchMyToken } = accounts.useTokensGenerateMyToken({
    query: { enabled: false },
  });
  const { data: me, isPending } = accounts.useUsersGetMe();
  const [_, setStoredMe] = useLocalStorage<accounts.User | null>("user", null);

  useEffect(() => {
    if (me || !isPending) {
      setStoredMe(me ?? null);
      if (!me) {
        invalidateMyAccessToken();
      }
    }
  }, [me, isPending, setStoredMe, queryClient]);

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
