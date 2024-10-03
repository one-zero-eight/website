import { authMiddleware } from "@/api/helpers/auth-middleware.ts";
import createQueryClient from "@/api/helpers/create-query-client.ts";
import createFetchClient from "openapi-fetch";
import * as eventsTypes from "./types.ts";

export type { eventsTypes };

export const eventsFetch = createFetchClient<eventsTypes.paths>({
  baseUrl: import.meta.env.VITE_EVENTS_API_URL,
});
eventsFetch.use(authMiddleware);
export const $events = createQueryClient(eventsFetch, "events");
