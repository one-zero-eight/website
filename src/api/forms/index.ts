import { authMiddleware } from "@/api/helpers/auth-middleware.ts";
import createQueryClient from "@/api/helpers/create-query-client.ts";
import createFetchClient from "openapi-fetch";
import * as formsTypes from "./types.ts";

export { formsTypes };

export const formsFetch = createFetchClient<formsTypes.paths>({
  baseUrl: import.meta.env.VITE_FORMS_API_URL,
});
formsFetch.use(authMiddleware);
export const $forms = createQueryClient(formsFetch, "forms");
