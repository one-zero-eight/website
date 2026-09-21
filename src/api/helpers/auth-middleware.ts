import {
  getMyAccessToken,
  invalidateMyAccessToken,
} from "@/api/helpers/access-token.ts";
import { Middleware } from "@/api/helpers/create-fetch-client";
import {
  getRoomTvAccessToken,
  invalidateRoomTvAccessToken,
  isRoomTvPage,
} from "@/api/helpers/room-tv-auth.ts";

// TEST ONLY: impersonate a fixed InNoHassle Accounts user for the local mock-mode
// clubs backend (`accounts.mock: true` in monorepo settings.yaml), using the
// identity from VITE_DEV_MOCK_INNOHASSLE_ID / VITE_DEV_MOCK_EMAIL instead of a real
// Innopolis SSO login, which that backend can't verify anyway.
function getMockClubsToken(): string | null {
  if (!import.meta.env.DEV) return null;
  const innohassleId = import.meta.env.VITE_DEV_MOCK_INNOHASSLE_ID;
  const email = import.meta.env.VITE_DEV_MOCK_EMAIL;
  if (!innohassleId || !email) return null;
  return JSON.stringify({ innohassle_id: innohassleId, email });
}

function getAccessTokenForRequest(url: string) {
  const mockClubsToken = getMockClubsToken();
  if (mockClubsToken && url.startsWith(import.meta.env.VITE_CLUBS_API_URL)) {
    return mockClubsToken;
  }
  if (isRoomTvPage()) {
    return getRoomTvAccessToken();
  }
  return getMyAccessToken();
}

export const authMiddleware: Middleware = {
  async onRequest({ request }) {
    // Check the requested URL to add token only to our API
    if (
      !request.url.startsWith("https://api.innohassle.ru/") &&
      !request.url.startsWith("http://localhost") &&
      !request.url.startsWith("https://local.innohassle.ru")
    )
      return;

    const token = getAccessTokenForRequest(request.url);
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
      !response.url.startsWith("https://local.innohassle.ru")
    )
      return;

    if (response.status === 401 && request.headers.has("Authorization")) {
      const authHeader = request.headers.get("Authorization");
      const mockClubsToken = getMockClubsToken();
      const roomTvToken = getRoomTvAccessToken();
      if (mockClubsToken && authHeader === `Bearer ${mockClubsToken}`) {
        console.log("[mock-clubs-auth] Got 401 for mock dev clubs token");
      } else if (roomTvToken && authHeader === `Bearer ${roomTvToken}`) {
        console.log(
          "[room-tv-auth] Got 401, invalidating room TV access token",
        );
        invalidateRoomTvAccessToken();
      } else {
        console.log("[auth] Got 401, invalidating access token");
        invalidateMyAccessToken();
      }
      throw new Error("Unauthorized");
    }
    return response;
  },
};
