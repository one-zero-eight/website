import createQueryClient from "@/api/helpers/create-query-client.ts";
import { authMiddleware } from "@/api/helpers/auth-middleware.ts";
import createFetchClient from "openapi-fetch";
import * as sportTypes from "./types.ts";

export type { sportTypes };

export const sportFetch = createFetchClient<sportTypes.paths>({
  baseUrl: import.meta.env.VITE_INNOSPORT_API_URL,
});
sportFetch.use(authMiddleware);

export const $sport = createQueryClient(sportFetch, "sport");
