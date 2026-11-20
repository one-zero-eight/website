import { describe, expect, it } from "vitest";
import { parseSearchCommand } from "./ask-search";

describe("parseSearchCommand", () => {
  it("takes the query after /search and /поиск in any case", () => {
    expect(parseSearchCommand("/search exam retake")).toBe("exam retake");
    expect(parseSearchCommand("  /ПОИСК   пересдача\nэкзамена ")).toBe(
      "пересдача\nэкзамена",
    );
  });

  it("gives an empty query for the bare command", () => {
    expect(parseSearchCommand("/search")).toBe("");
    expect(parseSearchCommand("/поиск  ")).toBe("");
  });

  it("leaves other messages to the assistant", () => {
    expect(parseSearchCommand("/searching rooms")).toBeNull();
    expect(parseSearchCommand("please /search rooms")).toBeNull();
    expect(parseSearchCommand("find a room")).toBeNull();
  });
});
