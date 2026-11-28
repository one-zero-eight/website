import { authMiddleware } from "@/api/helpers/auth-middleware.ts";
import createQueryClient from "@/api/helpers/create-query-client.ts";
import createFetchClient from "@/api/helpers/create-fetch-client";
import { SEARCH_API_URL } from "./links.ts";
import * as searchTypes from "./types.ts";

export type { searchTypes };

export const searchFetch = createFetchClient<searchTypes.paths>({
  baseUrl: SEARCH_API_URL,
});
searchFetch.use(authMiddleware);
export const $search = createQueryClient(searchFetch, "search");
