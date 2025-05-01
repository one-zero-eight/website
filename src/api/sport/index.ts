import createQueryClient from "@/api/helpers/create-query-client.ts";
import { sportAuthMiddleware } from "@/api/helpers/sport-auth-middleware.ts";
import createFetchClient from "openapi-fetch";
import * as sportTypes from "./types.ts";

export type { sportTypes };

export const sportFetch = createFetchClient<sportTypes.paths>({
  baseUrl: import.meta.env.VITE_INNOSPORT_API_URL,
});
sportFetch.use(sportAuthMiddleware);
export const $sport = createQueryClient(sportFetch, "sport");
