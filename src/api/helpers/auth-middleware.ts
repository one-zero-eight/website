import {
  getMyAccessToken,
  invalidateMyAccessToken,
} from "@/api/helpers/access-token.ts";
import { Middleware } from "@/api/helpers/create-fetch-client";

export const authMiddleware: Middleware = {
  async onRequest({ request }) {
    // Check the requested URL to add token only to our API
    if (
      !request.url.startsWith("https://api.innohassle.ru/") &&
      !request.url.startsWith("http://localhost") &&
      !request.url.startsWith("https://local.innohassle.ru:3000/")
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
  async onResponse({ request, response }) {
    // Check the final URL to ensure we are handling only our API
    if (
      !response.url.startsWith("https://api.innohassle.ru/") &&
      !response.url.startsWith("http://localhost") &&
      !response.url.startsWith("https://local.innohassle.ru:3000/")
    )
      return;

    if (response.status === 401 && request.headers.has("Authorization")) {
      console.log("[auth] Got 401, invalidating access token");
      invalidateMyAccessToken();
      throw new Error("Unauthorized");
    }
    return response;
  },
};
