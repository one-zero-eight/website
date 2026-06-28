import { accountsApiAvailabilityMiddleware } from "@/api/accounts/api-availability.ts";
import createQueryClient from "@/api/helpers/create-query-client";
import createFetchClient from "@/api/helpers/create-fetch-client";
import * as accountsTypes from "./types.ts";

export type { accountsTypes };

export const accountsFetch = createFetchClient<accountsTypes.paths>({
  baseUrl: import.meta.env.VITE_ACCOUNTS_API_URL,
  credentials: "include",
});
accountsFetch.use(accountsApiAvailabilityMiddleware);
export const $accounts = createQueryClient(accountsFetch, "accounts");
