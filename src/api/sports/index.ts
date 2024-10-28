import { authMiddleware } from "@/api/helpers/auth-middleware.ts";
import createQueryClient from "@/api/helpers/create-query-client.ts";
import createFetchClient from "openapi-fetch";
import * as sportsTypes from "./types.ts";

export type { sportsTypes };

export const sportsFetch = createFetchClient<sportsTypes.paths>({
  baseUrl: import.meta.env.VITE_SPORTS_API_URL,
});
sportsFetch.use(authMiddleware);
export const $sports = createQueryClient(sportsFetch, "sports");
