import { describe, expect, it } from "vitest";
import type { roomBookingTypes } from "@/api/room-booking";
import {
  BookingStatus,
  RoomAccess_levelAnyOf0 as Access,
} from "@/api/room-booking/types.ts";
import {
  buildBookingRecommendations,
  type BookingRecommendationsInput,
} from "./booking-recommendations.ts";

const nowMs = Date.parse("2026-05-11T09:00:00Z"); // Monday noon in Moscow.
const minute = 60_000;
const rangeEndMs = nowMs + 14 * 24 * 60 * minute;

function room(
  id: string,
  overrides: Partial<roomBookingTypes.SchemaRoom> = {},
): roomBookingTypes.SchemaRoom {
  return {
    id,
    title: `Room ${id}`,
    short_name: id,
    access_level: Access.yellow,
    restrict_daytime: false,
    ...overrides,
  };
}

function booking(
  roomId: string,
  startMinutes: number,
  endMinutes: number,
  overrides: Partial<roomBookingTypes.SchemaBooking> = {},
): roomBookingTypes.SchemaBooking {
  return {
    id: `${roomId}:${startMinutes}:${endMinutes}`,
    room_id: roomId,
    start: new Date(nowMs + startMinutes * minute).toISOString(),
    end: new Date(nowMs + endMinutes * minute).toISOString(),
    title: "Meeting",
    outlook_booking_id: null,
    outlook_entry_id: null,
    attendees: null,
    ...overrides,
  };
}

function recommend(overrides: Partial<BookingRecommendationsInput> = {}) {
  return buildBookingRecommendations({
    rooms: [room("A")],
    myBookings: [],
    allBookings: [],
    myAccessList: [],
    role: { is_student: true },
    nowMs,
    rangeEndMs,
    ...overrides,
  });
}

function attendee(
  roomId: string | null,
  status: roomBookingTypes.SchemaAttendee["status"],
): roomBookingTypes.SchemaAttendee {
  return { email: "room@example.com", assosiated_room_id: roomId, status };
}

describe("booking recommendations", () => {
  it("ranks free-now rooms by longest window and resolves ties by title/id", () => {
    const rooms = [room("D"), room("C"), room("B"), room("A")];
    rooms[0].title = rooms[1].title = "First";
    const allBookings = [booking("B", 10, 30), booking("A", 30, 50)];
    const originalRooms = structuredClone(rooms);
    const originalBookings = structuredClone(allBookings);
    expect(
      recommend({ rooms, allBookings }).map((item) => item.roomId),
    ).toEqual(["C", "D", "A", "B"]);
    expect(rooms).toEqual(originalRooms);
    expect(allBookings).toEqual(originalBookings);
  });

  it("puts current and upcoming own rooms first, deduplicates rooms and ignores ended bookings", () => {
    const current = booking("C", -10, 10);
    const futureA = booking("A", 20, 40);
    const result = recommend({
      rooms: [room("A"), room("B"), room("C"), room("D")],
      myBookings: [
        futureA,
        booking("B", -20, 0),
        booking("C", -5, 15),
        current,
        current,
      ],
    });
    expect(result.map((item) => [item.kind, item.roomId])).toEqual([
      ["booked", "C"],
      ["booked", "A"],
      ["available", "B"],
      ["available", "D"],
    ]);
    expect(result[0]).toMatchObject({ booking: current });
    expect(result[1]).toMatchObject({ booking: futureA });
  });

  it("caps the entire result at five even with more than five own rooms", () => {
    const rooms = Array.from({ length: 8 }, (_, i) => room(String(i)));
    expect(recommend({ rooms })).toHaveLength(5);
    const myBookings = rooms.map((item) => booking(item.id, -5, 5));
    const result = recommend({ rooms, myBookings: myBookings.reverse() });
    expect(result.map((item) => [item.kind, item.roomId])).toEqual(
      ["0", "1", "2", "3", "4"].map((id) => ["booked", id]),
    );
  });

  it("uses inclusive start and exclusive end for both own and other occupancy", () => {
    expect(recommend({ allBookings: [booking("A", 0, 10)] })).toEqual([]);
    expect(recommend({ allBookings: [booking("A", -10, 0)] })[0].kind).toBe(
      "available",
    );
    expect(recommend({ myBookings: [booking("A", 0, 10)] })[0].kind).toBe(
      "booked",
    );
    expect(recommend({ myBookings: [booking("A", -10, 0)] })[0].kind).toBe(
      "available",
    );
  });

  it("unions own and all intervals rather than overwriting stale duplicate IDs", () => {
    expect(
      recommend({
        allBookings: [
          booking("A", 10, 20, { id: "same" }),
          booking("A", 30, 40, { id: "same" }),
        ],
      })[0],
    ).toMatchObject({ availableUntilMs: nowMs + 10 * minute });
    expect(
      recommend({
        allBookings: [
          booking("A", -10, 20, { id: "same" }),
          booking("A", 30, 40, { id: "same" }),
        ],
      }),
    ).toEqual([]);
  });

  it("ignores only an explicit Decline from the matching room attendee", () => {
    const declined = booking("A", -10, 10, {
      attendees: [attendee("A", BookingStatus.Decline)],
    });
    expect(
      recommend({ myBookings: [declined], allBookings: [declined] })[0],
    ).toMatchObject({ kind: "available", nextBookingKnown: false });
    for (const attendees of [
      null,
      [attendee("A", null)],
      [attendee("A", BookingStatus.Unknown)],
      [attendee("A", BookingStatus.Tentative)],
      [attendee("A", BookingStatus.Accept)],
      [attendee("B", BookingStatus.Decline)],
      [attendee(null, BookingStatus.Decline)],
    ]) {
      expect(
        recommend({ allBookings: [booking("A", -10, 10, { attendees })] }),
      ).toEqual([]);
    }
  });

  it.each([
    { start: "not-a-date" },
    { end: "not-a-date" },
    { start: "2026-05-11T08:00:00" },
    { start: "2026-02-30T08:00:00Z" },
    { start: "2026-05-10T24:00:00Z" },
    { start: new Date(nowMs + minute).toISOString() },
    { end: new Date(nowMs - minute).toISOString() },
  ])(
    "excludes unsafe intervals from own display and free suggestions: %j",
    (invalid) => {
      const badBooking = booking("A", 0, 1, invalid);
      for (const source of ["myBookings", "allBookings"] as const) {
        expect(recommend({ [source]: [badBooking] })).toEqual([]);
      }
    },
  );

  it("does not let an invalid duplicate disappear behind a valid future record", () => {
    expect(
      recommend({
        myBookings: [booking("A", 20, 30)],
        allBookings: [booking("A", 20, 30, { end: "invalid" })],
      }),
    ).toEqual([]);
  });

  it("bounds unknown next bookings by the queried horizon, never infinity", () => {
    for (const startMinutes of [14 * 24 * 60, 15 * 24 * 60]) {
      expect(
        recommend({
          allBookings: [booking("A", startMinutes, startMinutes + 60)],
        })[0],
      ).toMatchObject({
        availableUntilMs: rangeEndMs,
        nextBookingKnown: false,
      });
    }
    expect(recommend()[0]).toMatchObject({
      availableUntilMs: rangeEndMs,
      nextBookingKnown: false,
    });
    expect(
      recommend({
        allBookings: [booking("A", 14 * 24 * 60 - 1, 14 * 24 * 60)],
      })[0],
    ).toMatchObject({
      availableUntilMs: rangeEndMs - minute,
      nextBookingKnown: true,
    });
  });

  it.each([NaN, Infinity, nowMs, nowMs - 1])(
    "suppresses availability for invalid/expired horizon %s but keeps current own",
    (rangeEndMs) => {
      expect(recommend({ rangeEndMs })).toEqual([]);
      expect(
        recommend({
          rooms: [],
          role: {},
          rangeEndMs,
          myBookings: [booking("A", -10, 10)],
        })[0],
      ).toMatchObject({ kind: "booked", roomId: "A", roomTitle: "A" });
    },
  );

  it("rejects invalid now even when own bookings are present", () => {
    expect(
      recommend({ nowMs: NaN, myBookings: [booking("A", -10, 10)] }),
    ).toEqual([]);
  });
});

