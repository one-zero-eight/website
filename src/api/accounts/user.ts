import { $accounts, accountsTypes } from "@/api/accounts";
import { useLocalStorage } from "usehooks-ts";

// TEST ONLY: sign in as VITE_DEV_MOCK_INNOHASSLE_ID/EMAIL when there's no real
// InNoHassle Accounts session, so RequireAuth works against the local mock-mode
// clubs backend without a real Innopolis SSO login (that identity may not even
// exist in real SSO, e.g. the test club leader account).
function getMockMe(): accountsTypes.SchemaViewUser | undefined {
  if (!import.meta.env.DEV) return undefined;
  const id = import.meta.env.VITE_DEV_MOCK_INNOHASSLE_ID;
  const email = import.meta.env.VITE_DEV_MOCK_EMAIL;
  if (!id || !email) return undefined;
  return {
    id,
    innohassle_admin: false,
    innopolis_info: {
      email,
      is_student: true,
      is_staff: false,
      is_college: false,
    },
  } as accountsTypes.SchemaViewUser;
}

export function useMe() {
  const [storedMe] = useLocalStorage<accountsTypes.SchemaViewUser | null>(
    "user",
    null,
  );
  const { data: me } = $accounts.useQuery("get", "/users/me");
  return { me: me || storedMe || getMockMe() };
}

export function getMyAvatarUrl() {
  return `${import.meta.env.VITE_ACCOUNTS_API_URL}/users/me/avatar.jpg`;
}
