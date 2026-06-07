import { authMiddleware } from "@/api/helpers/auth-middleware.ts";
import createQueryClient from "@/api/helpers/create-query-client.ts";
import createFetchClient from "@/api/helpers/create-fetch-client";

export const customFetch = createFetchClient<any>();
customFetch.use(authMiddleware);
export const $custom = createQueryClient(customFetch, "custom");