describe("backend-aligned room access", () => {
  const rooms = [
    room("yellow"),
    room("daytime", { restrict_daytime: true }),
    room("red", { access_level: Access.red }),
    room("special", { access_level: Access.special }),
    room("null", { access_level: null }),
    room("missing", { access_level: undefined }),
  ];

  it.each([
    [{ is_student: true }, ["yellow"]],
    [{ is_staff: true }, ["daytime", "red", "yellow"]],
    [{ is_student: true, is_staff: true }, ["daytime", "red", "yellow"]],
    [{}, []],
    [{ is_student: false, is_staff: false }, []],
  ] satisfies [BookingRecommendationsInput["role"], string[]][])(
    "enforces role and known access levels: %j",
    (role, expected) => {
      expect(recommend({ rooms, role }).map((item) => item.roomId)).toEqual(
        expected,
      );
    },
  );

  it.each([{ is_student: true }, { is_staff: true }, {}])(
    "special access overrides room restrictions, but never missing roles: %j",
    (role) => {
      for (const item of rooms) {
        expect(
          recommend({ rooms: [item], myAccessList: [item], role }),
        ).toHaveLength(role.is_student || role.is_staff ? 1 : 0);
      }
    },
  );

  it.each([
    ["2026-05-11T04:59:59Z", true], // Monday 07:59:59 Moscow.
    ["2026-05-11T05:00:00Z", false], // 08:00.
    ["2026-05-11T15:59:59Z", false], // 18:59:59.
    ["2026-05-11T16:00:00Z", true], // 19:00.
    ["2026-05-15T21:00:00Z", true], // Saturday in Moscow, Friday in America.
    ["2026-05-16T09:00:00Z", true],
    ["2026-05-17T09:00:00Z", true],
    ["2026-05-18T05:00:00Z", false],
  ])(
    "uses Moscow weekday and hour, independent of local TZ: %s",
    (instant, allowed) => {
      const result = recommend({
        rooms: [room("A", { restrict_daytime: true })],
        nowMs: Date.parse(instant),
      });
      expect(result).toHaveLength(allowed ? 1 : 0);
    },
  );

  it("returns occupancy windows rather than applying the three-hour duration limit", () => {
    expect(
      recommend({
        rooms: [room("A", { restrict_daytime: true })],
        nowMs: Date.parse("2026-05-11T04:59:59Z"),
      })[0],
    ).toMatchObject({ availableUntilMs: rangeEndMs, nextBookingKnown: false });
  });

  it("keeps current own rooms regardless of current access permission", () => {
    expect(
      recommend({ rooms, role: {}, myBookings: [booking("red", -1, 1)] })[0],
    ).toMatchObject({ kind: "booked", roomId: "red" });
  });
});
