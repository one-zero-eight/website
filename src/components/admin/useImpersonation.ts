import { $accounts, accountsTypes } from "@/api/accounts";
import { formatApiErrorMessage } from "@/api/helpers/create-query-client";
import { useMyAccessToken } from "@/api/helpers/access-token.ts";
import { invalidateMySportAccessToken } from "@/api/helpers/sport-access-token.ts";
import { getViewUserEmail, getViewUserName } from "@/components/admin/utils.ts";
import { useToast } from "@/components/toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useLocalStorage } from "usehooks-ts";

export type ImpersonatingUser = {
  id: string;
  name: string;
};

export const IMPERSONATING_USER_STORAGE_KEY = "impersonatingUser";

export function useImpersonatingUser() {
  return useLocalStorage<ImpersonatingUser | null>(
    IMPERSONATING_USER_STORAGE_KEY,
    null,
  );
}

export function useImpersonation(
  targetUser?: accountsTypes.SchemaViewUser | null,
) {
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();
  const [, setToken] = useMyAccessToken();
  const [impersonatingUser, setImpersonatingUser] = useImpersonatingUser();
  const [, setStoredMe] = useLocalStorage<accountsTypes.SchemaViewUser | null>(
    "user",
    null,
  );
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [isDepersonating, setIsDepersonating] = useState(false);

  const email = targetUser ? getViewUserEmail(targetUser) : undefined;

  const { refetch: refetchImpersonateToken } = $accounts.useQuery(
    "get",
    "/tokens/impersonate",
    {
      params: {
        query: {
          uid: targetUser?.id ?? "",
          email: email ?? "",
        },
      },
    },
    {
      enabled: false,
    },
  );

  const { refetch: refetchDepersonate } = $accounts.useQuery(
    "get",
    "/tokens/depersonate",
    {},
    {
      enabled: false,
    },
  );

  async function impersonate() {
    if (!targetUser) {
      showError("Error", "Select a user to impersonate.");
      return;
    }

    if (!email) {
      showError("Error", "User email is required for impersonation.");
      return;
    }

    setIsImpersonating(true);
    const result = await refetchImpersonateToken();
    setIsImpersonating(false);

    if (result.isError) {
      showError("Error", formatApiErrorMessage(result.error));
      return;
    }

    if (!result.data?.access_token) {
      showError("Error", "Impersonation token was not returned.");
      return;
    }

    setImpersonatingUser({
      id: targetUser.id,
      name: getViewUserName(targetUser),
    });
    setToken(result.data.access_token);
    invalidateMySportAccessToken();
    queryClient.clear();
    showSuccess("Success", `Now impersonating ${getViewUserName(targetUser)}`);
    window.location.assign("/");
  }

  async function depersonate() {
    setIsDepersonating(true);
    const result = await refetchDepersonate();
    setIsDepersonating(false);

    if (result.isError) {
      showError("Error", formatApiErrorMessage(result.error));
      return;
    }

    setImpersonatingUser(null);
    setStoredMe(null);
    setToken(null);
    invalidateMySportAccessToken();
    queryClient.clear();
    showSuccess("Success", "Impersonation cleared");
    window.location.assign("/admin");
  }

  return {
    impersonate,
    depersonate,
    isImpersonating,
    isDepersonating,
    impersonatingUser,
    canImpersonate: !!targetUser && !!email,
  };
}
