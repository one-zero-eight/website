import { authMiddleware } from "@/api/helpers/auth-middleware.ts";
import createQueryClient from "@/api/helpers/create-query-client.ts";
import createFetchClient from "@/api/helpers/create-fetch-client";
import * as when2meetTypes from "./types.ts";

export type { when2meetTypes };

export const when2meetFetch = createFetchClient<when2meetTypes.paths>({
  baseUrl: import.meta.env.VITE_WHEN2MEET_API_URL,
});
when2meetFetch.use(authMiddleware);
export const $when2meet = createQueryClient(when2meetFetch, "when2meet");
