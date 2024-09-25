import { accounts } from "@/lib/accounts";
import { useLocalStorage } from "usehooks-ts";

export function useMe() {
  const [storedMe] = useLocalStorage<accounts.User | null>("user", null);
  const { data: me } = accounts.useUsersGetMe();
  return { me: me || storedMe || undefined };
}
