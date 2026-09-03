import { UserRole } from "@/api/clubs/types.ts";
import { describe, expect, it } from "vitest";
import { canUserEditClub, isClubOwner } from "./permissions.ts";

describe("canUserEditClub", () => {
  it("allows an admin", () => {
    expect(
      canUserEditClub({ role: UserRole.admin, leader_in_clubs: [] }, "club-1"),
    ).toBe(true);
  });

  it("allows the leader of the current club", () => {
    expect(
      canUserEditClub(
        {
          role: UserRole.default,
          leader_in_clubs: [{ id: "club-1" }],
        },
        "club-1",
      ),
    ).toBe(true);
  });

  it("rejects the leader of another club", () => {
    expect(
      canUserEditClub(
        {
          role: UserRole.default,
          leader_in_clubs: [{ id: "club-2" }],
        },
        "club-1",
      ),
    ).toBe(false);
  });

  it("rejects a missing user or club", () => {
    expect(canUserEditClub(undefined, "club-1")).toBe(false);
    expect(
      canUserEditClub(
        { role: UserRole.default, leader_in_clubs: [] },
        undefined,
      ),
    ).toBe(false);
  });
});

describe("isClubOwner", () => {
  it("rejects an admin who isn't the leader", () => {
    expect(isClubOwner({ leader_in_clubs: [] }, "club-1")).toBe(false);
  });

  it("allows the leader of the current club", () => {
    expect(isClubOwner({ leader_in_clubs: [{ id: "club-1" }] }, "club-1")).toBe(
      true,
    );
  });

  it("rejects the leader of another club", () => {
    expect(isClubOwner({ leader_in_clubs: [{ id: "club-2" }] }, "club-1")).toBe(
      false,
    );
  });

  it("rejects a missing user or club", () => {
    expect(isClubOwner(undefined, "club-1")).toBe(false);
    expect(isClubOwner({ leader_in_clubs: [] }, undefined)).toBe(false);
  });
});
