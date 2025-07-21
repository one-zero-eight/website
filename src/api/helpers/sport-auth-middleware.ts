import {
  getMySportAccessToken,
  invalidateMySportAccessToken,
} from "@/api/helpers/sport-access-token.ts";
import { Middleware } from "openapi-fetch";

export const sportAuthMiddleware: Middleware = {
  async onRequest({ request }) {
    // Check the requested URL to add token only to InnoSport API
    if (!isSportUrl(request.url)) return;

    const token = getMySportAccessToken();
    if (token) {
      const newRequest = request.clone();
      newRequest.headers.set("Authorization", `Bearer ${token}`);
      return newRequest;
    }

    throw new Error("No sport access token available");
  },
  async onResponse({ response }) {
    // Check the final URL to ensure we are handling only InnoSport API
    if (!isSportUrl(response.url)) return;

    if (response.status === 401) {
      invalidateMySportAccessToken();
      throw new Error("Unauthorized");
    }
    return response;
  },
};

const isSportUrl = (url: string) => {
  return (
    url.startsWith("https://sport.innopolis.university/api/") ||
    url.startsWith("https://stage.sport.innopolis.university/api/") ||
    url.startsWith("http://localhost/api/")
  );
};
