import {
  getMyAccessToken,
  invalidateMyAccessToken,
} from "@/api/helpers/access-token.ts";
import { Middleware } from "openapi-fetch";

export const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const token = getMyAccessToken();
    if (token) {
      const newRequest = request.clone();
      newRequest.headers.set("Authorization", `Bearer ${token}`);
      return newRequest;
    }
    return request;
  },
  async onResponse({ response }) {
    if (response.status === 401) {
      invalidateMyAccessToken();
      throw new Error("Unauthorized");
    }
    return response;
  },
};
