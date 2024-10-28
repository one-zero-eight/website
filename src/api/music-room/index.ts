import { authMiddleware } from "@/api/helpers/auth-middleware.ts";
import createQueryClient from "@/api/helpers/create-query-client.ts";
import createFetchClient from "openapi-fetch";
import * as musicRoomTypes from "./types.ts";

export type { musicRoomTypes };

export const musicRoomFetch = createFetchClient<musicRoomTypes.paths>({
  baseUrl: import.meta.env.VITE_MUSIC_ROOM_API_URL,
});
musicRoomFetch.use(authMiddleware);
export const $musicRoom = createQueryClient(musicRoomFetch, "musicRoom");
