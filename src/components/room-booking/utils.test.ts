import { describe, expect, it } from "vitest";
import { getRoomTitle } from "./utils";

const room = {
  title: "Meeting room",
  ru_title: "Переговорная",
};

describe("getRoomTitle", () => {
  it("uses the Russian title for Russian", () => {
    expect(getRoomTitle(room, "ru")).toBe("Переговорная");
  });

  it.each(["en", "pseudo-LOCALE"])(
    "uses the English title for %s",
    (locale) => {
      expect(getRoomTitle(room, locale)).toBe("Meeting room");
    },
  );
});
