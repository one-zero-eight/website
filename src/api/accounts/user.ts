import { $accounts, accountsTypes } from "@/api/accounts";
import { useLocalStorage } from "usehooks-ts";

export function useMe() {
  const [storedMe] = useLocalStorage<accountsTypes.SchemaViewUser | null>(
    "user",
    null,
  );
  const { data: me } = $accounts.useQuery("get", "/users/me");
  return { me: me || storedMe || undefined };
}

export function getMyAvatarUrl() {
  return `${import.meta.env.VITE_ACCOUNTS_API_URL}/users/me/avatar.jpg`;
}
