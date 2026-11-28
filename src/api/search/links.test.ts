import { expect, it } from "vitest";
import { getAiCalendarExportLink } from "./links";

it("builds an AI Calendar export URL under the search API base prefix", () => {
  expect(
    getAiCalendarExportLink("a+b/c==", "https://search.example/prefix/search/"),
  ).toBe(
    "https://search.example/prefix/search/users/calendar-export.ics?access_key=a%2Bb%2Fc%3D%3D",
  );
});
