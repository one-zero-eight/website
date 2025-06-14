import {
  getMyAccessToken,
  invalidateMyAccessToken,
} from "@/api/helpers/access-token.ts";
import { Middleware } from "openapi-fetch";

export const authMiddleware: Middleware = {
  async onRequest({ request }) {
    // Check the requested URL to add token only to our API
    if (
      !(
        request.url.startsWith("https://api.innohassle.ru/") ||
        request.url.includes("api/workshops") ||
        request.url.startsWith("https://workshops.innohassle.ru/")
      )
    )
      return;

    const token = getMyAccessToken();
    if (token) {
      const newRequest = request.clone();
      newRequest.headers.set("Authorization", `Bearer ${token}`);
      return newRequest;
    }
    return request;
  },
  async onResponse({ response }) {
    // Check the final URL to ensure we are handling only our API
    if (
      !(
        response.url.startsWith("https://api.innohassle.ru/") ||
        response.url.includes("api/workshops") ||
        response.url.startsWith("https://workshops.innohassle.ru/")
      )
    )
      return;

    if (response.status === 401) {
      invalidateMyAccessToken();
      throw new Error("Unauthorized");
    }
    return response;
  },
};
