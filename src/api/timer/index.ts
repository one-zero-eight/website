import { authMiddleware } from "@/api/helpers/auth-middleware.ts";
import createQueryClient from "@/api/helpers/create-query-client.ts";
import createFetchClient from "@/api/helpers/create-fetch-client";
import * as timerTypes from "./types.ts";

export type { timerTypes };

export const timerFetch = createFetchClient<timerTypes.paths>({
  baseUrl: import.meta.env.VITE_TIMER_API_URL,
});
timerFetch.use(authMiddleware);
export const $timer = createQueryClient(timerFetch, "timer");
