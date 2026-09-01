import { describe, expect, test } from "vitest";
import {
  getDormRoomLength,
  getDormScheduleAliases,
  parseDormRoom,
} from "./dorm-schedule.ts";

describe("dorm schedule matching", () => {
  test("matches a three-digit room in building 1", () => {
    const room = parseDormRoom("1", "105");

    expect(room).toEqual({
      building: "1",
      room: "105",
      floor: 1,
      canonicalRoom: "1-105",
    });
    expect(getDormScheduleAliases(room!)).toEqual([
      "cleaning-1-building",
      "linen-change-1-building",
    ]);
  });

  test("reads a two-digit floor from a four-digit room", () => {
    const room = parseDormRoom("7", "1204");

    expect(room?.floor).toBe(12);
    expect(getDormScheduleAliases(room!)).toEqual([
      "cleaning-7-building-8-13-floors",
      "linen-change-7-building",
    ]);
  });

  test("selects building 3 linen schedule by floor", () => {
    expect(getDormScheduleAliases(parseDormRoom("3", "205")!)).toContain(
      "linen-change-3-building-university",
    );
    expect(getDormScheduleAliases(parseDormRoom("3", "405")!)).toContain(
      "linen-change-3-building-college",
    );
  });

  test("rejects room lengths unsupported by the building", () => {
    expect(parseDormRoom("5", "1304")).toBeNull();
    expect(parseDormRoom("7", "13")).toBeNull();
    expect(parseDormRoom("7", "110")).toBeNull();
    expect(parseDormRoom("7", "100")).toBeNull();
    expect(parseDormRoom("7", "1404")).toBeNull();
    expect(parseDormRoom("3", "505")).toBeNull();
  });

  test("determines room length from building 6-7 prefixes", () => {
    expect(getDormRoomLength("7", "2")).toBe(3);
    expect(getDormRoomLength("7", "9")).toBe(3);
    expect(getDormRoomLength("7", "11")).toBe(4);
    expect(getDormRoomLength("7", "12")).toBe(4);
    expect(getDormRoomLength("7", "13")).toBe(4);
    expect(getDormRoomLength("7", "100")).toBe(4);
    expect(getDormRoomLength("7", "10")).toBe(4);
    expect(getDormRoomLength("7", "101")).toBe(3);
    expect(getDormRoomLength("7", "109")).toBe(3);
  });
});
