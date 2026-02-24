import { authMiddleware } from "@/api/helpers/auth-middleware.ts";
import createQueryClient from "@/api/helpers/create-query-client.ts";
import createFetchClient from "openapi-fetch";
import * as studentAffairsTypes from "./types.ts";

export type { studentAffairsTypes };

export const studentAffairsFetch = createFetchClient<studentAffairsTypes.paths>(
  {
    baseUrl: import.meta.env.VITE_STUDENT_AFFAIRS_API_URL,
  },
);
studentAffairsFetch.use(authMiddleware);
export const $studentAffairs = createQueryClient(
  studentAffairsFetch,
  "studentAffairs",
);
