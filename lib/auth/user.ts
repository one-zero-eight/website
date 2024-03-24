import { accounts } from "@/lib/accounts";
import { invalidateMyAccessToken } from "@/lib/auth/access";
import { useEffect } from "react";
import { useIsClient, useLocalStorage } from "usehooks-ts";

export function useMe() {
  const [storedMe, setStoredMe] = useLocalStorage<accounts.User | null>(
    "user",
    null,
  );
  const isClient = useIsClient();
  const { data: me, isPending } = accounts.useUsersGetMe();

  useEffect(() => {
    if (me || !isPending) {
      setStoredMe(me ?? null);
      if (!me) {
        invalidateMyAccessToken();
      }
    }
  }, [me, isPending, setStoredMe]);

  return { me: !isClient ? undefined : me || storedMe || undefined };
}
