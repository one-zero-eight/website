import type { AskMessage } from "./ask-session";
import { describe, expect, it } from "vitest";
import {
  SEARCH_COMMANDS,
  conversationTexts,
  completionFor,
  nextWord,
} from "./ask-suggestions";

const rules = ["What are the rules?"];

describe("completionFor", () => {
  it("completes case-insensitively keeping the typed casing", () => {
    expect(completionFor("What are", rules)).toBe(" the rules?");
    expect(completionFor("what ARE", rules)).toBe(" the rules?");
  });
  it("needs three characters except for commands", () => {
    expect(completionFor("Wh", rules)).toBe("");
    expect(completionFor("/", SEARCH_COMMANDS)).toBe("search ");
    expect(completionFor("/п", SEARCH_COMMANDS)).toBe("оиск ");
  });
  it("ignores multi-line text and full matches", () => {
    expect(completionFor("What are\nthe", rules)).toBe("");
    expect(completionFor("What are the rules?", rules)).toBe("");
  });
});

describe("completionFor from the text of the chat", () => {
  const answer = ["Включите **Moodle sync**, чтобы курсы появились в поиске."];
  it("continues the typed word with the words that follow it", () => {
    expect(completionFor("что такое M", [], answer)).toBe("oodle sync");
    expect(completionFor("что такое moo", [], answer)).toBe("dle sync");
  });
  it("matches several typed words", () => {
    expect(
      completionFor("включите moodle s", [], ["Включите Moodle sync"]),
    ).toBe("ync");
  });
  it("suggests the following words after a finished word", () => {
    expect(completionFor("что такое Moodle", [], answer)).toBe(" sync");
  });
  it("prefers the first text, which is the newest", () => {
    expect(completionFor("open M", [], ["Moodle sync", "Maps page"])).toBe(
      "oodle sync",
    );
  });
  it("does not complete in the middle of a word or after a space", () => {
    expect(completionFor("что такое oodle", [], answer)).toBe("");
    expect(completionFor("что такое ", [], answer)).toBe("");
  });
  it("does not complete commands from the chat", () => {
    expect(completionFor("/xyz", [], answer)).toBe("");
  });
});

describe("conversationTexts", () => {
  it("lists answers, search results with their previews, and questions, newest first", () => {
    const texts = conversationTexts([
      { role: "user", content: "first" },
      {
        role: "assistant",
        response: {
          answer: "See [rules](http://x) **now**",
          sources: [{ title: "Rules of study" }],
        },
      },
      {
        role: "search",
        query: "retake",
        results: [
          {
            source: {
              display_name: "Exam retake policy",
              preview_text: "Retakes happen in August",
            },
          },
          { source: { display_name: "Moodle file" } },
        ],
      },
    ] as unknown as AskMessage[]);
    expect(texts).toEqual([
      "Exam retake policy",
      "Retakes happen in August",
      "Moodle file",
      "retake",
      "See rules now",
      "Rules of study",
      "first",
    ]);
    expect(completionFor("when are retak", [], texts)).toBe("e policy");
    expect(completionFor("they happen in Au", [], texts)).toBe("gust");
  });
});

describe("nextWord", () => {
  it("returns the first word with its leading spaces", () => {
    expect(nextWord(" the rules?")).toBe(" the");
    expect(nextWord("rules")).toBe("rules");
  });
});
