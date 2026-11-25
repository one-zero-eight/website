import { AnswerSourceKind } from "@/api/search/types";
import type { searchTypes } from "@/api/search";
import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AskAnswerBody } from "./AskAnswerBody";
import { AskResult } from "./AskResult";
import { decideApproval } from "./ask-session";

vi.mock("./ask-session", () => ({
  decideApproval: vi.fn(),
  rememberFeedback: vi.fn(),
}));

const response: searchTypes.SchemaAskResponses = {
  query: "подбери тренировку",
  answer:
    "На **9 ноября** подходит вечерняя тренировка:\n\n- **Воллейбол**, 20:00–22:30, [SC] Big Hall (15 мест свободно)\n\nЗаписать вас на неё?",
  sources: [],
  attachments: [],
  calendar_events: [],
  signup_offers: [],
  messages: [],
  approval: {
    id: "cp-paused",
    actions: [
      {
        name: "call_api_tool",
        target: "sport_sport_checkin",
        args: { training_id: 46767 },
        fields: [],
      },
    ],
  },
};

describe("AskResult approval", () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  function render(props: Partial<Parameters<typeof AskResult>[0]> = {}) {
    const i18n = setupI18n({ locale: "en", messages: { en: {} } });
    act(() => {
      root.render(
        createElement(
          I18nProvider,
          { i18n },
          createElement(AskResult, { response, isLast: true, ...props }),
        ),
      );
    });
  }

  const checkin = "Check you in to training #46767";

  const calendarApproval: searchTypes.SchemaAskApproval = {
    id: "cp-calendar",
    actions: [
      {
        name: "add_to_ai_calendar",
        target: "add_to_ai_calendar",
        args: { title: "Chess club", day: "2026-11-09", all_day: true },
        fields: [
          { name: "title", kind: "text", value: "Chess club", required: true },
          { name: "day", kind: "date", value: "2026-11-09", required: true },
        ],
      },
    ],
  };

  function type(input: HTMLInputElement, value: string) {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;
    act(() => {
      setter.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  it("shows the answer, then the site's own text of the action before the buttons", () => {
    render();

    expect(container.querySelector("strong")?.textContent).toBe("9 ноября");
    expect(container.textContent).toContain(checkin);
    expect(container.textContent!.indexOf("Записать вас на неё?")).toBeLessThan(
      container.textContent!.indexOf("The assistant needs your approval"),
    );
    expect(container.textContent!.indexOf(checkin)).toBeGreaterThan(
      container.textContent!.indexOf("The assistant needs your approval"),
    );
    expect(container.querySelector("input, textarea")).toBeNull();
    const buttons = Array.from(container.querySelectorAll("button"));
    expect(buttons.map((button) => button.textContent)).toEqual([
      "Confirm",
      "Decline",
    ]);
    expect(decideApproval).not.toHaveBeenCalled();
    act(() => buttons[0].click());
    expect(decideApproval).toHaveBeenCalledExactlyOnceWith("approve", []);
  });

  it("shows the exact arguments the user cannot change", () => {
    render({
      response: {
        ...response,
        approval: {
          id: "cp-when2meet",
          actions: [
            {
              name: "call_api_tool",
              target: "when2meet_create_meeting",
              args: {
                timezone: "Europe/Moscow",
                specific_time: true,
                slots: ["2026-11-09T10:00", "2026-11-09T11:00"],
              },
              fields: [],
            },
          ],
        },
      },
    });

    expect(container.textContent).toContain("Create a When2Meet poll");
    expect(container.textContent).toContain("Time zone:Europe/Moscow");
    expect(container.textContent).toContain("Mode:times");
    expect(container.textContent).toContain(
      "Slots:2026-11-09T10:00, 2026-11-09T11:00",
    );
  });

  it("names an unknown operation by its target", () => {
    render({
      response: {
        ...response,
        approval: {
          id: "cp-unknown",
          actions: [
            { name: "call_api_tool", target: "new_tool", args: {}, fields: [] },
          ],
        },
      },
    });

    expect(container.textContent).toContain("Run new_tool");
  });

  it("keeps the action visible while the decision is pending", () => {
    render({ isPending: true });

    expect(container.textContent).toContain(checkin);
    expect(container.querySelector(".loading-spinner")).not.toBeNull();
    expect(container.querySelector("button")).toBeNull();
  });

  it("keeps the action on an obsolete approval without buttons or editable fields", () => {
    render({ isLast: false });

    expect(container.textContent).toContain(checkin);
    expect(container.textContent).toContain(
      "Not done: a newer question was asked.",
    );
    expect(container.querySelector("button")).toBeNull();
  });

  it("locks the fields of an obsolete approval", () => {
    render({
      isLast: false,
      response: { ...response, approval: calendarApproval },
    });

    const inputs = Array.from(container.querySelectorAll("input"));
    expect(inputs).toHaveLength(2);
    expect(inputs.every((input) => input.disabled)).toBe(true);
  });

  it("can decline without losing the action", () => {
    render();

    act(() => container.querySelectorAll("button")[1].click());
    expect(decideApproval).toHaveBeenCalledExactlyOnceWith("reject");
    expect(container.textContent).toContain(checkin);
  });

  it("renders an approval even when there is no answer text", () => {
    render({ response: { ...response, answer: "" } });

    expect(container.textContent).toContain(checkin);
    expect(container.querySelectorAll("button")).toHaveLength(2);
  });

  it("sends only the fields the user changed when confirming", () => {
    render({ response: { ...response, approval: calendarApproval } });

    const title = container.querySelector<HTMLInputElement>(
      'input[aria-label="Title"]',
    )!;
    expect(title.value).toBe("Chess club");
    type(title, "Chess tournament");
    const day = container.querySelector<HTMLInputElement>(
      'input[aria-label="Date"]',
    )!;
    type(day, "2026-11-10");
    type(day, "2026-11-09");

    act(() => container.querySelectorAll("button")[0].click());
    expect(decideApproval).toHaveBeenCalledExactlyOnceWith("approve", [
      { index: 0, values: { title: "Chess tournament" } },
    ]);
  });

  it("does not send an edit that was typed back to the proposed value", () => {
    render({ response: { ...response, approval: calendarApproval } });

    const title = container.querySelector<HTMLInputElement>(
      'input[aria-label="Title"]',
    )!;
    type(title, "Other");
    type(title, "Chess club");

    act(() => container.querySelectorAll("button")[0].click());
    expect(decideApproval).toHaveBeenCalledExactlyOnceWith("approve", []);
  });

  it("renders ordinary answers without approval controls", () => {
    render({ response: { ...response, approval: null } });

    expect(container.textContent).toContain("Воллейбол");
    expect(container.querySelector("button")).toBeNull();
    expect(container.textContent).not.toContain(
      "The assistant needs your approval",
    );
  });

  it("renders a saved answer from before structured sources without losing its text", () => {
    const { sources: omitted, ...savedResponse } = response;
    void omitted;
    render({ response: savedResponse as searchTypes.SchemaAskResponses });

    expect(container.textContent).toContain("Воллейбол");
    expect(container.querySelector("strong")?.textContent).toBe("9 ноября");
    expect(container.querySelectorAll("button")).toHaveLength(2);
    expect(container.querySelector("ol")).toBeNull();
  });

  it("maps citation numbers to structured sources without renumbering or merging URLs", () => {
    render({
      response: {
        ...response,
        approval: null,
        answer:
          "Rule [7], [7, 12], unknown [99]. `Code [7]`. [Existing [7]](https://example.org/existing). [Original **document**](https://example.org/original)",
        sources: [
          {
            number: 7,
            title: "Exam rules",
            url: "https://example.org/rules",
            kind: AnswerSourceKind.official_document,
            clauses: ["2.1", "3"],
            sections: ["Retakes"],
            based_on: [
              { title: "University policy", url: "https://example.org/policy" },
            ],
            official: true,
          },
          {
            number: 12,
            title: "Announcement",
            url: "https://example.org/rules",
            kind: AnswerSourceKind.chat,
            clauses: [],
            sections: [],
            based_on: [],
            official: false,
            date: "2026-11-09T10:00:00Z",
            author: "Alice",
            author_url: "https://example.org/alice",
          },
        ],
      },
    });
    const cards = Array.from(container.querySelectorAll("ol > li"));
    expect(cards).toHaveLength(2);
    expect(cards[0].getAttribute("value")).toBe("7");
    expect(cards[0].textContent).toContain("[7] Exam rules");
    expect(cards[0].textContent).toContain("Official document");
    expect(cards[0].textContent).toContain("Clauses: 2.1, 3");
    expect(cards[0].textContent).toContain("Sections: Retakes");
    expect(cards[0].textContent).toContain("Based on: University policy");
    expect(
      Array.from(cards[0].querySelectorAll("a")).map((a) => a.href),
    ).toEqual(["https://example.org/rules", "https://example.org/policy"]);
    expect(cards[0].querySelector("button")).toBeNull();
    // A chat message the answer carries no text of stays a link
    expect(cards[1].querySelector("a")?.href).toBe("https://example.org/rules");
    expect(cards[1].querySelector("button")).toBeNull();
    expect(cards[1].textContent).toContain("[12] Announcement");
    expect(cards[1].textContent).toContain("Chat");
    expect(cards[1].querySelector("time")?.dateTime).toBe(
      "2026-11-09T10:00:00Z",
    );
    expect(
      cards[1].querySelector('a[href="https://example.org/alice"]')
        ?.textContent,
    ).toBe("Alice");
    const markdownLink = container.querySelector(
      'p a[href="https://example.org/original"]',
    );
    expect(markdownLink?.textContent).toBe("Original document");
    expect(markdownLink?.querySelector("strong")?.textContent).toBe("document");
    const citationLinks = Array.from(
      container.querySelectorAll<HTMLAnchorElement>('p a[href^="#"]'),
    );
    expect(citationLinks.map((link) => link.textContent)).toEqual([
      "[7]",
      "[7]",
      "[12]",
    ]);
    expect(
      citationLinks.map((link) =>
        document.getElementById(decodeURIComponent(link.hash.slice(1))),
      ),
    ).toEqual([cards[0], cards[0], cards[1]]);
    expect(citationLinks.every((link) => !link.target)).toBe(true);
    expect(container.querySelector("code")?.textContent).toBe("Code [7]");
    expect(
      container.querySelector('a[href="https://example.org/existing"]')
        ?.textContent,
    ).toBe("Existing [7]");
    expect(container.textContent).toContain("unknown [99]");
  });

  it("renders sources and provenance without URLs as text and keeps unsafe links noninteractive", () => {
    render({
      response: {
        ...response,
        approval: null,
        answer: "[unsafe](javascript:alert%281%29)",
        sources: [
          {
            number: 3,
            title: "Internal guide",
            url: null,
            kind: AnswerSourceKind.guide,
            clauses: [],
            sections: [],
            official: false,
            based_on: [
              { title: "Unlinked policy", url: null },
              { title: "Unsafe policy", url: "javascript:alert(1)" },
            ],
          },
        ],
      },
    });
    expect(container.textContent).toContain("unsafe");
    expect(container.textContent).toContain("[3] Internal guide");
    expect(container.textContent).toContain("Guide");
    expect(container.textContent).toContain(
      "Based on: Unlinked policy, Unsafe policy",
    );
    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector("button")).toBeNull();
  });

  it.each(["plain", "inline code", "list"])(
    "keeps a long ID intact in %s answers",
    (format) => {
      const id = "AAMkADAx".repeat(100);
      const answer =
        format === "inline code"
          ? `Booking: \`${id}\``
          : format === "list"
            ? `- Booking: \`${id}\``
            : `Booking: ${id}`;
      render({ response: { ...response, answer, approval: null } });

      expect(container.textContent).toContain(id);
    },
  );

  it("keeps preformatted code scrollable inside the answer", () => {
    const code = "AAMkADAx".repeat(100);
    render({
      response: {
        ...response,
        answer: `\`\`\`\n${code}\n\`\`\``,
        approval: null,
      },
    });

    const pre = container.querySelector("pre")!;
    expect(pre.textContent).toBe(`${code}\n`);
  });

  it("does not show the explanation or approval controls on an error", () => {
    render({ hasError: true });

    expect(container.textContent).toContain(
      "Sorry, I can't help you with this question.",
    );
    expect(container.textContent).not.toContain("Воллейбол");
    expect(container.querySelector("button")).toBeNull();
  });

  it("shows answer pictures without referrer and a source's pictures as thumbnails", () => {
    render({
      response: {
        ...response,
        approval: null,
        answer:
          "Журнал [1].\n\n![Log](https://innohassle.ru/music-room-log.webp)",
        sources: [
          {
            number: 1,
            title: "Music room",
            url: "https://innohassle.ru/music-room",
            kind: AnswerSourceKind.website,
            clauses: [],
            sections: [],
            based_on: [],
            official: false,
            images: [
              {
                url: "https://innohassle.ru/music-room-intro.webp",
                alt: "Music room",
              },
            ],
          },
        ],
      },
    });
    const images = Array.from(container.querySelectorAll("img"));
    expect(images.map((img) => img.getAttribute("src"))).toEqual([
      "https://innohassle.ru/music-room-log.webp",
      "https://innohassle.ru/music-room-intro.webp",
    ]);
    for (const img of images) {
      expect(img.getAttribute("referrerpolicy")).toBe("no-referrer");
      expect(img.getAttribute("loading")).toBe("lazy");
    }
    expect(container.querySelector("ol li img")).toBe(images[1]);
    act(() => {
      images[0].dispatchEvent(new Event("error"));
    });
    expect(container.querySelectorAll("img")).toHaveLength(1);
  });

  it("shows no pictures of an answer that is still streaming", () => {
    act(() => {
      root.render(
        createElement(AskAnswerBody, {
          text: "![Log](https://innohassle.ru/music-room-log.webp)",
          showImages: false,
        }),
      );
    });
    expect(container.querySelector("img")).toBeNull();
  });
});
