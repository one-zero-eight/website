import { describe, expect, it } from "vitest";
import { asQuote, splitQuote } from "./ask-quote";

describe("asQuote", () => {
  it("prefixes every line and keeps paragraph breaks", () => {
    expect(asQuote("  one\ntwo\n\n\n\nthree ")).toBe(
      "> one\n> two\n>\n> three",
    );
  });
  it("is empty for blank text", () => {
    expect(asQuote(" \n ")).toBe("");
  });
});

describe("splitQuote", () => {
  it("returns the quote and the question of a message", () => {
    const message = `${asQuote("one\n\ntwo")}\n\nwhat is it?`;
    expect(splitQuote(message)).toEqual({
      quote: "one\n\ntwo",
      rest: "what is it?",
    });
  });
  it("leaves a message without a leading quote alone", () => {
    expect(splitQuote("what is it?\n> not a quote")).toEqual({
      quote: "",
      rest: "what is it?\n> not a quote",
    });
  });
});
