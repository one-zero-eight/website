import { authMiddleware } from "@/api/helpers/auth-middleware.ts";
import createQueryClient from "@/api/helpers/create-query-client.ts";
import createFetchClient from "openapi-fetch";
import * as scheduleAssistantTypes from "./types.ts";

export type { scheduleAssistantTypes };

export const scheduleAssistantFetch =
  createFetchClient<scheduleAssistantTypes.paths>({
    baseUrl: import.meta.env.VITE_SCHEDULE_ASSISTANT_API_URL,
  });
scheduleAssistantFetch.use(authMiddleware);
export const $scheduleAssistant = createQueryClient(
  scheduleAssistantFetch,
  "scheduleAssistant",
);
