import { authMiddleware } from "@/api/helpers/auth-middleware.ts";
import createQueryClient from "@/api/helpers/create-query-client.ts";
import createFetchClient from "openapi-fetch";
import * as printersTypes from "./types.ts";

export type { printersTypes };

export const printersFetch = createFetchClient<printersTypes.paths>({
  baseUrl: import.meta.env.VITE_PRINTERS_API_URL,
});
printersFetch.use(authMiddleware);
export const $printers = createQueryClient(printersFetch, "printers");
