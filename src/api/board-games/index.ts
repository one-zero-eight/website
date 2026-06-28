import { authMiddleware } from "@/api/helpers/auth-middleware.ts";
import createQueryClient from "@/api/helpers/create-query-client.ts";
import createFetchClient from "@/api/helpers/create-fetch-client";
import * as boardGamesTypes from "./types.ts";

export type { boardGamesTypes };

export const boardGamesFetch = createFetchClient<boardGamesTypes.paths>({
  baseUrl: import.meta.env.VITE_BOARD_GAMES_API_URL,
});
boardGamesFetch.use(authMiddleware);
export const $boardGames = createQueryClient(boardGamesFetch, "boardGames");
