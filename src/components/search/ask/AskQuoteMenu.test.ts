import { describe, expect, it } from "vitest";
import { asQuote } from "./AskQuoteMenu";

describe("asQuote", () => {
  it("prefixes every line and keeps paragraph breaks", () => {
    expect(asQuote("  one\ntwo\n\n\n\nthree ")).toBe(
      "> one\n> two\n>\n> three",
    );
  });
  it("is empty for blank selections", () => {
    expect(asQuote(" \n ")).toBe("");
  });
});
