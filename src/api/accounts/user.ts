import { $accounts, accountsTypes } from "@/api/accounts";
import { useLocalStorage } from "usehooks-ts";

export function useMe() {
  const [storedMe] = useLocalStorage<accountsTypes.SchemaUser | null>(
    "user",
    null,
  );
  const { data: me } = $accounts.useQuery("get", "/users/me");
  return { me: me || storedMe || undefined };
}
