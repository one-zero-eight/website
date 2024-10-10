import { authMiddleware } from "@/api/helpers/auth-middleware.ts";
import createQueryClient from "@/api/helpers/create-query-client.ts";
import createFetchClient from "openapi-fetch";
import * as searchTypes from "./types.ts";

export type { searchTypes };

export const searchFetch = createFetchClient<searchTypes.paths>({
  baseUrl: import.meta.env.VITE_SEARCH_API_URL,
});
searchFetch.use(authMiddleware);
export const $search = createQueryClient(searchFetch, "search");
