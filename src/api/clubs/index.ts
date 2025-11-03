import { authMiddleware } from "@/api/helpers/auth-middleware.ts";
import createQueryClient from "@/api/helpers/create-query-client.ts";
import createFetchClient from "openapi-fetch";
import * as clubsTypes from "./types.ts";

export { clubsTypes };

export const clubsFetch = createFetchClient<clubsTypes.paths>({
  baseUrl: import.meta.env.VITE_CLUBS_API_URL,
});
clubsFetch.use(authMiddleware);
export const $clubs = createQueryClient(clubsFetch, "clubs");
