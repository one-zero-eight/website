import { eventsFetch } from "@/api/events";
import { authMiddleware } from "@/api/helpers/auth-middleware.ts";
import createQueryClient from "@/api/helpers/create-query-client.ts";
import createFetchClient from "openapi-fetch";
import * as roomBookingTypes from "./types.ts";

export type { roomBookingTypes };

export const roomBookingFetch = createFetchClient<roomBookingTypes.paths>({
  baseUrl: import.meta.env.VITE_BOOKING_API_URL,
});
eventsFetch.use(authMiddleware);
export const $roomBooking = createQueryClient(roomBookingFetch, "roomBooking");
