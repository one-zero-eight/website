import { accounts } from "@/lib/accounts";
import { invalidateMyAccessToken } from "@/lib/auth/access";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useIsClient, useLocalStorage } from "usehooks-ts";

export function useMe() {
  const [storedMe, setStoredMe] = useLocalStorage<accounts.User | null>(
    "user",
    null,
  );
  const isClient = useIsClient();
  const queryClient = useQueryClient();
  const { data: me, isPending } = accounts.useUsersGetMe();

  useEffect(() => {
    if (me || !isPending) {
      setStoredMe(me ?? null);
      if (!me) {
        const invalidated = invalidateMyAccessToken();
        if (invalidated) {
          queryClient.clear();
        }
      }
    }
  }, [me, isPending, setStoredMe, queryClient]);

  return { me: !isClient ? undefined : me || storedMe || undefined };
}
