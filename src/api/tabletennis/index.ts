import { authMiddleware } from "@/api/helpers/auth-middleware.ts";
import createQueryClient from "@/api/helpers/create-query-client.ts";
import createFetchClient from "@/api/helpers/create-fetch-client";
import * as tabletennisTypes from "./types.ts";

export { tabletennisTypes };

export const tabletennisFetch = createFetchClient<tabletennisTypes.paths>({
  baseUrl: import.meta.env.VITE_TABLETENNIS_API_URL,
});
tabletennisFetch.use(authMiddleware);
export const $tabletennis = createQueryClient(tabletennisFetch, "tabletennis");
