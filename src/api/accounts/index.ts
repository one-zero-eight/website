import createQueryClient from "@/api/helpers/create-query-client.ts";
import createFetchClient from "openapi-fetch";
import * as accountsTypes from "./types.ts";

export type { accountsTypes };

export const accountsFetch = createFetchClient<accountsTypes.paths>({
  baseUrl: import.meta.env.VITE_ACCOUNTS_API_URL,
  credentials: "include",
});
export const $accounts = createQueryClient(accountsFetch, "accounts");
