import { authMiddleware } from "@/api/helpers/auth-middleware.ts";
import createQueryClient from "@/api/helpers/create-query-client.ts";
import createFetchClient from "openapi-fetch";
import * as guardTypes from "./types.ts";

export { guardTypes };

export const guardFetch = createFetchClient<guardTypes.paths>({
  baseUrl: import.meta.env.VITE_GUARD_API_URL,
});
guardFetch.use(authMiddleware);
export const $guard = createQueryClient(guardFetch, "guard");
