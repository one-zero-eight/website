import type { searchTypes } from "@/api/search";
import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  search_responses: [],
  attachments: [],
  calendar_events: [],
  signup_offers: [],
  messages: [],
  approval: {
    id: "cp-paused",
    actions: [
      {
        name: "call_api_tool",
        description: "Записать вас на тренировку #46767.",
      },
    ],
  },
};

describe("AskResult approval context", () => {
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

  it("shows the formatted explanation before the approval buttons", () => {
    render();

    expect(container.textContent).toContain("9 ноября");
    expect(container.querySelector("strong")?.textContent).toBe("9 ноября");
    expect(container.textContent).toContain(
      "Воллейбол, 20:00–22:30, [SC] Big Hall (15 мест свободно)",
    );
    expect(container.textContent).toContain(
      "Записать вас на тренировку #46767.",
    );
    expect(container.textContent!.indexOf("Записать вас на неё?")).toBeLessThan(
      container.textContent!.indexOf("The assistant needs your approval"),
    );
    const buttons = Array.from(container.querySelectorAll("button"));
    expect(buttons.map((button) => button.textContent)).toEqual([
      "Confirm",
      "Decline",
    ]);
    expect(decideApproval).not.toHaveBeenCalled();
    act(() => buttons[0].click());
    expect(decideApproval).toHaveBeenCalledExactlyOnceWith("approve");
  });

  it("keeps the explanation visible while the decision is pending", () => {
    render({ isPending: true });

    expect(container.textContent).toContain("Воллейбол");
    expect(container.querySelector(".loading-spinner")).not.toBeNull();
    expect(container.querySelector("button")).toBeNull();
  });

  it("keeps the explanation on an obsolete approval without action buttons", () => {
    render({ isLast: false });

    expect(container.textContent).toContain("Воллейбол");
    expect(container.textContent).toContain(
      "Not done: a newer question was asked.",
    );
    expect(container.querySelector("button")).toBeNull();
  });

  it("can decline without losing the explanation", () => {
    render();

    act(() => container.querySelectorAll("button")[1].click());
    expect(decideApproval).toHaveBeenCalledExactlyOnceWith("reject");
    expect(container.textContent).toContain("Воллейбол");
  });

  it("renders an approval even when there is no explanation", () => {
    render({ response: { ...response, answer: "" } });

    expect(container.textContent).toContain(
      "Записать вас на тренировку #46767.",
    );
    expect(container.querySelectorAll("button")).toHaveLength(2);
  });

  it("renders ordinary answers without approval controls", () => {
    render({ response: { ...response, approval: null } });

    expect(container.textContent).toContain("Воллейбол");
    expect(container.querySelector("button")).toBeNull();
    expect(container.textContent).not.toContain(
      "The assistant needs your approval",
    );
  });

  it("does not show the explanation or approval controls on an error", () => {
    render({ hasError: true });

    expect(container.textContent).toContain(
      "Sorry, I can't help you with this question.",
    );
    expect(container.textContent).not.toContain("Воллейбол");
    expect(container.querySelector("button")).toBeNull();
  });
});
