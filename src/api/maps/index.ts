import { authMiddleware } from "@/api/helpers/auth-middleware.ts";
import createQueryClient from "@/api/helpers/create-query-client.ts";
import createFetchClient from "openapi-fetch";
import * as mapsTypes from "./types.ts";

export type { mapsTypes };

export const mapsFetch = createFetchClient<mapsTypes.paths>({
  baseUrl: import.meta.env.VITE_MAPS_API_URL,
});
mapsFetch.use(authMiddleware);
export const $maps = createQueryClient(mapsFetch, "maps");
