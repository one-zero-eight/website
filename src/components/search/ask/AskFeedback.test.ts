import type { searchTypes } from "@/api/search";
import { AskResponsesFeedbackAnyOf0 } from "@/api/search/types";
import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AskResult } from "./AskResult";

const api = vi.hoisted(() => ({
  mutate: vi.fn(),
  mutation: vi.fn(),
  rememberFeedback: vi.fn(),
  showSuccess: vi.fn(),
  showError: vi.fn(),
}));

vi.mock("@/api/search", () => ({
  $search: {
    useMutation: (...args: unknown[]) => {
      api.mutation(...args);
      const options = args[2] as {
        onSuccess: (data: unknown, variables: unknown) => void;
      };
      return {
        mutate: (variables: unknown) => {
          api.mutate(variables);
          options.onSuccess(undefined, variables);
        },
        isPending: false,
      };
    },
  },
}));
vi.mock("@/components/toast", () => ({
  useToast: () => ({
    showSuccess: api.showSuccess,
    showError: api.showError,
  }),
}));
vi.mock("./ask-session", () => ({
  decideApproval: vi.fn(),
  rememberFeedback: api.rememberFeedback,
}));

const response: searchTypes.SchemaAskResponses = {
  query: "Summarize this file",
  answer: "The attachment describes the project.",
  sources: [],
  attachments: [
    {
      id: "attachment-1",
      filename: "project.pdf",
      media_type: "application/pdf",
      size_bytes: 1234,
      pages: 2,
    },
  ],
  calendar_events: [],
  signup_offers: [],
  messages: [],
  ask_query_id: "ask-query-attachment-1",
};

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

function render(responseData: searchTypes.SchemaAskResponses = response) {
  const i18n = setupI18n({ locale: "en", messages: { en: {} } });
  act(() => {
    root.render(
      createElement(
        I18nProvider,
        { i18n },
        createElement(AskResult, { response: responseData }),
      ),
    );
  });
}

it("shows both feedback controls for an attachment answer with an ask query ID and submits its comment", () => {
  render();

  expect(container.textContent).toContain(
    "The attachment describes the project.",
  );
  expect(response.attachments).toEqual([
    expect.objectContaining({ filename: "project.pdf" }),
  ]);
  const voteButtons = [...container.querySelectorAll("button")];
  expect(voteButtons.map((button) => button.textContent)).toEqual(["👍", "👎"]);

  act(() => voteButtons[0].click());
  expect(api.mutation).toHaveBeenCalledWith(
    "post",
    "/ask/{ask_query_id}/feedback",
    expect.any(Object),
  );
  expect(api.mutate).toHaveBeenLastCalledWith({
    params: {
      path: { ask_query_id: "ask-query-attachment-1" },
      query: { feedback: "like" },
    },
  });

  const comment = container.querySelector<HTMLTextAreaElement>("textarea")!;
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )!.set!;
    setter.call(comment, "  Clear and useful  ");
    comment.dispatchEvent(new Event("input", { bubbles: true }));
  });
  const send = [...container.querySelectorAll("button")].find(
    (button) => button.textContent === "Send",
  )!;
  expect(send.disabled).toBe(false);
  act(() => send.click());

  expect(api.mutate).toHaveBeenLastCalledWith({
    params: {
      path: { ask_query_id: "ask-query-attachment-1" },
      query: { feedback: "like" },
    },
    body: { comment: "Clear and useful" },
  });
  expect(api.rememberFeedback).toHaveBeenLastCalledWith(
    "ask-query-attachment-1",
    "like",
    "Clear and useful",
  );
  expect(container.querySelector("textarea")).toBeNull();
});

it("renders feedback retained in answer history without reopening the comment form", () => {
  render({
    ...response,
    feedback: AskResponsesFeedbackAnyOf0.dislike,
    feedback_comment: "The summary missed a key detail.",
  });

  expect(container.textContent).toContain("Rating: 👎");
  expect(container.querySelector("textarea")).toBeNull();
  expect(container.querySelector("button")).toBeNull();
});
