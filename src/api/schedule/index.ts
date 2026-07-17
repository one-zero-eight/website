import { authMiddleware } from "@/api/helpers/auth-middleware.ts";
import createQueryClient from "@/api/helpers/create-query-client.ts";
import createFetchClient from "@/api/helpers/create-fetch-client";
import * as scheduleTypes from "./types.ts";

export type { scheduleTypes };

export const scheduleFetch = createFetchClient<scheduleTypes.paths>({
  baseUrl: import.meta.env.VITE_SCHEDULE_API_URL,
});
scheduleFetch.use(authMiddleware);
export const $schedule = createQueryClient(scheduleFetch, "schedule");
