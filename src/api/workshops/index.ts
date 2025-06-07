import { authMiddleware } from "@/api/helpers/auth-middleware.ts";
import createQueryClient from "@/api/helpers/create-query-client.ts";
import createFetchClient from "openapi-fetch";
import * as workshopsTypes from "./types.ts";

export type { workshopsTypes };

export const workshopsFetch = createFetchClient<workshopsTypes.paths>({
  baseUrl: import.meta.env.VITE_WORKSHOPS_API_URL,
});
workshopsFetch.use(authMiddleware);
export const $workshops = createQueryClient(workshopsFetch, "workshops");
